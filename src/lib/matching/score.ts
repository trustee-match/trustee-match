import { MATCHING, RELATED_CAUSES, type MatchingConfig } from "../config";
import type { Candidate, Role, ScoredPair } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Gap fit: how well the candidate fills the cells the board marked thin or missing.
 * Normalised against the best possible candidate for this board (senior in every gap),
 * so a candidate who fills the board's one missing skill scores near 1.
 */
export function gapFit(role: Role, candidate: Candidate, cfg: MatchingConfig = MATCHING) {
  const bySkill = new Map(candidate.skills.map((s) => [s.skill, s]));
  let achieved = 0;
  let possible = 0;
  const matches: ScoredPair["gapMatches"] = [];

  for (const cell of role.boardSkills) {
    if (cell.coverage === "covered") continue;
    const w = cfg.gap_weight[cell.coverage];
    possible += w * cfg.level_weight.senior;
    const s = bySkill.get(cell.skill);
    if (s) {
      achieved += w * cfg.level_weight[s.level];
      matches.push({ skill: s.skill, coverage: cell.coverage, level: s.level, evidence: s.evidence, boardNote: cell.note });
    }
  }
  matches.sort(
    (a, b) =>
      cfg.gap_weight[b.coverage] * cfg.level_weight[b.level] - cfg.gap_weight[a.coverage] * cfg.level_weight[a.level],
  );
  // A board with no gaps can't be helped on skills; it should rely on other factors.
  return { value: possible === 0 ? 0 : clamp01(achieved / possible), matches };
}

export function causeAffinity(role: Role, candidate: Candidate, cfg: MatchingConfig = MATCHING): number {
  if (candidate.causes.includes(role.cause)) return cfg.cause_affinity.exact;
  const related = RELATED_CAUSES.some(
    ([a, b]) =>
      (a === role.cause && candidate.causes.includes(b)) || (b === role.cause && candidate.causes.includes(a)),
  );
  return related ? cfg.cause_affinity.related : cfg.cause_affinity.none;
}

/** 1.0 when the candidate has generous spare time, scaling down to exact_fit_score at an exact fit. */
export function commitmentFit(role: Role, candidate: Candidate, cfg: MatchingConfig = MATCHING): number {
  if (role.hoursPerMonth <= 0) return 1;
  const ratio = candidate.hoursPerMonth / role.hoursPerMonth;
  if (ratio < 1) return 0; // filtered out upstream; defensive
  const { generous_ratio, exact_fit_score } = cfg.commitment;
  if (ratio >= generous_ratio) return 1;
  return exact_fit_score + ((ratio - 1) / (generous_ratio - 1)) * (1 - exact_fit_score);
}

/** First-timers are never penalised for inexperience if they've read the readiness guide. */
export function readiness(candidate: Candidate, cfg: MatchingConfig = MATCHING): number {
  if (candidate.priorBoardExperience) return cfg.readiness.experienced;
  return candidate.readGuide ? cfg.readiness.first_timer_read_guide : cfg.readiness.first_timer;
}

/** −1, 0 or +1: spreads attention away from busy candidates and towards long-open roles. */
export function balancing(role: Role, candidate: Candidate, now: Date, cfg: MatchingConfig = MATCHING): number {
  let b = 0;
  if (candidate.openInterests >= cfg.balancing.busy_candidate_open_interests) b -= 1;
  const ageDays = (now.getTime() - new Date(role.publishedAt).getTime()) / DAY_MS;
  if (ageDays > cfg.balancing.stale_role_days) b += 1;
  return b;
}

function diversityBonus(role: Role, candidate: Candidate): number {
  if (!role.diversityPreference) return 0;
  if (role.diversityPreference === "first_time_trustee") return candidate.priorBoardExperience ? 0 : 1;
  return candidate.preferenceTags.includes(role.diversityPreference) ? 1 : 0;
}

export function scorePair(role: Role, candidate: Candidate, now = new Date(), cfg: MatchingConfig = MATCHING): ScoredPair {
  const w = cfg.weights;
  const gap = gapFit(role, candidate, cfg);
  const breakdown = {
    gapFit: gap.value,
    causeAffinity: causeAffinity(role, candidate, cfg),
    commitmentFit: commitmentFit(role, candidate, cfg),
    readiness: readiness(candidate, cfg),
    balancing: balancing(role, candidate, now, cfg),
    diversity: diversityBonus(role, candidate),
  };
  const score =
    w.gap_fit * breakdown.gapFit +
    w.cause_affinity * breakdown.causeAffinity +
    w.commitment_fit * breakdown.commitmentFit +
    w.readiness * breakdown.readiness +
    w.balancing * breakdown.balancing +
    w.diversity_preference * breakdown.diversity;

  return {
    roleId: role.id,
    candidateId: candidate.id,
    score: Math.round(score * 10) / 10,
    breakdown,
    gapMatches: gap.matches,
  };
}
