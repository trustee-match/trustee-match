import { MATCHING, type MatchingConfig } from "../config";

const HOUR_MS = 60 * 60 * 1000;
const STEP_MS = 15 * 60 * 1000;

function localMinutes(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function inQuietHours(d: Date, cfg: MatchingConfig = MATCHING): boolean {
  const t = localMinutes(d, cfg.alerts.timezone);
  const start = toMinutes(cfg.alerts.quiet_hours_start);
  const end = toMinutes(cfg.alerts.quiet_hours_end);
  return start > end ? t >= start || t < end : t >= start && t < end;
}

/**
 * When may the next instant alert go to this recipient? Respects the per-24h cap and
 * quiet hours (in local Guernsey time, DST-safe by stepping rather than doing tz maths).
 * Alerts that land before this time are merged into the one that goes out.
 */
export function nextAlertTime(now: Date, lastSentAt: Date | null, cfg: MatchingConfig = MATCHING): Date {
  let t = now;
  if (lastSentAt) {
    const earliest = new Date(lastSentAt.getTime() + (24 / cfg.alerts.max_instant_per_24h) * HOUR_MS);
    if (earliest > t) t = earliest;
  }
  // Step forward to the first moment outside quiet hours (≤ 11h of 15-min steps).
  for (let i = 0; i < 96 && inQuietHours(t, cfg); i++) {
    t = new Date(Math.ceil((t.getTime() + 1) / STEP_MS) * STEP_MS);
  }
  return t;
}
