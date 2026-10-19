import { describe, expect, it } from "vitest";
import { diagnoseNoMatchForCandidate, diagnoseNoMatchForRole } from "./no-match-feedback";
import type { Candidate, Role } from "./types";

const NOW = new Date("2026-10-13T12:00:00Z");

function makeRole(overrides: Partial<Role>): Role {
  return {
    id: "role-1",
    organisationId: "org-1",
    organisationName: "Org",
    title: "Trustee",
    cause: "community",
    hoursPerMonth: 5,
    meetingPattern: "Monthly",
    induction: "None",
    boardSkills: [],
    mustHaveSkills: [],
    diversityPreference: null,
    verified: false,
    publishedAt: NOW.toISOString(),
    paused: false,
    volunteerGgUrl: null,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<Candidate>): Candidate {
  return {
    id: "cand-1",
    skills: [],
    causes: [],
    causeExclusions: [],
    hoursPerMonth: 5,
    priorBoardExperience: false,
    readGuide: false,
    conflicts: [],
    discoverable: true,
    preferenceTags: [],
    openInterests: 0,
    activeWithOrganisations: [],
    paused: false,
    motivation: null,
    ...overrides,
  };
}

describe("diagnoseNoMatchForCandidate", () => {
  it("identifies tight_time when a real but weak skill match scores below threshold on a severe hours shortfall (2026-10-13 redesign)", () => {
    // Hours are no longer a hard filter — this role is reachable (no must-have gate),
    // has a real but weak (thin/working) gap match, and the severe shortfall (1 vs 20
    // hrs) drags the total score below min_score_to_show without zeroing it outright.
    const roles = [makeRole({ id: "r1", hoursPerMonth: 20, boardSkills: [{ skill: "community_engagement", coverage: "thin" }] })];
    const candidate = makeCandidate({ hoursPerMonth: 1, skills: [{ skill: "community_engagement", level: "working", evidence: "x" }] });
    const d = diagnoseNoMatchForCandidate(candidate, roles, NOW);
    expect(d.dominantReason).toBe("tight_time");
    expect(d.hoursStats).toEqual({ min: 20, median: 20, max: 20 });
    expect(d.message).toContain("20 hours a month");
  });

  it("no longer excludes a close hours shortfall outright — a strong skill match still shows (2026-10-13 redesign)", () => {
    const roles = [makeRole({ id: "r1", hoursPerMonth: 7, boardSkills: [{ skill: "finance_treasury", coverage: "missing" }] })];
    const candidate = makeCandidate({ hoursPerMonth: 2, skills: [{ skill: "finance_treasury", level: "senior", evidence: "x" }] });
    const d = diagnoseNoMatchForCandidate(candidate, roles, NOW);
    // A strong (missing-cell, senior-level) match clears the show threshold even with
    // hours well short of the role's ask — so this isn't a "no match" case at all.
    expect(d.totalOpen).toBe(1);
    expect(d.dominantReason).toBeNull();
    expect(d.tightTimeCount).toBe(0);
    expect(d.noSkillOverlapCount).toBe(0);
  });

  it("identifies missing_must_have and names the skill the candidate lacks", () => {
    const roles = [makeRole({ mustHaveSkills: ["safeguarding"], boardSkills: [{ skill: "safeguarding", coverage: "missing" }] })];
    const candidate = makeCandidate({ hoursPerMonth: 10 });
    const d = diagnoseNoMatchForCandidate(candidate, roles, NOW);
    expect(d.dominantReason).toBe("missing_must_have");
    expect(d.missingSkills).toEqual(["safeguarding"]);
  });

  it("identifies cause_excluded", () => {
    const roles = [makeRole({ cause: "poverty" })];
    const candidate = makeCandidate({ hoursPerMonth: 10, causeExclusions: ["poverty"] });
    const d = diagnoseNoMatchForCandidate(candidate, roles, NOW);
    expect(d.dominantReason).toBe("cause_excluded");
    expect(d.excludedCauses).toEqual(["poverty"]);
  });

  it("identifies no_skill_overlap when every hard filter passes but no board_skills cell resolves", () => {
    const roles = [makeRole({ boardSkills: [{ skill: "community_engagement", coverage: "thin" }] })];
    const candidate = makeCandidate({ hoursPerMonth: 10, skills: [{ skill: "digital_data", level: "professional", evidence: "x" }] });
    const d = diagnoseNoMatchForCandidate(candidate, roles, NOW);
    expect(d.dominantReason).toBe("no_skill_overlap");
    expect(d.noSkillOverlapCount).toBe(1);
  });

  it("reports no open roles distinctly from a real diagnosis", () => {
    const d = diagnoseNoMatchForCandidate(makeCandidate({}), [], NOW);
    expect(d.totalOpen).toBe(0);
    expect(d.dominantReason).toBeNull();
    expect(d.message).toContain("aren't any open roles");
  });

  it("ignores paused roles entirely", () => {
    const roles = [makeRole({ paused: true, hoursPerMonth: 999 })];
    const d = diagnoseNoMatchForCandidate(makeCandidate({ hoursPerMonth: 1 }), roles, NOW);
    expect(d.totalOpen).toBe(0);
  });
});

describe("diagnoseNoMatchForRole", () => {
  it("identifies tight_time from the role's perspective (2026-10-13 redesign)", () => {
    const role = makeRole({ hoursPerMonth: 30, boardSkills: [{ skill: "community_engagement", coverage: "thin" }] });
    const skills = [{ skill: "community_engagement", level: "working" as const, evidence: "x" }];
    const candidates = [makeCandidate({ id: "c1", hoursPerMonth: 4, skills }), makeCandidate({ id: "c2", hoursPerMonth: 6, skills })];
    const d = diagnoseNoMatchForRole(role, candidates, NOW);
    expect(d.dominantReason).toBe("tight_time");
    expect(d.hoursStats).toEqual({ min: 4, median: 5, max: 6 });
    expect(d.message).toContain("30");
  });

  it("identifies missing_must_have using the role's own requirement", () => {
    const role = makeRole({ mustHaveSkills: ["legal"] });
    const candidates = [makeCandidate({ hoursPerMonth: 10 })];
    const d = diagnoseNoMatchForRole(role, candidates, NOW);
    expect(d.dominantReason).toBe("missing_must_have");
    expect(d.missingSkills).toEqual(["legal"]);
  });

  it("reports no registered candidates distinctly", () => {
    const d = diagnoseNoMatchForRole(makeRole({}), [], NOW);
    expect(d.totalOpen).toBe(0);
    expect(d.message).toContain("No candidates are registered yet");
  });
});
