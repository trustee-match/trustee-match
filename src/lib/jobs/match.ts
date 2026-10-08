import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rankAndExplain } from "../ai/rank-explain";
import { CANDIDATE_SELECT, ROLE_SELECT, toCandidate, toCardRow, toRole, type CandidateRow, type RoleRow } from "../db/mappers";
import { nextAlertTime } from "../matching/alerts";
import { applyAiJudgement, isAlertWorthy, provisionalCard, rankCandidatesForRole, rankRolesForCandidate } from "../matching/engine";
import type { Candidate, Card, Role, ScoredPair } from "../matching/types";
import { createAdminClient } from "../supabase/admin";

// Event-driven matching (design doc §4.4). The rules step runs inline so cards exist
// before the publisher's page loads; the AI step runs afterwards and upgrades cards in place.
// match_jobs gives a durable record so the cron sweep can retry anything that didn't finish.

type Db = SupabaseClient;

async function loadCandidates(db: Db, ids?: string[]): Promise<Candidate[]> {
  let q = db.from("candidates").select(CANDIDATE_SELECT).not("confirmed_at", "is", null).eq("paused", false);
  if (ids) q = q.in("id", ids);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as CandidateRow[];
  if (rows.length === 0) return [];

  const [{ data: interests }, { data: matches }] = await Promise.all([
    db.from("interests").select("candidate_id").eq("side", "candidate").eq("status", "open").in("candidate_id", rows.map((r) => r.id)),
    db.from("matches").select("candidate_id, roles(organisation_id)").in("stage", ["introduced", "met", "appointed"]).in("candidate_id", rows.map((r) => r.id)),
  ]);
  return rows.map((r) =>
    toCandidate(r, {
      openInterests: (interests ?? []).filter((i) => i.candidate_id === r.id).length,
      activeWithOrganisations: ((matches ?? []) as unknown as { candidate_id: string; roles: { organisation_id: string } | null }[])
        .filter((m) => m.candidate_id === r.id && m.roles)
        .map((m) => m.roles!.organisation_id),
    }),
  );
}

async function loadRoles(db: Db, ids?: string[]): Promise<Role[]> {
  let q = db.from("roles").select(ROLE_SELECT).eq("status", "published");
  if (ids) q = q.in("id", ids);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as RoleRow[]).map(toRole).filter((r) => !r.paused);
}

async function upsertCards(db: Db, cards: Card[]) {
  if (cards.length === 0) return;
  const { error } = await db.from("cards").upsert(cards.map(toCardRow), { onConflict: "role_id,candidate_id" });
  if (error) throw error;
}

async function hideCards(db: Db, pairs: { roleId: string; candidateId: string }[]) {
  for (const p of pairs) {
    await db.from("cards").update({ hidden: true }).eq("role_id", p.roleId).eq("candidate_id", p.candidateId);
  }
}

async function queueAlerts(db: Db, cards: { card: Card; rankForRole: number }[]) {
  const now = new Date();
  const worthy = cards.filter((c) => isAlertWorthy(c.card, c.rankForRole));
  for (const { card } of worthy) {
    const { data: cand } = await db.from("candidates").select("alert_mode, last_alert_at").eq("id", card.candidateId).single();
    if (!cand || cand.alert_mode === "off") continue;
    const { data: cardRow } = await db.from("cards").select("id").eq("role_id", card.roleId).eq("candidate_id", card.candidateId).single();
    const sendAfter =
      cand.alert_mode === "daily"
        ? nextAlertTime(new Date(now.getTime() + 24 * 3600 * 1000), null)
        : nextAlertTime(now, cand.last_alert_at ? new Date(cand.last_alert_at) : null);
    await db.from("alerts").insert({
      recipient_id: card.candidateId,
      card_id: cardRow?.id ?? null,
      kind: "new_match",
      send_after: sendAfter.toISOString(),
    });
  }
}

/** Rules step for a role: instant provisional cards. Returns the shortlist for the AI step. */
export async function matchRoleRules(db: Db, roleId: string) {
  const [role] = await loadRoles(db, [roleId]);
  if (!role) return null;
  const candidates = await loadCandidates(db);
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const ranked = rankCandidatesForRole(role, candidates);

  await upsertCards(db, ranked.map((p) => provisionalCard(p, role, byId.get(p.candidateId)!)));
  // Hide cards for candidates who no longer qualify (e.g. after an edit).
  const { data: existing } = await db.from("cards").select("candidate_id").eq("role_id", roleId).eq("hidden", false);
  const keep = new Set(ranked.map((p) => p.candidateId));
  await hideCards(db, (existing ?? []).filter((e) => !keep.has(e.candidate_id)).map((e) => ({ roleId, candidateId: e.candidate_id })));

  return { role, shortlist: ranked.map((pair) => ({ pair, candidate: byId.get(pair.candidateId)! })) };
}

/** AI step for a role: re-rank, ground, upgrade or hide cards, then queue alerts. */
export async function matchRoleAi(db: Db, role: Role, shortlist: { pair: ScoredPair; candidate: Candidate }[]) {
  const judgements = await rankAndExplain(role, shortlist);
  let finalCards: Card[];
  if (judgements) {
    const byCandidate = new Map(judgements.map((j) => [j.candidateId, j]));
    const upgraded: Card[] = [];
    const hidden: { roleId: string; candidateId: string }[] = [];
    for (const { pair, candidate } of shortlist) {
      const j = byCandidate.get(candidate.id);
      if (!j) continue; // beyond the AI top-N: keep the rules card
      const card = applyAiJudgement(pair, role, candidate, j);
      if (card) upgraded.push(card);
      else hidden.push({ roleId: role.id, candidateId: candidate.id });
    }
    await upsertCards(db, upgraded);
    await hideCards(db, hidden);
    finalCards = upgraded.sort((a, b) => (a.aiRank ?? 999) - (b.aiRank ?? 999));
  } else {
    // Degraded mode: rules cards stand.
    finalCards = shortlist.map(({ pair, candidate }) => provisionalCard(pair, role, candidate));
  }
  await queueAlerts(db, finalCards.map((card, i) => ({ card, rankForRole: i + 1 })));
}

/** Rules step for a newly confirmed/edited candidate profile. */
export async function matchCandidateRules(db: Db, candidateId: string) {
  const [candidate] = await loadCandidates(db, [candidateId]);
  if (!candidate) return null;
  const roles = await loadRoles(db);
  const byId = new Map(roles.map((r) => [r.id, r]));
  const ranked = rankRolesForCandidate(candidate, roles);
  await upsertCards(db, ranked.map((p) => provisionalCard(p, byId.get(p.roleId)!, candidate)));
  return { candidate, top: ranked.slice(0, 5).map((pair) => ({ pair, role: byId.get(pair.roleId)! })) };
}

/** AI step for a candidate: explain their top roles (one small call per role, in parallel). */
export async function matchCandidateAi(db: Db, candidate: Candidate, top: { pair: ScoredPair; role: Role }[]) {
  await Promise.all(
    top.map(async ({ pair, role }) => {
      const judgements = await rankAndExplain(role, [{ pair, candidate }]);
      const j = judgements?.[0];
      if (!j) return;
      const card = applyAiJudgement(pair, role, candidate, j);
      if (card) await upsertCards(db, [card]);
      else await hideCards(db, [{ roleId: role.id, candidateId: candidate.id }]);
    }),
  );
}

export type JobSubject = { type: "role" | "candidate"; id: string };

/** Full job (rules + AI), used by the cron sweep for retries. */
export async function runMatchJob(jobId: string, subject: JobSubject) {
  const db = createAdminClient();
  await db.from("match_jobs").update({ status: "running" }).eq("id", jobId);
  try {
    if (subject.type === "role") {
      const r = await matchRoleRules(db, subject.id);
      if (r) await matchRoleAi(db, r.role, r.shortlist);
    } else {
      const r = await matchCandidateRules(db, subject.id);
      if (r) await matchCandidateAi(db, r.candidate, r.top);
    }
    await db.from("match_jobs").update({ status: "done", done_at: new Date().toISOString() }).eq("id", jobId);
  } catch (error) {
    const { data } = await db.from("match_jobs").select("attempts").eq("id", jobId).single();
    await db
      .from("match_jobs")
      .update({ status: "failed", attempts: (data?.attempts ?? 0) + 1, last_error: error instanceof Error ? error.message : "error" })
      .eq("id", jobId);
  }
}
