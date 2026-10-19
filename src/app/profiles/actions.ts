"use server";

import { ROLE_SELECT, toRole, type RoleRow } from "@/lib/db/mappers";
import { createAdminClient } from "@/lib/supabase/admin";

// Demo-only lookups for /profiles' "see what was submitted" modal — not part of the real
// product. See planning/demo-scaffolding.md: this whole file, and the modal UI that
// calls it, needs to be deleted (not just hidden) when the demo scaffolding comes out.

export type CandidateSubmission =
  | { ok: true; name: string; email: string | null; headline: string | null; cvText: string | null; linkedinUrl: string | null; motivation: string | null }
  | { ok: false; error: string };

export async function getCandidateSubmission(candidateId: string): Promise<CandidateSubmission> {
  try {
    const db = createAdminClient();
    const [{ data: candRow, error }, { data: profile }, { data: user }] = await Promise.all([
      db.from("candidates").select("headline, cv_text, linkedin_url, motivation").eq("id", candidateId).single(),
      db.from("profiles").select("display_name").eq("id", candidateId).single(),
      db.auth.admin.getUserById(candidateId),
    ]);
    if (error) throw new Error(error.message);
    return {
      ok: true,
      name: profile?.display_name ?? "Unnamed candidate",
      email: user?.user?.email ?? null,
      headline: candRow?.headline ?? null,
      cvText: candRow?.cv_text ?? null,
      linkedinUrl: candRow?.linkedin_url ?? null,
      motivation: candRow?.motivation ?? null,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error loading candidate" };
  }
}

export type RoleSubmission =
  | {
      ok: true;
      orgName: string;
      title: string;
      purpose: string | null;
      hoursPerMonth: number;
      meetingPattern: string;
      induction: string;
      mustHaveSkills: string[];
      diversityPreference: string | null;
      boardSkills: { skill: string; coverage: string; note?: string }[];
      contactName: string | null;
      contactEmail: string | null;
      volunteerGgUrl: string | null;
    }
  | { ok: false; error: string };

export async function getRoleSubmission(roleId: string): Promise<RoleSubmission> {
  try {
    const db = createAdminClient();
    const { data: roleRow, error } = await db.from("roles").select(ROLE_SELECT + ", purpose").eq("id", roleId).single();
    if (error) throw new Error(error.message);
    const role = toRole(roleRow as unknown as RoleRow);

    const { data: orgMembers } = await db
      .from("org_members")
      .select("user_id")
      .eq("organisation_id", role.organisationId)
      .order("created_at", { ascending: true })
      .limit(1);
    let contactName: string | null = null;
    let contactEmail: string | null = null;
    if (orgMembers && orgMembers.length > 0) {
      const [{ data: profile }, { data: user }] = await Promise.all([
        db.from("profiles").select("display_name").eq("id", orgMembers[0].user_id).single(),
        db.auth.admin.getUserById(orgMembers[0].user_id),
      ]);
      contactName = profile?.display_name ?? null;
      contactEmail = user?.user?.email ?? null;
    }

    return {
      ok: true,
      orgName: role.organisationName,
      title: role.title,
      purpose: (roleRow as unknown as { purpose: string | null }).purpose,
      hoursPerMonth: role.hoursPerMonth,
      meetingPattern: role.meetingPattern,
      induction: role.induction,
      mustHaveSkills: role.mustHaveSkills,
      diversityPreference: role.diversityPreference,
      boardSkills: role.boardSkills,
      contactName,
      contactEmail,
      volunteerGgUrl: role.volunteerGgUrl,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error loading role" };
  }
}
