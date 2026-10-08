import { MATCHING, type MatchingConfig } from "../config";
import { filterPair } from "./filter";
import { groundReasons } from "./grounding";
import { scorePair } from "./score";
import { templateReasons } from "./explain-template";
import type { Candidate, Card, Confidence, Reason, Role, ScoredPair } from "./types";

/** Score every allowed pairing for one role, best first, above the show threshold. */
export function rankCandidatesForRole(
  role: Role,
  candidates: Candidate[],
  opts: { now?: Date; discoverableOnly?: boolean; cfg?: MatchingConfig } = {},
): ScoredPair[] {
  const cfg = opts.cfg ?? MATCHING;
  return candidates
    .filter((c) => !opts.discoverableOnly || c.discoverable)
    .filter((c) => filterPair(role, c) === null)
    .map((c) => scorePair(role, c, opts.now, cfg))
    .filter((p) => p.score >= cfg.thresholds.min_score_to_show && p.gapMatches.length > 0)
    .sort((a, b) => b.score - a.score);
}

/** Score every allowed pairing for one candidate, best first. */
export function rankRolesForCandidate(
  candidate: Candidate,
  roles: Role[],
  opts: { now?: Date; cfg?: MatchingConfig } = {},
): ScoredPair[] {
  const cfg = opts.cfg ?? MATCHING;
  return roles
    .filter((r) => filterPair(r, candidate) === null)
    .map((r) => scorePair(r, candidate, opts.now, cfg))
    .filter((p) => p.score >= cfg.thresholds.min_score_to_show && p.gapMatches.length > 0)
    .sort((a, b) => b.score - a.score);
}

function ruleConfidence(score: number): Confidence {
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/** Instant card from rules alone: shown immediately, upgraded in place when the AI finishes. */
export function provisionalCard(pair: ScoredPair, role: Role, candidate: Candidate): Card {
  return {
    roleId: pair.roleId,
    candidateId: pair.candidateId,
    score: pair.score,
    aiRank: null,
    confidence: ruleConfidence(pair.score),
    reasons: templateReasons(pair, role, candidate),
    considerations: [],
    source: "rules",
  };
}

export interface AiJudgement {
  candidateId: string;
  roleId: string;
  rank: number;
  confidence: Confidence;
  reasons: Reason[];
  considerations: string[];
}

/**
 * Apply an AI judgement to a card. Ungrounded reasons are dropped; if fewer than the
 * minimum survive, or the AI's confidence is low, the card is hidden (returns null),
 * never queued for human review.
 */
export function applyAiJudgement(
  pair: ScoredPair,
  role: Role,
  candidate: Candidate,
  judgement: AiJudgement,
  cfg: MatchingConfig = MATCHING,
): Card | null {
  const grounded = groundReasons(judgement.reasons, role, candidate).slice(0, 3);
  if (judgement.confidence === "low" || grounded.length < cfg.thresholds.min_grounded_reasons) return null;
  return {
    roleId: pair.roleId,
    candidateId: pair.candidateId,
    score: pair.score,
    aiRank: judgement.rank,
    confidence: judgement.confidence,
    reasons: grounded,
    considerations: judgement.considerations.slice(0, 3),
    source: "ai",
  };
}

const CONFIDENCE_ORDER: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/** Should this card trigger an instant alert (before throttling)? */
export function isAlertWorthy(card: Card, rankForRole: number, cfg: MatchingConfig = MATCHING): boolean {
  const min = cfg.thresholds.alert_min_confidence as Confidence;
  return rankForRole <= cfg.thresholds.alert_top_rank && CONFIDENCE_ORDER[card.confidence] >= CONFIDENCE_ORDER[min];
}
