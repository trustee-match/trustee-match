// Domain types for the matching engine. These are deliberately plain data so
// the engine stays pure (no database, no AI) and fully unit-testable.

export type Level = "working" | "professional" | "senior";
export type Coverage = "covered" | "thin" | "missing";
export type Confidence = "high" | "medium" | "low";

export interface CandidateSkill {
  skill: string;
  level: Level;
  /** Short quote or paraphrase from the CV/LinkedIn PDF that supports this skill. */
  evidence: string;
}

export interface Candidate {
  id: string;
  skills: CandidateSkill[];
  causes: string[];
  causeExclusions: string[];
  hoursPerMonth: number;
  priorBoardExperience: boolean;
  readGuide: boolean;
  /** Organisation ids the candidate must not be matched with. */
  conflicts: string[];
  discoverable: boolean;
  /** Optional tags the candidate chose to share, used only for charity-set preferences. */
  preferenceTags: string[];
  openInterests: number;
  /** Organisation ids where the candidate already has an active match or appointment. */
  activeWithOrganisations: string[];
  paused: boolean;
}

export interface BoardSkillCell {
  skill: string;
  coverage: Coverage;
  /** Free-text note from the audit, used as evidence ("Treasurer stepping down in March"). */
  note?: string;
}

export interface Role {
  id: string;
  organisationId: string;
  organisationName: string;
  title: string;
  cause: string;
  hoursPerMonth: number;
  meetingPattern: string;
  induction: string;
  boardSkills: BoardSkillCell[];
  mustHaveSkills: string[];
  /** e.g. "first_time_trustee", "under_35". Shown openly on the role and in the "why". */
  diversityPreference: string | null;
  verified: boolean;
  publishedAt: string;
  paused: boolean;
}

export interface ScoreBreakdown {
  gapFit: number;
  causeAffinity: number;
  commitmentFit: number;
  readiness: number;
  balancing: number;
  diversity: number;
}

export interface ScoredPair {
  roleId: string;
  candidateId: string;
  /** 0–100 (can exceed slightly with the diversity bonus). */
  score: number;
  breakdown: ScoreBreakdown;
  /** Skills where the candidate fills a thin or missing board cell, strongest first. */
  gapMatches: { skill: string; coverage: Coverage; level: Level; evidence: string; boardNote?: string }[];
}

/** Points at a real record so AI reasons can be verified in code. */
export type EvidenceRef =
  | { kind: "candidate_skill"; skill: string }
  | { kind: "board_cell"; skill: string }
  | { kind: "candidate_cause"; cause: string }
  | { kind: "role_field"; field: "hoursPerMonth" | "meetingPattern" | "induction" | "cause" };

export interface Reason {
  claim: string;
  ref: EvidenceRef;
}

export type CardSource = "rules" | "ai";

export interface Card {
  roleId: string;
  candidateId: string;
  score: number;
  aiRank: number | null;
  confidence: Confidence;
  reasons: Reason[];
  considerations: string[];
  source: CardSource;
}

// "insufficient_hours" was removed as a hard-filter reason 2026-10-13 — hours are now
// scored on a continuum (see commitmentFit in score.ts), not a hard pass/fail. See
// planning/agc-validation-questions.md #1.
export type FilterReason = "role_paused" | "candidate_paused" | "conflict" | "cause_excluded" | "missing_must_have" | "already_active_with_org";
