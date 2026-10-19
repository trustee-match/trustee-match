"use server";

import { extractRole, type ExtractedRole } from "@/lib/ai/extract-role";
import { findOrCreateAuthUser, upsertProfileWithoutDowngrading } from "@/lib/auth/shadow-user";
import { CANDIDATE_SELECT, CARD_SELECT, ROLE_SELECT, toCandidate, toCard, toRole, type CandidateRow, type CardRow, type RoleRow } from "@/lib/db/mappers";
import { clearInterest, getCandidateContact, recordInterest, type Contact } from "@/lib/jobs/interest";
import { triggerMatch } from "@/lib/jobs/trigger";
import { diagnoseNoMatchForRole, type NoMatchDiagnosis } from "@/lib/matching/no-match-feedback";
import type { BoardSkillCell, Candidate, Card, Role } from "@/lib/matching/types";
import { createAdminClient } from "@/lib/supabase/admin";

// AI import for the charity side, mirroring src/app/join/actions.ts's extractFromPdf/
// Docx/Text — AGC feedback (planning/feedback/agc1.md, Wayne): "liked the button on the
// trustee profile to draw from LinkedIn or upload a cv, but couldn't see a facility for
// us?" See planning/feedback/agc1-response-draft.md, issue A.

export type ExtractRoleResult = { ok: true; role: ExtractedRole } | { ok: false; error: string };

export async function extractRoleFromText(text: string): Promise<ExtractRoleResult> {
  if (!text.trim()) return { ok: false, error: "Paste a role description first." };
  const role = await extractRole({ kind: "text", text });
  if (!role) {
    return {
      ok: false,
      error:
        "AI extraction returned nothing — most likely ANTHROPIC_API_KEY isn't set in .env.local (or the dev server hasn't been restarted since it was added), or Claude declined to process this text.",
    };
  }
  return { ok: true, role };
}

export async function extractRoleFromPdf(base64: string): Promise<ExtractRoleResult> {
  if (!base64.trim()) return { ok: false, error: "Choose a PDF file first." };
  const role = await extractRole({ kind: "pdf", base64 });
  if (!role) {
    return {
      ok: false,
      error:
        "AI extraction returned nothing — most likely ANTHROPIC_API_KEY isn't set in .env.local (or the dev server hasn't been restarted since it was added), or Claude declined to process this file.",
    };
  }
  return { ok: true, role };
}

export async function extractRoleFromDocx(base64: string): Promise<ExtractRoleResult> {
  if (!base64.trim()) return { ok: false, error: "Choose a .docx file first." };
  try {
    const role = await extractRole({ kind: "docx", base64 });
    if (!role) {
      return {
        ok: false,
        error:
          "AI extraction returned nothing — most likely ANTHROPIC_API_KEY isn't set in .env.local (or the dev server hasn't been restarted since it was added), or Claude declined to process this file.",
      };
    }
    return { ok: true, role };
  } catch {
    return { ok: false, error: "Couldn't read that file — make sure it's a .docx (not .doc, which isn't supported), and not password-protected." };
  }
}

// Internal test-harness actions for the pilot charity side, mirroring src/app/join/actions.ts.
// Organisations need no auth user (unlike candidates) — they're a plain table, so this is
// simpler than the candidate side. Still not real sign-in: anyone who can reach this can
// publish a role under any organisation name. Same scope and same caveat as the candidate
// side (see planning/responsible-design-decisions.md, Security) — fine behind the
// site-wide preview gate, not fine for real charities.

export interface RoleInput {
  orgName: string;
  contactName: string;
  contactEmail: string;
  title: string;
  cause: string;
  purpose: string;
  hoursPerMonth: number;
  meetingPattern: string;
  induction: string;
  mustHaveSkills: string[];
  missingSkills: string[];
  thinSkills: string[];
  diversityPreference: string | null;
  /** Deep-link back to the role's volunteer.gg listing, if it has one — credited on the
   *  public role card (src/components/cards.tsx). planning/feedback/agc1-response-draft.md,
   *  issue B. */
  volunteerGgUrl: string | null;
}

export type PublishResult = { ok: true; roleId: string } | { ok: false; error: string };

async function findOrCreateOrg(db: ReturnType<typeof createAdminClient>, name: string): Promise<string> {
  const trimmed = name.trim();
  const { data: existing } = await db.from("organisations").select("id").ilike("name", trimmed).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await db.from("organisations").insert({ name: trimmed, verified: false }).select("id").single();
  if (error) throw new Error(`organisation insert failed: ${error.message}`);
  return created.id;
}

/** Links the person publishing a role to their organisation as a real, named contact —
 *  whoever a matched candidate sees via getCharityContact (lib/jobs/interest.ts), replacing
 *  the no-contact gap that existed before any org_members row was ever created. Idempotent:
 *  re-publishing another role for the same org and email just confirms the existing link. */
async function linkOrgContact(db: ReturnType<typeof createAdminClient>, organisationId: string, email: string, name: string): Promise<void> {
  const userId = await findOrCreateAuthUser(db, email, name);
  await upsertProfileWithoutDowngrading(db, userId, "board_contact", name);
  const { error } = await db.from("org_members").upsert({ organisation_id: organisationId, user_id: userId }, { onConflict: "organisation_id,user_id", ignoreDuplicates: true });
  if (error) throw new Error(`org_members upsert failed: ${error.message}`);
}

export async function publishRoleAndMatch(input: RoleInput): Promise<PublishResult> {
  try {
    if (!input.orgName.trim()) return { ok: false, error: "Enter your charity's name." };
    if (!input.contactName.trim()) return { ok: false, error: "Enter a contact name — yours or a colleague's. This is who we'll reveal to a matched candidate." };
    if (!input.contactEmail.trim()) return { ok: false, error: "Enter a contact email." };
    if (!input.title.trim()) return { ok: false, error: "Give the role a title." };
    if (!input.purpose.trim()) return { ok: false, error: "Add a short purpose — what does your charity do?" };
    if (input.hoursPerMonth <= 0) return { ok: false, error: "Hours per month must be more than 0." };
    if (!input.meetingPattern.trim()) return { ok: false, error: "Describe the meeting pattern." };
    if (!input.induction.trim()) return { ok: false, error: "Describe the induction you'll offer." };
    if (input.missingSkills.length === 0 && input.thinSkills.length === 0) {
      return { ok: false, error: "Mark at least one skill as missing or thin — a role with no stated gap can't be matched on skills." };
    }

    const db = createAdminClient();
    const organisationId = await findOrCreateOrg(db, input.orgName);
    await linkOrgContact(db, organisationId, input.contactEmail.trim(), input.contactName.trim());

    const boardSkills: BoardSkillCell[] = [
      ...input.missingSkills.map((skill) => ({ skill, coverage: "missing" as const })),
      ...input.thinSkills.map((skill) => ({ skill, coverage: "thin" as const })),
    ];

    const { data: role, error } = await db
      .from("roles")
      .insert({
        organisation_id: organisationId,
        title: input.title,
        purpose: input.purpose,
        cause: input.cause,
        hours_per_month: input.hoursPerMonth,
        meeting_pattern: input.meetingPattern,
        induction: input.induction,
        board_skills: boardSkills,
        must_have_skills: input.mustHaveSkills,
        diversity_preference: input.diversityPreference,
        volunteer_gg_url: input.volunteerGgUrl,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(`role insert failed: ${error.message}`);

    await triggerMatch({ type: "role", id: role.id }, "role_published");

    return { ok: true, roleId: role.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error publishing role" };
  }
}

export interface SuggestedTrustee {
  candidate: Candidate;
  card: Card;
  cardId: string;
  interest: "interested" | "pass" | null;
  matched: boolean;
  /** The candidate's real name/email, revealed once matched. Always populated when
   *  matched — unlike the charity-side contact a candidate sees, a candidate's own
   *  profile and real email always exist once they've confirmed via /join. */
  matchedContact: Contact | null;
}

export type SuggestedTrusteesResult =
  | { ok: true; role: Role; matches: SuggestedTrustee[] }
  | { ok: true; role: Role; matches: []; diagnosis: NoMatchDiagnosis }
  | { ok: false; error: string };

export async function getSuggestedTrustees(roleId: string): Promise<SuggestedTrusteesResult> {
  try {
    const db = createAdminClient();

    const { data: roleRow, error: roleErr } = await db.from("roles").select(ROLE_SELECT).eq("id", roleId).single();
    if (roleErr) throw new Error(roleErr.message);
    const role = toRole(roleRow as unknown as RoleRow);

    const { data: cardRows, error: cardsErr } = await db
      .from("cards")
      .select(CARD_SELECT)
      .eq("role_id", roleId)
      .eq("hidden", false)
      .order("score", { ascending: false });
    if (cardsErr) throw new Error(cardsErr.message);
    const cardRowsTyped = (cardRows ?? []) as unknown as CardRow[];
    const cards = cardRowsTyped.map(toCard);

    const { data: candRows, error: candErr } = await db
      .from("candidates")
      .select(CANDIDATE_SELECT)
      .not("confirmed_at", "is", null)
      .eq("paused", false)
      .eq("discoverable", true);
    if (candErr) throw new Error(candErr.message);
    const candidates = ((candRows ?? []) as unknown as CandidateRow[]).map((c) => toCandidate(c, { openInterests: 0, activeWithOrganisations: [] }));

    if (cards.length === 0) {
      const diagnosis = diagnoseNoMatchForRole(role, candidates);
      return { ok: true, role, matches: [], diagnosis };
    }

    const { data: interestRows } = await db
      .from("interests")
      .select("card_id, action, status")
      .eq("role_id", roleId)
      .eq("side", "charity")
      .neq("status", "withdrawn");
    const interestByCard = new Map((interestRows ?? []).map((i) => [i.card_id, { action: i.action as "interested" | "pass", matched: i.status === "matched" }]));

    const byCandidate = new Map(candidates.map((c) => [c.id, c]));
    const byCardId = new Map(cardRowsTyped.map((r) => [r.role_id + ":" + r.candidate_id, r.id]));
    const matches = await Promise.all(
      cards
        .map((card) => {
          const cardId = byCardId.get(card.roleId + ":" + card.candidateId)!;
          const existing = interestByCard.get(cardId);
          return {
            candidate: byCandidate.get(card.candidateId)!,
            card,
            cardId,
            interest: existing?.action ?? null,
            matched: existing?.matched ?? false,
          };
        })
        .filter((m) => m.candidate)
        .map(async (m) => ({ ...m, matchedContact: m.matched ? await getCandidateContact(db, m.candidate.id) : null })),
    );
    return { ok: true, role, matches };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error loading suggested trustees" };
  }
}

// One shared, fixed test "board contact" profile for all charity-side interest actions in
// this preview — there's no real per-charity-rep sign-in yet (see Security entry in
// planning/responsible-design-decisions.md), and `interests.acted_by` needs a real profile
// id. Not who actually expressed the interest in a real sense, just a valid FK.
async function findOrCreateCharityRep(db: ReturnType<typeof createAdminClient>): Promise<string> {
  const EMAIL = "charity-tester@test.local";
  const { data: created, error } = await db.auth.admin.createUser({ email: EMAIL, email_confirm: true });
  let userId: string;
  if (!error && created.user) {
    userId = created.user.id;
  } else {
    const { data: list, error: listError } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) throw new Error(listError.message);
    const found = list.users.find((u) => u.email === EMAIL);
    if (!found) throw new Error("Could not create or find the shared charity-tester account");
    userId = found.id;
  }
  await db.from("profiles").upsert({ id: userId, kind: "board_contact", display_name: "Charity tester" });
  return userId;
}

export type ToggleInterestResult =
  | { ok: true; interest: "interested" | "pass" | null; matched: boolean }
  | { ok: false; error: string; alreadyMatched?: boolean };

/** Sets, changes, or clears (pass `null`) the charity side's interest in one card. */
export async function toggleInterest(cardId: string, roleId: string, candidateId: string, action: "interested" | "pass" | null): Promise<ToggleInterestResult> {
  try {
    const db = createAdminClient();

    if (action === null) {
      const cleared = await clearInterest(db, cardId, "charity");
      if (!cleared.ok) return { ok: false, error: "Already introduced — can't withdraw interest after a mutual match.", alreadyMatched: true };
      return { ok: true, interest: null, matched: false };
    }

    const actedBy = await findOrCreateCharityRep(db);
    const result = await recordInterest(db, { cardId, roleId, candidateId, side: "charity", action, actedBy });
    return { ok: true, interest: result.interest, matched: result.matched };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error updating interest" };
  }
}
