import { NextResponse } from "next/server";
import { runMatchJob } from "@/lib/jobs/match";
import { dueInterestAction, dueMatchAction } from "@/lib/matching/lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";

// Runs every 5 minutes (Supabase pg_cron or a hosted cron). It owns every timer in the
// lifecycle so no step ever waits on a person: job retries, interest nudges/expiry,
// post-match follow-ups and alert dispatch.

export const maxDuration = 300;

const MAX_JOB_ATTEMPTS = 3;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const db = createAdminClient();
  const now = new Date();
  const summary = { jobsRetried: 0, interestsNudged: 0, interestsExpired: 0, matchActions: 0, alertsSent: 0 };

  // 1. Retry match jobs that failed or stalled.
  const stalledBefore = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const { data: jobs } = await db
    .from("match_jobs")
    .select("id, subject_type, subject_id, status, attempts, created_at")
    .in("status", ["failed", "running", "queued"])
    .lt("created_at", stalledBefore)
    .lt("attempts", MAX_JOB_ATTEMPTS)
    .limit(20);
  for (const job of jobs ?? []) {
    await runMatchJob(job.id, { type: job.subject_type, id: job.subject_id });
    summary.jobsRetried++;
  }

  // 2. Interest timers: nudge on day 5, expire on day 10 (freeing capacity).
  const { data: interests } = await db
    .from("interests")
    .select("id, created_at, nudged_at, side, candidate_id, role_id, card_id")
    .eq("status", "open")
    .eq("action", "interested");
  for (const i of interests ?? []) {
    const action = dueInterestAction({ createdAt: i.created_at, nudgedAt: i.nudged_at }, now);
    if (action === "expire") {
      await db.from("interests").update({ status: "expired" }).eq("id", i.id);
      summary.interestsExpired++;
    } else if (action === "nudge") {
      await db.from("interests").update({ nudged_at: now.toISOString() }).eq("id", i.id);
      // Nudge goes to the side that hasn't answered yet.
      const recipientSide = i.side === "candidate" ? "charity" : "candidate";
      await db.from("alerts").insert({
        recipient_id: recipientSide === "candidate" ? i.candidate_id : await boardContactFor(db, i.role_id),
        card_id: i.card_id,
        kind: "nudge_reply",
      });
      summary.interestsNudged++;
    }
  }

  // 3. Post-introduction follow-ups.
  const { data: matches } = await db
    .from("matches")
    .select("id, stage, introduced_at, did_you_meet_sent_at, no_contact_nudged_at, outcome_asked_at, candidate_id, role_id")
    .in("stage", ["introduced", "met"]);
  for (const m of matches ?? []) {
    const action = dueMatchAction(
      {
        introducedAt: m.introduced_at,
        stage: m.stage,
        didYouMeetSentAt: m.did_you_meet_sent_at,
        noContactNudgedAt: m.no_contact_nudged_at,
        outcomeAskedAt: m.outcome_asked_at,
      },
      now,
    );
    if (!action) continue;
    const stamp = now.toISOString();
    const update =
      action === "ask_did_you_meet" ? { did_you_meet_sent_at: stamp }
      : action === "nudge_no_contact" ? { no_contact_nudged_at: stamp }
      : action === "ask_outcome" ? { outcome_asked_at: stamp }
      : { stage: "no_contact" };
    await db.from("matches").update(update).eq("id", m.id);
    if (action !== "close_no_contact") {
      const charity = await boardContactFor(db, m.role_id);
      await db.from("alerts").insert([
        { recipient_id: m.candidate_id, kind: action },
        ...(charity ? [{ recipient_id: charity, kind: action }] : []),
      ]);
    }
    summary.matchActions++;
  }

  // 4. Dispatch due alerts, merging multiple queued alerts per recipient into one email.
  const { data: due } = await db
    .from("alerts")
    .select("id, recipient_id, kind")
    .eq("status", "queued")
    .lte("send_after", now.toISOString())
    .limit(200);
  const byRecipient = Map.groupBy(due ?? [], (a) => a.recipient_id);
  for (const [recipientId, alerts] of byRecipient) {
    const { data: user } = await db.auth.admin.getUserById(recipientId);
    const email = user?.user?.email;
    if (!email) continue;
    // TODO: per-kind templates with deep links to the card (new_match, nudge_reply, ask_did_you_meet, ...).
    await sendEmail({
      to: email,
      subject: alerts.some((a) => a.kind === "new_match") ? "A board needs your skills" : "Trustee Match: an update for you",
      text: `You have ${alerts.length} update(s) waiting on Trustee Match.`,
    });
    const [first, ...rest] = alerts;
    await db.from("alerts").update({ status: "sent", sent_at: now.toISOString() }).eq("id", first.id);
    if (rest.length) await db.from("alerts").update({ status: "merged" }).in("id", rest.map((a) => a.id));
    await db.from("candidates").update({ last_alert_at: now.toISOString() }).eq("id", recipientId);
    summary.alertsSent++;
  }

  return NextResponse.json(summary);
}

async function boardContactFor(db: ReturnType<typeof createAdminClient>, roleId: string): Promise<string | null> {
  const { data } = await db.from("roles").select("organisation_id").eq("id", roleId).single();
  if (!data) return null;
  const { data: member } = await db.from("org_members").select("user_id").eq("organisation_id", data.organisation_id).limit(1).single();
  return member?.user_id ?? null;
}
