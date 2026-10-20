"use server";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isOperator } from "@/lib/auth/operator";
import { findOrCreateAuthUser } from "@/lib/auth/shadow-user";
import { CANDIDATE_SELECT, CARD_SELECT, ROLE_SELECT, toCandidate, toCard, toRole, type CandidateRow, type CardRow, type RoleRow } from "@/lib/db/mappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Candidate, Card, Role } from "@/lib/matching/types";

/** Every identity-sensitive action here re-verifies operator status itself (never trusts
 *  that the page already checked) — same "never trust the caller, always re-derive"
 *  principle as everywhere else in the real-auth work (src/app/join/actions.ts,
 *  src/app/charity/actions.ts). */
async function requireOperator(): Promise<{ ok: true; session: SupabaseClient; user: User } | { ok: false; error: string }> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, error: "You need to sign in first." };
  if (!(await isOperator(session, user.id))) return { ok: false, error: "Not an operator." };
  return { ok: true, session, user };
}

export interface OperatorOverviewRow {
  role: Role;
  topMatches: { card: Card; candidate: Candidate }[];
}

export type OperatorOverviewResult = { ok: true; rows: OperatorOverviewRow[]; candidateCount: number } | { ok: false; error: string };

/** Read-only, by design — this is a reporting view, not a way to act on anyone's behalf.
 *  Deliberately does not expose a way to toggle interest or otherwise act as a candidate
 *  or charity from here; that's the whole point of keeping this "very locked down"
 *  (Jon, 2026-10-20) rather than reviving the old impersonation pattern. */
export async function getOperatorOverview(): Promise<OperatorOverviewResult> {
  const check = await requireOperator();
  if (!check.ok) return { ok: false, error: check.error };

  const db = createAdminClient();

  const [{ data: roleRows, error: roleErr }, { data: cardRows, error: cardErr }, { data: candRows, error: candErr }] = await Promise.all([
    db.from("roles").select(ROLE_SELECT).eq("status", "published").order("published_at", { ascending: false }),
    db.from("cards").select(CARD_SELECT).eq("hidden", false).order("score", { ascending: false }),
    db.from("candidates").select(CANDIDATE_SELECT).not("confirmed_at", "is", null),
  ]);
  if (roleErr) return { ok: false, error: roleErr.message };
  if (cardErr) return { ok: false, error: cardErr.message };
  if (candErr) return { ok: false, error: candErr.message };

  const roles = ((roleRows ?? []) as unknown as RoleRow[]).map(toRole);
  const cards = ((cardRows ?? []) as unknown as CardRow[]).map(toCard);
  const candidates = ((candRows ?? []) as unknown as CandidateRow[]).map((c) => toCandidate(c, { openInterests: 0, activeWithOrganisations: [] }));
  const candidateById = new Map(candidates.map((c) => [c.id, c]));

  const byRole = new Map<string, { card: Card; candidate: Candidate }[]>();
  for (const card of cards) {
    const candidate = candidateById.get(card.candidateId);
    if (!candidate) continue;
    const list = byRole.get(card.roleId) ?? [];
    list.push({ card, candidate });
    byRole.set(card.roleId, list);
  }

  const rows: OperatorOverviewRow[] = roles.map((role) => ({ role, topMatches: (byRole.get(role.id) ?? []).slice(0, 5) }));
  return { ok: true, rows, candidateCount: candidates.length };
}

export type PromoteResult = { ok: true; email: string; preSeeded: boolean } | { ok: false; error: string };

/** Only an operator can create another operator — requireOperator above is the actual
 *  gate; a non-operator can never reach the lookup below.
 *
 *  Pre-seeding (2026-10-20, Jon: "can I pre-seed the operators?"): if nobody's signed in
 *  with this email yet, one is created via the admin API (findOrCreateAuthUser — the same
 *  helper src/lib/jobs/reset.ts uses for seed personas) rather than refusing. This is
 *  deliberately *not* a reopening of the old shadow-user vulnerability the rest of this
 *  work closed (planning/responsible-design-decisions.md, issues #8/#12/#13): creating the
 *  account grants nobody any access on its own — it only takes effect once that real
 *  person proves they control the address via a genuine magic-link sign-in. Pre-seeding
 *  just stages "this email becomes an operator the moment they actually sign in," the same
 *  pattern as a Workspace admin assigning a role to an email before someone's first login. */
export async function promoteToOperator(email: string): Promise<PromoteResult> {
  const check = await requireOperator();
  if (!check.ok) return { ok: false, error: check.error };

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Enter an email address." };

  const admin = createAdminClient();
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) return { ok: false, error: listError.message };
  const existingUser = list.users.find((u) => u.email?.toLowerCase() === trimmed);

  const preSeeded = !existingUser;
  const userId = existingUser ? existingUser.id : await findOrCreateAuthUser(admin, trimmed, trimmed);

  const { data: existingProfile } = await admin.from("profiles").select("id, display_name").eq("id", userId).maybeSingle();
  const { error } = await admin.from("profiles").upsert({ id: userId, kind: "operator", display_name: existingProfile?.display_name ?? trimmed });
  if (error) return { ok: false, error: error.message };

  return { ok: true, email: trimmed, preSeeded };
}
