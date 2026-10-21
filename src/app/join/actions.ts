"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { extractProfile, type ExtractedProfile } from "@/lib/ai/extract-profile";
import { isOperator } from "@/lib/auth/operator";
import { upsertProfileWithoutDowngrading } from "@/lib/auth/shadow-user";
import { CARD_SELECT, ROLE_SELECT, toCandidate, toCard, toRole, type CandidateRow, type CardRow, type RoleRow } from "@/lib/db/mappers";
import { clearInterest, getCharityContact, recordInterest, type Contact } from "@/lib/jobs/interest";
import { triggerMatch } from "@/lib/jobs/trigger";
import { diagnoseNoMatchForCandidate, type NoMatchDiagnosis } from "@/lib/matching/no-match-feedback";
import type { Card, Role } from "@/lib/matching/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Real sign-in (src/app/sign-in) replaced the old admin-API "shadow user created from a
// typed email, no credential check" pattern — see planning/responsible-design-decisions.md,
// Security, issues #8/#12/#13. Every action below that writes or reads a specific
// candidate's data derives that candidate's identity from the real signed-in session
// (src/lib/supabase/server.ts's createClient + auth.getUser()), never from a
// client-supplied id — a client argument is at most a hint for what to display, never
// what to act as. createAdminClient() is still used, deliberately, only for genuinely
// engine-owned operations (triggerMatch) and the narrow, already-authorized "reveal a
// matched contact's real email" lookup (getCharityContact, which needs auth.admin.* —
// unavailable to the session client).

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

/** `base64` is the PDF's content with any `data:...;base64,` prefix already stripped —
 *  either a LinkedIn "Save to PDF" profile export or a CV, per docs/matching-design.md
 *  §3.2's "Import your LinkedIn profile" path. Claude extracts `linkedin_url` from the
 *  document itself when present (extract-profile.ts); nothing here parses the PDF by
 *  hand or scrapes linkedin.com — it's the candidate's own exported file. */
export async function extractFromPdf(base64: string): Promise<ExtractResult> {
  if (!base64.trim()) return { ok: false, error: "Choose a PDF file first." };
  const profile = await extractProfile({ kind: "pdf", base64 });
  if (!profile) {
    return {
      ok: false,
      error:
        "AI extraction returned nothing — most likely ANTHROPIC_API_KEY isn't set in .env.local (or the dev server hasn't been restarted since it was added), or Claude declined to process this file.",
    };
  }
  return { ok: true, profile };
}

/** `base64` is a .docx file's content with any `data:...;base64,` prefix already
 *  stripped. Claude's document block is PDF-only, so extractProfile converts this to
 *  plain text with mammoth first (extract-profile.ts) and sends that down the same path
 *  as pasted CV text. */
export async function extractFromDocx(base64: string): Promise<ExtractResult> {
  if (!base64.trim()) return { ok: false, error: "Choose a .docx file first." };
  try {
    const profile = await extractProfile({ kind: "docx", base64 });
    if (!profile) {
      return {
        ok: false,
        error:
          "AI extraction returned nothing — most likely ANTHROPIC_API_KEY isn't set in .env.local (or the dev server hasn't been restarted since it was added), or Claude declined to process this file.",
      };
    }
    return { ok: true, profile };
  } catch {
    return { ok: false, error: "Couldn't read that file — make sure it's a .docx (not .doc, which isn't supported), and not password-protected." };
  }
}

export interface ConfirmInput {
  /** Display name only — identity comes from the signed-in session, not this field. */
  name: string;
  headline: string;
  skills: { skill: string; level: string; evidence: string; include: boolean }[];
  causes: string[];
  hoursPerMonth: number;
  priorBoardExperience: boolean;
  readGuide: boolean;
  conflictOrgNames: string[];
  /** The raw CV/personal-statement text pasted in — stored so testers can compare what
   *  was submitted against what the engine extracted (see planning/demo-scaffolding.md).
   *  Not shown back to the candidate anywhere yet; demo/testing-only for now. */
  cvText: string;
  /** Captured from a LinkedIn PDF export (or typed CV text that mentions it), confirmed
   *  by the candidate like every other extracted field. Revealed to the charity only at
   *  the match stage (docs/matching-design.md §3.2) — see getCandidateContact. */
  linkedinUrl: string | null;
  /** What draws them to this kind of work, in their own words — a direct question asked
   *  in /join, not AI-inferred like `causes`. AGC feedback (planning/feedback/agc1.md,
   *  Kirstin): "add a question about what people feel passionate about rather than focus
   *  on their skills alone." Shown to a charity pre-match, same as skills/causes. */
  motivation: string | null;
}

export type ConfirmResult = { ok: true; candidateId: string } | { ok: false; error: string };

export async function confirmProfileAndMatch(input: ConfirmInput): Promise<ConfirmResult> {
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { ok: false, error: "You need to sign in first." };
    const userId = user.id;

    await upsertProfileWithoutDowngrading(db, userId, "candidate", input.name);

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
      cv_text: input.cvText,
      linkedin_url: input.linkedinUrl,
      motivation: input.motivation,
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

export interface CandidateMatch {
  role: Role;
  card: Card;
  cardId: string;
  interest: "interested" | "pass" | null;
  matched: boolean;
  /** The charity contact's real name/email, revealed once matched — null if no real
   *  org_members contact is linked yet (true for every seeded pilot org right now; see
   *  getCharityContact in lib/jobs/interest.ts). */
  matchedContact: Contact | null;
}

export type MatchesResult =
  | { ok: true; matches: CandidateMatch[] }
  | { ok: true; matches: []; diagnosis: NoMatchDiagnosis }
  | { ok: false; error: string };

/** `viewCandidateId` is operator impersonation (2026-10-21, Jon: the operator-promotion
 *  gate is the real control, not restricting what an already-trusted operator can do once
 *  inside) — omitted or equal to the signed-in user's own id, this is a normal self-view,
 *  RLS-scoped via the session client exactly as before. Set to someone else's id, it
 *  requires the caller to be a verified operator, and reads through the admin client
 *  instead (RLS has no operator-bypass policy on cards/candidates/interests, deliberately
 *  — this is the one, explicit, audited door around that, not a general-purpose one). */
export async function getMatchesForCandidate(viewCandidateId?: string): Promise<MatchesResult> {
  try {
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return { ok: false, error: "You need to sign in first." };

    let candidateId = user.id;
    let db: SupabaseClient = session;
    if (viewCandidateId && viewCandidateId !== user.id) {
      if (!(await isOperator(session, user.id))) return { ok: false, error: "You can only view your own matches." };
      candidateId = viewCandidateId;
      db = createAdminClient();
    }
    // getCharityContact needs auth.admin.getUserById (only available to the service
    // role) to reveal a matched charity contact's real email — every other read below
    // goes through `db` (session-scoped RLS for a self-view, admin for a verified
    // operator's impersonated view), so this action can never return another candidate's
    // data for anyone else.
    const admin = createAdminClient();

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

    const cardRowsTyped = (cardRows ?? []) as unknown as CardRow[];
    const cards = cardRowsTyped.map(toCard);

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

    const { data: interestRows } = await db
      .from("interests")
      .select("card_id, action, status")
      .eq("candidate_id", candidateId)
      .eq("side", "candidate")
      .neq("status", "withdrawn");
    const interestByCard = new Map((interestRows ?? []).map((i) => [i.card_id, { action: i.action as "interested" | "pass", matched: i.status === "matched" }]));

    const byRole = new Map(roles.map((r) => [r.id, r]));
    const byCardId = new Map(cardRowsTyped.map((r) => [r.role_id + ":" + r.candidate_id, r.id]));
    const matches = await Promise.all(
      cards
        .map((card) => {
          const cardId = byCardId.get(card.roleId + ":" + card.candidateId)!;
          const existing = interestByCard.get(cardId);
          return { role: byRole.get(card.roleId)!, card, cardId, interest: existing?.action ?? null, matched: existing?.matched ?? false };
        })
        .filter((m) => m.role)
        .map(async (m) => ({ ...m, matchedContact: m.matched ? await getCharityContact(admin, m.role.organisationId) : null })),
    );
    return { ok: true, matches };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error loading matches" };
  }
}

export type ToggleInterestResult =
  | { ok: true; interest: "interested" | "pass" | null; matched: boolean }
  | { ok: false; error: string; alreadyMatched?: boolean };

/** Sets, changes, or clears (pass `null`) the candidate side's interest in one card. A
 *  candidate acting for themself is their own `acted_by`, same as before. `actAsCandidateId`
 *  is operator impersonation (see getMatchesForCandidate's doc comment) — when present and
 *  not the signed-in user, requires a verified operator, and `acted_by` stays the
 *  operator's own real id, never the impersonated candidate's, so it's never ambiguous in
 *  the data who actually clicked the button. */
export async function toggleCandidateInterest(cardId: string, roleId: string, action: "interested" | "pass" | null, actAsCandidateId?: string): Promise<ToggleInterestResult> {
  try {
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return { ok: false, error: "You need to sign in first." };

    let candidateId = user.id;
    let checkClient: SupabaseClient = session;
    if (actAsCandidateId && actAsCandidateId !== user.id) {
      if (!(await isOperator(session, user.id))) return { ok: false, error: "You can only act on your own behalf." };
      candidateId = actAsCandidateId;
      checkClient = createAdminClient(); // RLS can't see another candidate's card — verified operator status above stands in for it here
    }
    const actedBy = user.id;

    // cards_candidate_read RLS already restricts a self-view to the signed-in user's own
    // cards; for an impersonated view, this still verifies the card really belongs to the
    // claimed target — an operator can't pass a mismatched cardId/candidateId pair.
    const { data: card } = await checkClient.from("cards").select("id").eq("id", cardId).eq("candidate_id", candidateId).maybeSingle();
    if (!card) return { ok: false, error: "That card isn't theirs." };

    // recordInterest/clearInterest need to read both sides' interest rows to detect a
    // mutual match — inherently cross-user, engine-level logic (matches
    // createIntroduction's design), so this runs with the service role, only after the
    // ownership check above has verified who's really asking.
    const db = createAdminClient();

    if (action === null) {
      const cleared = await clearInterest(db, cardId, "candidate");
      if (!cleared.ok) return { ok: false, error: "Already introduced — can't withdraw interest after a mutual match.", alreadyMatched: true };
      return { ok: true, interest: null, matched: false };
    }

    const result = await recordInterest(db, { cardId, roleId, candidateId, side: "candidate", action, actedBy });
    return { ok: true, interest: result.interest, matched: result.matched };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error updating interest" };
  }
}

export interface EditableProfile {
  name: string;
  headline: string;
  motivation: string;
  linkedinUrl: string;
  causes: string[];
  hoursPerMonth: number;
  priorBoardExperience: boolean;
  readGuide: boolean;
  cvText: string;
  skills: { skill: string; level: string; evidence: string; include: boolean }[];
  conflictOrgNames: string[];
}

export type EditableProfileResult = { ok: true; profile: EditableProfile } | { ok: false; error: string };

/** Everything join-flow.tsx's review step needs to pre-fill when someone reopens their
 *  own already-confirmed profile to edit it (src/app/join/page.tsx's `edit=1` path) — the
 *  same fields confirmProfileAndMatch writes, read back out. Uses the session-aware
 *  client throughout (not the admin client): candidates_self/candidate_skills_self/
 *  profiles_self_read RLS already scope every read here to exactly the signed-in user's
 *  own rows, so there's nothing extra to check. */
export async function getOwnProfileForEdit(): Promise<EditableProfileResult> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const [{ data: candidateRow, error: candErr }, { data: profileRow }, { data: skillRows }] = await Promise.all([
    session
      .from("candidates")
      .select("headline, motivation, linkedin_url, causes, hours_per_month, prior_board_experience, read_guide, cv_text, conflicts")
      .eq("id", user.id)
      .maybeSingle(),
    session.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    session.from("candidate_skills").select("skill, level, evidence").eq("candidate_id", user.id),
  ]);
  if (candErr) return { ok: false, error: candErr.message };
  if (!candidateRow) return { ok: false, error: "No profile to edit yet." };

  let conflictOrgNames: string[] = [];
  if (candidateRow.conflicts && candidateRow.conflicts.length > 0) {
    const { data: orgs } = await session.from("organisations").select("name").in("id", candidateRow.conflicts);
    conflictOrgNames = (orgs ?? []).map((o) => o.name);
  }

  return {
    ok: true,
    profile: {
      name: profileRow?.display_name ?? "",
      headline: candidateRow.headline ?? "",
      motivation: candidateRow.motivation ?? "",
      linkedinUrl: candidateRow.linkedin_url ?? "",
      causes: candidateRow.causes ?? [],
      hoursPerMonth: candidateRow.hours_per_month ?? 5,
      priorBoardExperience: candidateRow.prior_board_experience ?? false,
      readGuide: candidateRow.read_guide ?? false,
      cvText: candidateRow.cv_text ?? "",
      skills: (skillRows ?? []).map((s) => ({ ...s, include: true })),
      conflictOrgNames,
    },
  };
}
