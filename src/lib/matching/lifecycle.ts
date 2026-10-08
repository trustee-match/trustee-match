import { MATCHING, type MatchingConfig } from "../config";

// Pure timer rules for the automatic lifecycle (design doc §6). The cron job loads
// open interests and matches, asks these functions what's due, and performs it.

const DAY_MS = 24 * 60 * 60 * 1000;
const daysSince = (from: string, now: Date) => (now.getTime() - new Date(from).getTime()) / DAY_MS;

export interface OpenInterest {
  createdAt: string;
  nudgedAt: string | null;
}

export type InterestAction = "expire" | "nudge" | null;

export function dueInterestAction(i: OpenInterest, now: Date, cfg: MatchingConfig = MATCHING): InterestAction {
  const age = daysSince(i.createdAt, now);
  if (age >= cfg.timers.interest_expiry_days) return "expire";
  if (age >= cfg.timers.interest_nudge_day && !i.nudgedAt) return "nudge";
  return null;
}

export interface IntroducedMatch {
  introducedAt: string;
  stage: "introduced" | "met" | "appointed" | "not_proceeding" | "no_contact";
  didYouMeetSentAt: string | null;
  noContactNudgedAt: string | null;
  outcomeAskedAt: string | null;
}

export type MatchAction = "ask_did_you_meet" | "nudge_no_contact" | "close_no_contact" | "ask_outcome" | null;

export function dueMatchAction(m: IntroducedMatch, now: Date, cfg: MatchingConfig = MATCHING): MatchAction {
  const age = daysSince(m.introducedAt, now);
  const t = cfg.timers;
  if (m.stage === "introduced") {
    if (age >= t.no_contact_close_day && m.didYouMeetSentAt) return "close_no_contact";
    if (age >= t.did_you_meet_day && !m.didYouMeetSentAt) return "ask_did_you_meet";
    // A "no" (or no answer) to did-you-meet earns exactly one nudge, a few days later.
    if (m.didYouMeetSentAt && !m.noContactNudgedAt && daysSince(m.didYouMeetSentAt, now) >= 3) return "nudge_no_contact";
    return null;
  }
  if (m.stage === "met" && age >= t.outcome_day && !m.outcomeAskedAt) return "ask_outcome";
  return null;
}
