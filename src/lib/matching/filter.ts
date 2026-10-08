import type { Candidate, FilterReason, Role } from "./types";

/** Hard rules. Returns null if the pairing may be scored, otherwise why not. */
export function filterPair(role: Role, candidate: Candidate): FilterReason | null {
  if (role.paused) return "role_paused";
  if (candidate.paused) return "candidate_paused";
  if (candidate.hoursPerMonth < role.hoursPerMonth) return "insufficient_hours";
  if (candidate.conflicts.includes(role.organisationId)) return "conflict";
  if (candidate.causeExclusions.includes(role.cause)) return "cause_excluded";
  if (candidate.activeWithOrganisations.includes(role.organisationId)) return "already_active_with_org";
  const has = new Set(candidate.skills.map((s) => s.skill));
  if (role.mustHaveSkills.some((skill) => !has.has(skill))) return "missing_must_have";
  return null;
}
