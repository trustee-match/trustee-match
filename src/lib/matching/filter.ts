import type { Candidate, FilterReason, Role } from "./types";

/**
 * Hard rules. Returns null if the pairing may be scored, otherwise why not.
 *
 * Hours are deliberately NOT a hard filter (see `commitmentFit` in score.ts): a
 * self-reported "5 hours a month" is a rough, often round-numbered estimate, not a
 * precise commitment, and so is a role's stated requirement. A one-hour shortfall and
 * a nineteen-hour shortfall are not the same kind of mismatch, so they're scored on a
 * continuum rather than both being excluded outright. See
 * planning/agc-validation-questions.md #1 for the reasoning and the open question this
 * is meant to validate with the AGC.
 */
export function filterPair(role: Role, candidate: Candidate): FilterReason | null {
  if (role.paused) return "role_paused";
  if (candidate.paused) return "candidate_paused";
  if (candidate.conflicts.includes(role.organisationId)) return "conflict";
  if (candidate.causeExclusions.includes(role.cause)) return "cause_excluded";
  if (candidate.activeWithOrganisations.includes(role.organisationId)) return "already_active_with_org";
  const has = new Set(candidate.skills.map((s) => s.skill));
  if (role.mustHaveSkills.some((skill) => !has.has(skill))) return "missing_must_have";
  return null;
}
