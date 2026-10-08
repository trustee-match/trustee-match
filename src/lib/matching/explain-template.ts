import { causeLabel, skillLabel } from "../config";
import type { Candidate, Reason, Role, ScoredPair } from "./types";

/**
 * Deterministic "why" used for provisional cards (shown instantly, before the AI step)
 * and in degraded mode when the AI is unavailable. Every reason carries a real ref.
 */
export function templateReasons(pair: ScoredPair, role: Role, candidate: Candidate): Reason[] {
  const reasons: Reason[] = [];

  for (const m of pair.gapMatches.slice(0, 2)) {
    const gap = m.coverage === "missing" ? "Fills a missing" : "Strengthens a thin";
    const note = m.boardNote ? ` (“${m.boardNote}”)` : "";
    reasons.push({
      claim: `${gap} ${skillLabel(m.skill).toLowerCase()} seat on the board${note} with ${m.level}-level experience: “${m.evidence}”.`,
      ref: { kind: "candidate_skill", skill: m.skill },
    });
  }

  if (reasons.length < 3 && candidate.causes.includes(role.cause)) {
    reasons.push({
      claim: `Cares about ${causeLabel(role.cause).toLowerCase()}, the board's cause.`,
      ref: { kind: "candidate_cause", cause: role.cause },
    });
  }

  if (reasons.length < 3 && candidate.hoursPerMonth >= role.hoursPerMonth) {
    reasons.push({
      claim: `Has ${candidate.hoursPerMonth} hrs/month available; the role needs about ${role.hoursPerMonth}.`,
      ref: { kind: "role_field", field: "hoursPerMonth" },
    });
  }

  return reasons.slice(0, 3);
}
