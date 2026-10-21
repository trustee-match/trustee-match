"use server";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { extractRole, type ExtractedRole } from "@/lib/ai/extract-role";
import { isOperator } from "@/lib/auth/operator";
import { upsertProfileWithoutDowngrading } from "@/lib/auth/shadow-user";
import { CANDIDATE_SELECT, CARD_SELECT, ROLE_SELECT, toCandidate, toCard, toRole, type CandidateRow, type CardRow, type RoleRow } from "@/lib/db/mappers";
import { clearInterest, getCandidateContact, recordInterest, type Contact } from "@/lib/jobs/interest";
import { triggerMatch } from "@/lib/jobs/trigger";
import { diagnoseNoMatchForRole, type NoMatchDiagnosis } from "@/lib/matching/no-match-feedback";
import type { BoardSkillCell, Candidate, Card, Role } from "@/lib/matching/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

// Real sign-in (src/app/sign-in) replaced the admin-API shadow-contact pattern this file
// used to rely on — see planning/responsible-design-decisions.md, Security, issues
// #8/#12/#13. A charity contact's identity now always comes from their real signed-in
// session, verified against org_members before any read or write below — never from a
// client-supplied organisationId/roleId alone. createAdminClient() stays, deliberately,
// only for genuinely privileged reads the session client structurally can't do (cross-
// candidate reads for the suggested-trustees list — there's no RLS policy letting a
// charity read other people's `candidates` rows directly, by design; getCandidateContact
// needs auth.admin.* for email lookup) and for triggerMatch's engine-owned writes.

export interface RoleInput {
  orgName: string;
  contactName: string;
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

/** Finds an existing organisation by name, or creates one — reporting which, since that
 *  decides the membership check right after: a brand-new org has no one to protect, an
 *  existing one does (see requireOrgMember below). */
async function findOrCreateOrg(db: ReturnType<typeof createAdminClient>, name: string): Promise<{ organisationId: string; isNew: boolean }> {
  const trimmed = name.trim();
  const { data: existing } = await db.from("organisations").select("id").ilike("name", trimmed).maybeSingle();
  if (existing) return { organisationId: existing.id, isNew: false };
  const { data: created, error } = await db.from("organisations").insert({ name: trimmed, verified: false }).select("id").single();
  if (error) throw new Error(`organisation insert failed: ${error.message}`);
  return { organisationId: created.id, isNew: true };
}

/** Links the signed-in user to an organisation as its real, named contact — whoever a
 *  matched candidate sees via getCharityContact (lib/jobs/interest.ts). Idempotent:
 *  publishing another role for the same org just confirms the existing link. */
async function linkOrgContact(db: ReturnType<typeof createAdminClient>, organisationId: string, userId: string, displayName: string): Promise<void> {
  await upsertProfileWithoutDowngrading(db, userId, "board_contact", displayName);
  const { error } = await db.from("org_members").upsert({ organisation_id: organisationId, user_id: userId }, { onConflict: "organisation_id,user_id", ignoreDuplicates: true });
  if (error) throw new Error(`org_members upsert failed: ${error.message}`);
}

/** The actual fix for issue #12's "the role/org id alone is the entire access control"
 *  gap: verifies the signed-in session really is a recorded contact for this
 *  organisation (org_members), the same relationship roles_member_write/update's RLS
 *  policy already encodes — checked explicitly here because the data reads these actions
 *  do (suggested trustees, other candidates' profiles) go through the admin client, which
 *  bypasses RLS, so it isn't enforced automatically the way it is for the candidate side.
 *
 *  Also the operator impersonation gate (2026-10-21, Jon: "the main thing is to control
 *  who can access all profiles and how" — the operator-promotion gate is the real control,
 *  not artificially restricting what an already-trusted operator can do once inside): an
 *  operator passes this check for any organisation, same as a real member would. Every
 *  caller below (getSuggestedTrustees, toggleInterest) already uses this function's
 *  returned `user` as the real actor for reads and as `acted_by` for writes, so an
 *  operator acting here is automatically attributed to the operator's own real id, never
 *  silently recorded as if the real contact had acted — no extra plumbing needed. */
async function requireOrgMember(session: SupabaseClient, organisationId: string): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, error: "You need to sign in first." };
  const { data: membership } = await session.from("org_members").select("organisation_id").eq("organisation_id", organisationId).eq("user_id", user.id).maybeSingle();
  if (membership) return { ok: true, user };
  if (await isOperator(session, user.id)) return { ok: true, user };
  return { ok: false, error: "You're not a contact for this charity." };
}

export async function publishRoleAndMatch(input: RoleInput): Promise<PublishResult> {
  try {
    if (!input.orgName.trim()) return { ok: false, error: "Enter your charity's name." };
    if (!input.contactName.trim()) return { ok: false, error: "Enter a contact name — yours or a colleague's. This is who we'll reveal to a matched candidate." };
    if (!input.title.trim()) return { ok: false, error: "Give the role a title." };
    if (!input.purpose.trim()) return { ok: false, error: "Add a short purpose — what does your charity do?" };
    if (input.hoursPerMonth <= 0) return { ok: false, error: "Hours per month must be more than 0." };
    if (!input.meetingPattern.trim()) return { ok: false, error: "Describe the meeting pattern." };
    if (!input.induction.trim()) return { ok: false, error: "Describe the induction you'll offer." };
    if (input.missingSkills.length === 0 && input.thinSkills.length === 0) {
      return { ok: false, error: "Mark at least one skill as missing or thin — a role with no stated gap can't be matched on skills." };
    }

    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return { ok: false, error: "You need to sign in first." };

    const db = createAdminClient();
    const { organisationId, isNew } = await findOrCreateOrg(db, input.orgName);
    if (isNew) {
      // First publish for this org name — the signed-in user becomes its founding contact.
      await linkOrgContact(db, organisationId, user.id, input.contactName.trim());
    } else {
      const { data: membership } = await session.from("org_members").select("organisation_id").eq("organisation_id", organisationId).eq("user_id", user.id).maybeSingle();
      if (!membership) {
        return {
          ok: false,
          error: `"${input.orgName.trim()}" already has a contact set up under a different sign-in. If that's you, sign in with the same email — otherwise ask them to add you, or use a different charity name.`,
        };
      }
    }

    const boardSkills: BoardSkillCell[] = [
      ...input.missingSkills.map((skill) => ({ skill, coverage: "missing" as const })),
      ...input.thinSkills.map((skill) => ({ skill, coverage: "thin" as const })),
    ];

    // roles_member_write/update's RLS policy is exactly "is_org_member(organisation_id)"
    // — already verified above, so the session client (not admin) does this insert.
    const { data: role, error } = await session
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
    const session = await createClient();
    const db = createAdminClient();

    const { data: roleRow, error: roleErr } = await db.from("roles").select(ROLE_SELECT).eq("id", roleId).maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) return { ok: false, error: "Role not found." };
    const role = toRole(roleRow as unknown as RoleRow);

    const membership = await requireOrgMember(session, role.organisationId);
    if (!membership.ok) return { ok: false, error: membership.error };

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

export type ToggleInterestResult =
  | { ok: true; interest: "interested" | "pass" | null; matched: boolean }
  | { ok: false; error: string; alreadyMatched?: boolean };

/** Sets, changes, or clears (pass `null`) the charity side's interest in one card. */
export async function toggleInterest(cardId: string, roleId: string, candidateId: string, action: "interested" | "pass" | null): Promise<ToggleInterestResult> {
  try {
    const session = await createClient();
    const admin = createAdminClient();

    const { data: roleRow } = await session.from("roles").select("organisation_id").eq("id", roleId).maybeSingle();
    if (!roleRow) return { ok: false, error: "Role not found." };
    const membership = await requireOrgMember(session, roleRow.organisation_id);
    if (!membership.ok) return { ok: false, error: membership.error };

    // recordInterest/clearInterest need to read both sides' interest rows to detect a
    // mutual match — inherently cross-user, engine-level logic — so this runs with the
    // service role, only after the membership check above has verified who's really asking.
    if (action === null) {
      const cleared = await clearInterest(admin, cardId, "charity");
      if (!cleared.ok) return { ok: false, error: "Already introduced — can't withdraw interest after a mutual match.", alreadyMatched: true };
      return { ok: true, interest: null, matched: false };
    }

    const result = await recordInterest(admin, { cardId, roleId, candidateId, side: "charity", action, actedBy: membership.user.id });
    return { ok: true, interest: result.interest, matched: result.matched };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error updating interest" };
  }
}
