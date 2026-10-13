import { causeLabel, MATCHING, skillLabel, type MatchingConfig } from "../config";
import { filterPair } from "./filter";
import { scorePair } from "./score";
import type { Candidate, FilterReason, Role } from "./types";

// When a candidate or a role gets zero cards, silence looks identical to "broken" or
// "ignored". This diagnoses *why* — the single most common blocking reason across
// currently open roles/candidates — and produces an honest, specific message rather
// than a generic "no matches". Every number in the message is a real count or a real
// stat over live data, never an invented explanation.

export type NoMatchReason = FilterReason | "no_skill_overlap" | "tight_time";

export interface NoMatchDiagnosis {
  totalOpen: number;
  /** Count of open roles/candidates each filter reason was the first (binding) blocker for. */
  reasonCounts: Partial<Record<FilterReason, number>>;
  /** Passed every hard filter but had no board_skills cell to resolve against, so never
   *  produced a gapMatch — the engine's other gate (see engine.ts) for showing a card. */
  noSkillOverlapCount: number;
  /** Passed filtering with a real skill-gap overlap, but scored below the show
   *  threshold with less time offered than the role asks for — hours are no longer a
   *  hard filter (see commitmentFit in score.ts), so a real shortfall now shows up here
   *  as a likely contributing factor, not a guaranteed sole cause: other components
   *  (cause fit, readiness) may also be dragging the score down. */
  tightTimeCount: number;
  dominantReason: NoMatchReason | null;
  /** Hours stat for whichever side was short — role requirements for a candidate
   *  diagnosis, candidate availability for a role one. Callers pick `min`/`median`/`max`
   *  to fit their own phrasing. */
  hoursStats?: { min: number; median: number; max: number };
  missingSkills?: string[];
  excludedCauses?: string[];
  message: string;
}

function hoursSummary(nums: number[]): { min: number; median: number; max: number } {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { min: sorted[0], median, max: sorted[sorted.length - 1] };
}

function rankReasons(
  reasonCounts: Partial<Record<FilterReason, number>>,
  noSkillOverlapCount: number,
  tightTimeCount: number,
): NoMatchReason | null {
  const counts: [NoMatchReason, number][] = [
    ...(Object.entries(reasonCounts) as [FilterReason, number][]),
    ...(noSkillOverlapCount > 0 ? ([["no_skill_overlap", noSkillOverlapCount]] as [NoMatchReason, number][]) : []),
    ...(tightTimeCount > 0 ? ([["tight_time", tightTimeCount]] as [NoMatchReason, number][]) : []),
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]?.[0] ?? null;
}

/** Candidate's side: "Boards that need you" came back empty — why, across today's open roles? */
export function diagnoseNoMatchForCandidate(
  candidate: Candidate,
  roles: Role[],
  now = new Date(),
  cfg: MatchingConfig = MATCHING,
): NoMatchDiagnosis {
  const open = roles.filter((r) => !r.paused);
  const reasonCounts: Partial<Record<FilterReason, number>> = {};
  const hoursShortfall: number[] = [];
  const mustHaveMisses: string[] = [];
  const causeBlocked = new Set<string>();
  let noSkillOverlap = 0;
  let tightTime = 0;

  for (const role of open) {
    const reason = filterPair(role, candidate);
    if (reason) {
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
      if (reason === "missing_must_have") {
        const has = new Set(candidate.skills.map((s) => s.skill));
        for (const skill of role.mustHaveSkills) if (!has.has(skill)) mustHaveMisses.push(skill);
      }
      if (reason === "cause_excluded") causeBlocked.add(role.cause);
      continue;
    }
    const pair = scorePair(role, candidate, now, cfg);
    if (pair.gapMatches.length === 0) {
      noSkillOverlap++;
    } else if (pair.score < cfg.thresholds.min_score_to_show && candidate.hoursPerMonth < role.hoursPerMonth) {
      tightTime++;
      hoursShortfall.push(role.hoursPerMonth);
    }
  }

  const dominantReason = rankReasons(reasonCounts, noSkillOverlap, tightTime);
  const diagnosis: NoMatchDiagnosis = {
    totalOpen: open.length,
    reasonCounts,
    noSkillOverlapCount: noSkillOverlap,
    tightTimeCount: tightTime,
    dominantReason,
    message: "",
  };

  if (hoursShortfall.length) diagnosis.hoursStats = hoursSummary(hoursShortfall);
  if (mustHaveMisses.length) diagnosis.missingSkills = tally(mustHaveMisses);
  if (causeBlocked.size) diagnosis.excludedCauses = [...causeBlocked];

  diagnosis.message = candidateMessage(diagnosis);
  return diagnosis;
}

/** Charity's side: "Suggested trustees" came back empty — why, across today's registered candidates? */
export function diagnoseNoMatchForRole(
  role: Role,
  candidates: Candidate[],
  now = new Date(),
  cfg: MatchingConfig = MATCHING,
): NoMatchDiagnosis {
  const open = candidates.filter((c) => !c.paused);
  const reasonCounts: Partial<Record<FilterReason, number>> = {};
  const hoursShortfall: number[] = [];
  let noSkillOverlap = 0;
  let tightTime = 0;

  for (const candidate of open) {
    const reason = filterPair(role, candidate);
    if (reason) {
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
      continue;
    }
    const pair = scorePair(role, candidate, now, cfg);
    if (pair.gapMatches.length === 0) {
      noSkillOverlap++;
    } else if (pair.score < cfg.thresholds.min_score_to_show && candidate.hoursPerMonth < role.hoursPerMonth) {
      tightTime++;
      hoursShortfall.push(candidate.hoursPerMonth);
    }
  }

  const dominantReason = rankReasons(reasonCounts, noSkillOverlap, tightTime);
  const diagnosis: NoMatchDiagnosis = {
    totalOpen: open.length,
    reasonCounts,
    noSkillOverlapCount: noSkillOverlap,
    tightTimeCount: tightTime,
    dominantReason,
    message: "",
  };

  if (hoursShortfall.length) diagnosis.hoursStats = hoursSummary(hoursShortfall);
  if (reasonCounts.missing_must_have) diagnosis.missingSkills = role.mustHaveSkills;

  diagnosis.message = roleMessage(diagnosis, role);
  return diagnosis;
}

function tally(items: string[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([item]) => item);
}

function candidateMessage(d: NoMatchDiagnosis): string {
  if (d.totalOpen === 0) return "There aren't any open roles right now — check back soon, or we'll email you the moment one is published.";
  switch (d.dominantReason) {
    case "tight_time": {
      const { min, median } = d.hoursStats!;
      return `We couldn't find any strong matches today. A few roles are close to your skills and interests, but need more time than you've said you can give — the lowest of those asks for ${min} hours a month, and most ask for around ${median}. They're not hard-excluded, so a close one may still turn up as your availability or their role details change — but none scored highly enough to show today.`;
    }
    case "missing_must_have": {
      const skills = (d.missingSkills ?? []).slice(0, 3).map(skillLabel).join(", ");
      return `We couldn't find any matches today. The roles that might otherwise have suited you all need a specific skill as a must-have — most commonly ${skills} — that isn't on your profile yet. If that's experience you do have, it's worth adding it.`;
    }
    case "cause_excluded": {
      const causes = (d.excludedCauses ?? []).map(causeLabel).join(", ");
      return `We couldn't find any matches today. The open roles right now are all in a cause area you've asked not to be matched with (${causes}). You can update that preference if it's changed.`;
    }
    case "conflict":
      return "We couldn't find any matches today. The open roles right now are ones you've told us you have a conflict with. Check your declared conflicts if that's no longer accurate.";
    case "already_active_with_org":
      return "We couldn't find any matches today. The open roles right now are all with organisations you already have an active match or appointment with.";
    case "candidate_paused":
      return "Your profile is currently paused, so you won't see new matches. Unpause it when you're ready.";
    case "no_skill_overlap":
      return "We couldn't find any matches today. You're eligible for the open roles based on your availability and interests, but none currently have a skills gap that overlaps your profile — that's not a reflection of your experience, it just means today's roles don't happen to need it right now.";
    default:
      return "We couldn't find any matches today. Check back soon — new roles are added regularly.";
  }
}

function roleMessage(d: NoMatchDiagnosis, role: Role): string {
  if (d.totalOpen === 0) return "No candidates are registered yet — we'll alert you the moment someone with these skills joins.";
  switch (d.dominantReason) {
    case "tight_time": {
      const { median, max } = d.hoursStats!;
      return `A few registered candidates are close on skills but offer less time than this role asks for — the most available among them has ${max} hours a month (most have around ${median}); this role asks for ${role.hoursPerMonth}. They're not excluded outright, so may still surface as a weaker match — consider whether the time commitment could flex if you'd like to see more of them.`;
    }
    case "missing_must_have": {
      const skills = (d.missingSkills ?? []).map(skillLabel).join(" and ");
      return `No one currently registered has ${skills} on their profile, which this role marks as a must-have. Consider whether it could be a "nice to have" instead so more candidates are considered.`;
    }
    case "cause_excluded":
      return `Some registered candidates have excluded this cause area from their matches, which is reducing your pool. Nothing to action — this is their choice.`;
    case "conflict":
      return "The candidates this role might otherwise suit have a declared conflict with your organisation.";
    case "no_skill_overlap":
      return "Candidates are eligible for this role based on their availability, but none currently have a skill that matches your board's stated gap. We'll alert you as soon as someone does.";
    default:
      return "We'll alert you the moment someone with these skills joins.";
  }
}
