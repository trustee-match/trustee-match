import { describe, expect, it } from "vitest";
import { inQuietHours, nextAlertTime } from "./alerts";
import { dueInterestAction, dueMatchAction } from "./lifecycle";

describe("alert throttling", () => {
  it("sends immediately in the daytime with no recent alert", () => {
    const now = new Date("2026-10-08T12:00:00Z"); // 13:00 BST
    expect(nextAlertTime(now, null)).toEqual(now);
  });

  it("holds alerts during quiet hours until 08:00 Guernsey time (BST)", () => {
    const now = new Date("2026-10-08T21:30:00Z"); // 22:30 BST
    expect(inQuietHours(now)).toBe(true);
    expect(nextAlertTime(now, null).toISOString()).toBe("2026-10-09T07:00:00.000Z"); // 08:00 BST
  });

  it("uses GMT after the clocks go back", () => {
    const now = new Date("2026-11-10T23:00:00Z"); // 23:00 GMT
    expect(nextAlertTime(now, null).toISOString()).toBe("2026-11-11T08:00:00.000Z");
  });

  it("allows at most one instant alert per 24 hours", () => {
    const last = new Date("2026-10-08T10:00:00Z");
    const now = new Date("2026-10-08T15:00:00Z");
    expect(nextAlertTime(now, last).toISOString()).toBe("2026-10-09T10:00:00.000Z");
  });
});

describe("lifecycle timers", () => {
  const at = (iso: string) => new Date(iso);

  it("nudges an open interest on day 5 and expires it on day 10", () => {
    const i = { createdAt: "2026-10-01T09:00:00Z", nudgedAt: null };
    expect(dueInterestAction(i, at("2026-10-03T09:00:00Z"))).toBeNull();
    expect(dueInterestAction(i, at("2026-10-06T09:00:00Z"))).toBe("nudge");
    expect(dueInterestAction({ ...i, nudgedAt: "2026-10-06T09:00:00Z" }, at("2026-10-07T09:00:00Z"))).toBeNull();
    expect(dueInterestAction(i, at("2026-10-11T09:00:00Z"))).toBe("expire");
  });

  it("asks 'did you meet?' on day 7, nudges once, closes on day 21", () => {
    const m = {
      introducedAt: "2026-10-01T09:00:00Z",
      stage: "introduced" as const,
      didYouMeetSentAt: null,
      noContactNudgedAt: null,
      outcomeAskedAt: null,
    };
    expect(dueMatchAction(m, at("2026-10-05T09:00:00Z"))).toBeNull();
    expect(dueMatchAction(m, at("2026-10-08T09:00:00Z"))).toBe("ask_did_you_meet");
    const asked = { ...m, didYouMeetSentAt: "2026-10-08T09:00:00Z" };
    expect(dueMatchAction(asked, at("2026-10-12T09:00:00Z"))).toBe("nudge_no_contact");
    expect(dueMatchAction({ ...asked, noContactNudgedAt: "2026-10-12T09:00:00Z" }, at("2026-10-15T09:00:00Z"))).toBeNull();
    expect(dueMatchAction(asked, at("2026-10-23T09:00:00Z"))).toBe("close_no_contact");
  });

  it("asks for the outcome 30 days after introduction once they've met", () => {
    const m = {
      introducedAt: "2026-10-01T09:00:00Z",
      stage: "met" as const,
      didYouMeetSentAt: "2026-10-08T09:00:00Z",
      noContactNudgedAt: null,
      outcomeAskedAt: null,
    };
    expect(dueMatchAction(m, at("2026-10-20T09:00:00Z"))).toBeNull();
    expect(dueMatchAction(m, at("2026-11-01T09:00:00Z"))).toBe("ask_outcome");
  });
});
