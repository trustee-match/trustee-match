import "server-only";
import { findOrCreateAuthUser, upsertProfileWithoutDowngrading } from "../auth/shadow-user";
import { PILOT_CANDIDATES } from "../seed-data/candidates";
import { PILOT_ORGS } from "../seed-data/pilot";
import { createAdminClient } from "../supabase/admin";
import { triggerMatch } from "./trigger";

// Wipes every test-data table and reseeds the 8 pilot charities/roles/contacts and the
// 14 candidate personas from src/lib/seed-data/, deterministically (no AI calls — see
// seed-data/candidates.ts for why). Shared by two call paths with different audiences
// and different gates:
//  - POST /api/admin/reset (src/app/api/admin/reset/route.ts) — secret-protected,
//    scripted/ops use (scripts/reset-db.mjs).
//  - resetDemoData server action (src/components/demo-mode/actions.ts) — no secret,
//    reachable by anyone who's already behind the site-wide password gate on Demo,
//    deliberately: the reset button is a normal part of the demo experience, not an
//    admin-only operation, gated by a double-confirmation in the UI instead of a secret.
//    See planning/responsible-design-decisions.md, Security, for why that's an
//    acceptable relaxation for Demo specifically.
//
// Destructive: every auth user and organisation in the project is deleted, which is safe
// only because nothing in either the Local or Demo project is real production data (see
// planning/demo-scaffolding.md). This must never run against a real multi-tenant
// deployment.

export interface ResetSummary {
  usersDeleted: number;
  orgsDeleted: number;
  orgsSeeded: number;
  candidatesSeeded: number;
  errors: string[];
}

export async function runFullReset(): Promise<ResetSummary> {
  const db = createAdminClient();
  const summary: ResetSummary = { usersDeleted: 0, orgsDeleted: 0, orgsSeeded: 0, candidatesSeeded: 0, errors: [] };

  // 1. Wipe. Organisations first (cascades roles → cards/interests/matches on the role
  // side) so fewer cross-table cascades are still in flight by the time user deletion
  // runs. Then every auth user (cascades profiles → candidates → candidate_skills,
  // cards/interests/matches on the candidate side, org_members). Deleting ~20 users in a
  // tight loop can transiently fail a handful of deleteUser calls even with no real FK
  // rows left referencing them (observed in testing — a GoTrue-level race, not a logic
  // bug) — retried once after the first pass before being reported as a real error.
  const { data: orgs, error: orgsErr } = await db.from("organisations").select("id");
  if (orgsErr) {
    summary.errors.push(`organisations select failed: ${orgsErr.message}`);
    return summary;
  }
  if (orgs && orgs.length > 0) {
    const { error } = await db.from("organisations").delete().in("id", orgs.map((o) => o.id));
    if (error) summary.errors.push(`organisations delete: ${error.message}`);
    else summary.orgsDeleted = orgs.length;
  }

  const { data: userList, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) {
    summary.errors.push(`listUsers failed: ${listErr.message}`);
    return summary;
  }
  let toDelete = userList.users;
  for (let attempt = 1; attempt <= 2 && toDelete.length > 0; attempt++) {
    const stillFailed: typeof toDelete = [];
    for (const u of toDelete) {
      const { error } = await db.auth.admin.deleteUser(u.id);
      if (error) stillFailed.push(u);
      else summary.usersDeleted++;
    }
    toDelete = stillFailed;
  }
  for (const u of toDelete) summary.errors.push(`deleteUser ${u.email}: failed after retry`);

  // Housekeeping tables with no FK back to users/organisations, so the cascades above
  // don't touch them.
  for (const table of ["match_jobs", "flags", "alerts"] as const) {
    const { error } = await db.from(table).delete().not("id", "is", null);
    if (error) summary.errors.push(`${table} delete: ${error.message}`);
  }
  await db.from("share_links").delete().not("token", "is", null);
  await db.from("events").delete().not("id", "is", null);

  // 2. Reseed the 8 pilot charities, their roles, and their contacts.
  for (const org of PILOT_ORGS) {
    try {
      const { data: orgRow, error: orgErr2 } = await db.from("organisations").insert({ name: org.name, verified: false }).select("id").single();
      if (orgErr2) throw new Error(`organisation insert: ${orgErr2.message}`);

      const { error: roleErr } = await db.from("roles").insert({
        organisation_id: orgRow.id,
        title: org.role.title,
        purpose: org.role.purpose,
        cause: org.role.cause,
        hours_per_month: org.role.hoursPerMonth,
        meeting_pattern: org.role.meetingPattern,
        induction: org.role.induction,
        board_skills: org.role.boardSkills,
        must_have_skills: org.role.mustHaveSkills,
        diversity_preference: org.role.diversityPreference,
        status: "published",
        published_at: new Date().toISOString(),
      });
      if (roleErr) throw new Error(`role insert: ${roleErr.message}`);

      const contactUserId = await findOrCreateAuthUser(db, org.contactEmail, org.contactName);
      await upsertProfileWithoutDowngrading(db, contactUserId, "board_contact", org.contactName);
      const { error: memberErr } = await db.from("org_members").insert({ organisation_id: orgRow.id, user_id: contactUserId });
      if (memberErr) throw new Error(`org_members insert: ${memberErr.message}`);

      summary.orgsSeeded++;
    } catch (e) {
      summary.errors.push(`${org.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3. Reseed the 14 candidate personas, then trigger real matching for each (runs the
  // actual rules + AI ranking, same as a real /join confirm — just skipping CV extraction).
  for (const c of PILOT_CANDIDATES) {
    try {
      const userId = await findOrCreateAuthUser(db, c.email, c.name);
      await upsertProfileWithoutDowngrading(db, userId, "candidate", c.name);

      const conflictIds: string[] = [];
      for (const name of c.conflictOrgNames) {
        const { data: org } = await db.from("organisations").select("id").ilike("name", name).maybeSingle();
        if (org) conflictIds.push(org.id);
      }

      const { error: candErr } = await db.from("candidates").upsert({
        id: userId,
        headline: c.headline,
        cv_text: c.cvText,
        hours_per_month: c.hoursPerMonth,
        prior_board_experience: c.priorBoardExperience,
        read_guide: c.readGuide,
        discoverable: true,
        causes: c.causes,
        cause_exclusions: [],
        conflicts: conflictIds,
        preference_tags: [],
        paused: false,
        confirmed_at: new Date().toISOString(),
        consent_profile_processing: true,
        consent_share_on_match: true,
      });
      if (candErr) throw new Error(`candidates upsert: ${candErr.message}`);

      await db.from("candidate_skills").delete().eq("candidate_id", userId);
      const { error: skillsErr } = await db.from("candidate_skills").insert(c.skills.map((s) => ({ candidate_id: userId, ...s })));
      if (skillsErr) throw new Error(`candidate_skills insert: ${skillsErr.message}`);

      await triggerMatch({ type: "candidate", id: userId }, "profile_confirmed");
      summary.candidatesSeeded++;
    } catch (e) {
      summary.errors.push(`${c.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return summary;
}
