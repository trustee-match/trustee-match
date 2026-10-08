import type { Candidate, EvidenceRef, Reason, Role } from "./types";

/** True if the reference points at a real record on this role/candidate pair. */
export function refResolves(ref: EvidenceRef, role: Role, candidate: Candidate): boolean {
  switch (ref.kind) {
    case "candidate_skill":
      return candidate.skills.some((s) => s.skill === ref.skill);
    case "board_cell":
      return role.boardSkills.some((c) => c.skill === ref.skill && c.coverage !== "covered");
    case "candidate_cause":
      return candidate.causes.includes(ref.cause);
    case "role_field":
      return ["hoursPerMonth", "meetingPattern", "induction", "cause"].includes(ref.field);
  }
}

/**
 * The "evidence or silence" rule, enforced in code rather than trusted to the model:
 * reasons whose reference doesn't resolve are dropped.
 */
export function groundReasons(reasons: Reason[], role: Role, candidate: Candidate): Reason[] {
  return reasons.filter((r) => r.claim.trim().length > 0 && refResolves(r.ref, role, candidate));
}
