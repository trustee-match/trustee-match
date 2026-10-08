import type { BoardSkillCell, Candidate, Card, Level, Role } from "../matching/types";

// Database rows → engine types. Kept in one place so the engine never sees the DB shape.

export interface RoleRow {
  id: string;
  organisation_id: string;
  title: string;
  cause: string;
  hours_per_month: number;
  meeting_pattern: string;
  induction: string;
  board_skills: BoardSkillCell[];
  must_have_skills: string[];
  diversity_preference: string | null;
  status: string;
  published_at: string | null;
  organisations: { name: string; verified: boolean; suspended: boolean } | null;
}

export const ROLE_SELECT =
  "id, organisation_id, title, cause, hours_per_month, meeting_pattern, induction, board_skills, must_have_skills, diversity_preference, status, published_at, organisations(name, verified, suspended)";

export function toRole(r: RoleRow): Role {
  return {
    id: r.id,
    organisationId: r.organisation_id,
    organisationName: r.organisations?.name ?? "",
    title: r.title,
    cause: r.cause,
    hoursPerMonth: r.hours_per_month,
    meetingPattern: r.meeting_pattern,
    induction: r.induction,
    boardSkills: r.board_skills,
    mustHaveSkills: r.must_have_skills,
    diversityPreference: r.diversity_preference,
    verified: r.organisations?.verified ?? false,
    publishedAt: r.published_at ?? new Date().toISOString(),
    paused: r.status !== "published" || Boolean(r.organisations?.suspended),
  };
}

export interface CandidateRow {
  id: string;
  hours_per_month: number;
  prior_board_experience: boolean;
  read_guide: boolean;
  discoverable: boolean;
  causes: string[];
  cause_exclusions: string[];
  conflicts: string[];
  preference_tags: string[];
  paused: boolean;
  confirmed_at: string | null;
  candidate_skills: { skill: string; level: Level; evidence: string }[];
}

export const CANDIDATE_SELECT =
  "id, hours_per_month, prior_board_experience, read_guide, discoverable, causes, cause_exclusions, conflicts, preference_tags, paused, confirmed_at, candidate_skills(skill, level, evidence)";

export function toCandidate(
  c: CandidateRow,
  ctx: { openInterests: number; activeWithOrganisations: string[] },
): Candidate {
  return {
    id: c.id,
    skills: c.candidate_skills,
    causes: c.causes,
    causeExclusions: c.cause_exclusions,
    hoursPerMonth: c.hours_per_month,
    priorBoardExperience: c.prior_board_experience,
    readGuide: c.read_guide,
    conflicts: c.conflicts,
    discoverable: c.discoverable,
    preferenceTags: c.preference_tags,
    openInterests: ctx.openInterests,
    activeWithOrganisations: ctx.activeWithOrganisations,
    paused: c.paused || !c.confirmed_at,
  };
}

export function toCardRow(card: Card) {
  return {
    role_id: card.roleId,
    candidate_id: card.candidateId,
    score: card.score,
    ai_rank: card.aiRank,
    confidence: card.confidence,
    reasons: card.reasons,
    considerations: card.considerations,
    source: card.source,
    hidden: false,
    updated_at: new Date().toISOString(),
  };
}
