import { describe, expect, it } from "vitest";
import { DEMO_CANDIDATES, DEMO_ROLES } from "../demo";
import { applyAiJudgement, isAlertWorthy, provisionalCard, rankCandidatesForRole, rankRolesForCandidate } from "./engine";
import { filterPair } from "./filter";
import { groundReasons } from "./grounding";
import { scorePair } from "./score";

const NOW = new Date("2026-10-08T12:00:00Z");
const role = (id: string) => DEMO_ROLES.find((r) => r.id === id)!;
const cand = (id: string) => DEMO_CANDIDATES.find((c) => c.id === id)!;

describe("filter", () => {
  it("no longer hard-excludes on hours — a close shortfall is scored, not filtered (2026-10-13 redesign)", () => {
    // cand-busy-banker has 2 hrs available against a 4-hr role, a strong finance skill match.
    // Hours now fade the score via commitmentFit rather than excluding outright.
    expect(filterPair(role("role-youth-finance"), cand("cand-busy-banker"))).toBeNull();
  });
  it("excludes declared conflicts", () => {
    expect(filterPair(role("role-wellbeing-hr"), cand("cand-private-lawyer"))).toBe("conflict");
  });
  it("enforces must-have skills", () => {
    expect(filterPair(role("role-coast-treasurer"), cand("cand-hr-director"))).toBe("missing_must_have");
    expect(filterPair(role("role-coast-treasurer"), cand("cand-fund-accountant"))).toBeNull();
  });
  it("respects cause exclusions", () => {
    const r = { ...role("role-sports-secretary"), cause: "faith", hoursPerMonth: 1 };
    expect(filterPair(r, cand("cand-busy-banker"))).toBe("cause_excluded");
  });
});

describe("scoring", () => {
  it("ranks the senior accountant above the bookkeeper for a missing finance seat", () => {
    const ranked = rankCandidatesForRole(role("role-youth-finance"), DEMO_CANDIDATES, { now: NOW });
    const ids = ranked.map((p) => p.candidateId);
    expect(ids[0]).toBe("cand-fund-accountant");
    expect(ids.indexOf("cand-fund-accountant")).toBeLessThan(ids.indexOf("cand-bookkeeper"));
  });

  it("matches on the board's gap, not on skills the board already has", () => {
    // The wellbeing board already covers finance, so the accountant's finance skill earns no gap fit.
    const p = scorePair(role("role-wellbeing-hr"), cand("cand-fund-accountant"), NOW);
    expect(p.breakdown.gapFit).toBe(0);
    expect(p.gapMatches).toHaveLength(0);
  });

  it("gives the charity's stated first-timer preference a visible bonus", () => {
    const p = scorePair(role("role-youth-finance"), cand("cand-fund-accountant"), NOW);
    expect(p.breakdown.diversity).toBe(1);
  });

  it("does not penalise first-timers who read the guide", () => {
    const p = scorePair(role("role-youth-finance"), cand("cand-fund-accountant"), NOW);
    expect(p.breakdown.readiness).toBe(1);
  });

  it("lifts long-open roles and dampens busy candidates", () => {
    expect(scorePair(role("role-coast-treasurer"), cand("cand-fund-accountant"), NOW).breakdown.balancing).toBe(1);
    expect(scorePair(role("role-sports-secretary"), cand("cand-company-sec"), NOW).breakdown.balancing).toBe(0); // busy −1, stale +1
  });

  it("hides non-discoverable candidates from charities but still matches them to roles", () => {
    const forCharity = rankCandidatesForRole(role("role-heritage-digital"), DEMO_CANDIDATES, {
      now: NOW,
      discoverableOnly: true,
    });
    expect(forCharity.every((p) => cand(p.candidateId).discoverable)).toBe(true);
    const forLawyer = rankRolesForCandidate(cand("cand-private-lawyer"), DEMO_ROLES, { now: NOW });
    expect(forLawyer.some((p) => p.roleId === "role-sports-secretary")).toBe(true);
  });

  it("never shows a pairing with no gap match", () => {
    for (const r of DEMO_ROLES) {
      for (const p of rankCandidatesForRole(r, DEMO_CANDIDATES, { now: NOW })) {
        expect(p.gapMatches.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("explanations and grounding", () => {
  const r = role("role-youth-finance");
  const c = cand("cand-fund-accountant");
  const pair = scorePair(r, c, NOW);

  it("provisional cards carry template reasons that all resolve", () => {
    const card = provisionalCard(pair, r, c);
    expect(card.source).toBe("rules");
    expect(card.reasons.length).toBeGreaterThanOrEqual(2);
    expect(groundReasons(card.reasons, r, c)).toHaveLength(card.reasons.length);
    expect(card.reasons[0].claim).toContain("Led annual audit");
  });

  it("flags tight time as a visible consideration on a rules-only card, not silence (2026-10-13 redesign)", () => {
    const shortOnTime = { ...c, hoursPerMonth: r.hoursPerMonth - 1 };
    const shortPair = scorePair(r, shortOnTime, NOW);
    const card = provisionalCard(shortPair, r, shortOnTime);
    expect(card.considerations).toHaveLength(1);
    expect(card.considerations[0]).toContain(`${shortOnTime.hoursPerMonth} hrs/month`);
  });

  it("has no hours consideration when the candidate has enough time", () => {
    const card = provisionalCard(pair, r, c);
    expect(card.considerations).toHaveLength(0);
  });

  it("drops reasons that point at things that don't exist", () => {
    const reasons = groundReasons(
      [
        { claim: "Senior finance", ref: { kind: "candidate_skill", skill: "finance_treasury" } },
        { claim: "Invented legal skill", ref: { kind: "candidate_skill", skill: "legal" } },
        { claim: "Board has a legal gap", ref: { kind: "board_cell", skill: "legal" } }, // legal is covered
      ],
      r,
      c,
    );
    expect(reasons.map((x) => x.claim)).toEqual(["Senior finance"]);
  });

  it("hides the card when too few reasons are grounded or confidence is low", () => {
    const base = { candidateId: c.id, roleId: r.id, rank: 1, considerations: [] };
    const good = { claim: "Senior finance", ref: { kind: "candidate_skill", skill: "finance_treasury" } } as const;
    const cause = { claim: "Cares about youth", ref: { kind: "candidate_cause", cause: "children_youth" } } as const;
    const fake = { claim: "Fake", ref: { kind: "candidate_skill", skill: "legal" } } as const;

    expect(applyAiJudgement(pair, r, c, { ...base, confidence: "high", reasons: [good, fake] })).toBeNull();
    expect(applyAiJudgement(pair, r, c, { ...base, confidence: "low", reasons: [good, cause] })).toBeNull();
    const card = applyAiJudgement(pair, r, c, { ...base, confidence: "high", reasons: [good, cause, fake] });
    expect(card?.reasons).toHaveLength(2);
    expect(card?.source).toBe("ai");
  });

  it("only alerts for top-ranked, medium-or-better matches", () => {
    const card = provisionalCard(pair, r, c);
    expect(isAlertWorthy({ ...card, confidence: "high" }, 1)).toBe(true);
    expect(isAlertWorthy({ ...card, confidence: "high" }, 6)).toBe(false);
    expect(isAlertWorthy({ ...card, confidence: "low" }, 1)).toBe(false);
  });
});
