"use server";

import { extractProfile, type ExtractedProfile } from "@/lib/ai/extract-profile";
import { CARD_SELECT, ROLE_SELECT, toCandidate, toCard, toRole, type CandidateRow, type CardRow, type RoleRow } from "@/lib/db/mappers";
import { triggerMatch } from "@/lib/jobs/trigger";
import { diagnoseNoMatchForCandidate, type NoMatchDiagnosis } from "@/lib/matching/no-match-feedback";
import type { Card, Role } from "@/lib/matching/types";
import { createAdminClient } from "@/lib/supabase/admin";

// Internal test-harness actions for the pilot: find or create a "shadow" auth user by
// email via the admin API rather than building real sign-in (magic link / LinkedIn)
// yet. Fine for Jon/Nick running the 14 prepared personas through the real engine;
// not how a real candidate will sign up once /join is built out properly.

export type ExtractResult = { ok: true; profile: ExtractedProfile } | { ok: false; error: string };

export async function extractFromText(cvText: string): Promise<ExtractResult> {
  if (!cvText.trim()) return { ok: false, error: "Paste some CV or personal-statement text first." };
  const profile = await extractProfile({ kind: "text", text: cvText });
  if (!profile) {
    return {
      ok: false,
      error:
        "AI extraction returned nothing — most likely ANTHROPIC_API_KEY isn't set in .env.local (or the dev server hasn't been restarted since it was added), or Claude declined to process this text.",
    };
  }
  return { ok: true, profile };
}

export interface ConfirmInput {
  name: string;
  email: string;
  headline: string;
  skills: { skill: string; level: string; evidence: string; include: boolean }[];
  causes: string[];
  hoursPerMonth: number;
  priorBoardExperience: boolean;
  readGuide: boolean;
  conflictOrgNames: string[];
}

export type ConfirmResult = { ok: true; candidateId: string } | { ok: false; error: string };

async function findOrCreateAuthUser(db: ReturnType<typeof createAdminClient>, email: string, displayName: string): Promise<string> {
  const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { display_name: displayName } });
  if (!error && created.user) return created.user.id;

  const { data: list, error: listError } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw new Error(listError.message);
  const found = list.users.find((u) => u.email === email);
  if (found) return found.id;
  throw new Error(error?.message ?? `Could not create or find a test user for ${email}`);
}

export async function confirmProfileAndMatch(input: ConfirmInput): Promise<ConfirmResult> {
  try {
    const db = createAdminClient();
    const userId = await findOrCreateAuthUser(db, input.email, input.name);

    const { error: profileErr } = await db.from("profiles").upsert({ id: userId, kind: "candidate", display_name: input.name });
    if (profileErr) throw new Error(`profiles upsert failed: ${profileErr.message}`);

    const conflictIds: string[] = [];
    for (const raw of input.conflictOrgNames) {
      const name = raw.trim();
      if (!name) continue;
      const { data: org } = await db.from("organisations").select("id").ilike("name", name).maybeSingle();
      if (org) conflictIds.push(org.id);
    }

    const { error: candidateErr } = await db.from("candidates").upsert({
      id: userId,
      headline: input.headline,
      hours_per_month: input.hoursPerMonth,
      prior_board_experience: input.priorBoardExperience,
      read_guide: input.readGuide,
      discoverable: true,
      causes: input.causes,
      cause_exclusions: [],
      conflicts: conflictIds,
      preference_tags: [],
      paused: false,
      confirmed_at: new Date().toISOString(),
      consent_profile_processing: true,
      consent_share_on_match: true,
    });
    if (candidateErr) throw new Error(`candidates upsert failed: ${candidateErr.message}`);

    await db.from("candidate_skills").delete().eq("candidate_id", userId);
    const selected = input.skills.filter((s) => s.include);
    if (selected.length) {
      const { error: skillsErr } = await db
        .from("candidate_skills")
        .insert(selected.map((s) => ({ candidate_id: userId, skill: s.skill, level: s.level, evidence: s.evidence })));
      if (skillsErr) throw new Error(`candidate_skills insert failed: ${skillsErr.message}`);
    }

    await triggerMatch({ type: "candidate", id: userId }, "profile_confirmed");

    return { ok: true, candidateId: userId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error confirming profile" };
  }
}

export type MatchesResult =
  | { ok: true; matches: { role: Role; card: Card }[] }
  | { ok: true; matches: []; diagnosis: NoMatchDiagnosis }
  | { ok: false; error: string };

export async function getMatchesForCandidate(candidateId: string): Promise<MatchesResult> {
  try {
    const db = createAdminClient();

    const { data: cardRows, error: cardsErr } = await db
      .from("cards")
      .select(CARD_SELECT)
      .eq("candidate_id", candidateId)
      .eq("hidden", false)
      .order("score", { ascending: false });
    if (cardsErr) throw new Error(cardsErr.message);

    const { data: roleRows, error: rolesErr } = await db.from("roles").select(ROLE_SELECT).eq("status", "published");
    if (rolesErr) throw new Error(rolesErr.message);
    const roles = ((roleRows ?? []) as unknown as RoleRow[]).map(toRole);

    const cards = ((cardRows ?? []) as unknown as CardRow[]).map(toCard);

    if (cards.length === 0) {
      const { data: candRow, error: candErr } = await db
        .from("candidates")
        .select("id, hours_per_month, prior_board_experience, read_guide, discoverable, causes, cause_exclusions, conflicts, preference_tags, paused, confirmed_at, candidate_skills(skill, level, evidence)")
        .eq("id", candidateId)
        .single();
      if (candErr) throw new Error(candErr.message);
      const candidate = toCandidate(candRow as unknown as CandidateRow, { openInterests: 0, activeWithOrganisations: [] });
      const diagnosis = diagnoseNoMatchForCandidate(candidate, roles);
      return { ok: true, matches: [], diagnosis };
    }

    const byId = new Map(roles.map((r) => [r.id, r]));
    const matches = cards.map((card) => ({ role: byId.get(card.roleId)!, card })).filter((m) => m.role);
    return { ok: true, matches };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error loading matches" };
  }
}
