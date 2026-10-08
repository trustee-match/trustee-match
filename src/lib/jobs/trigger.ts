import "server-only";
import { after } from "next/server";
import { createAdminClient } from "../supabase/admin";
import { matchCandidateAi, matchCandidateRules, matchRoleAi, matchRoleRules } from "./match";

/**
 * Call from the publish-role / confirm-profile server actions. Rules-based cards are
 * written before this returns (so the next page shows matches immediately); the AI step
 * runs after the response via after(). The job row lets the cron sweep retry failures.
 */
export async function triggerMatch(
  subject: { type: "role" | "candidate"; id: string },
  trigger: "role_published" | "profile_confirmed" | "edit",
) {
  const db = createAdminClient();
  const { data: job } = await db
    .from("match_jobs")
    .insert({ trigger, subject_type: subject.type, subject_id: subject.id, status: "running" })
    .select("id")
    .single();

  const finish = async (status: "done" | "failed", error?: unknown) => {
    if (!job) return;
    await db
      .from("match_jobs")
      .update({
        status,
        done_at: status === "done" ? new Date().toISOString() : null,
        last_error: error instanceof Error ? error.message : null,
      })
      .eq("id", job.id);
  };

  try {
    if (subject.type === "role") {
      const r = await matchRoleRules(db, subject.id);
      after(async () => {
        try {
          if (r) await matchRoleAi(db, r.role, r.shortlist);
          await finish("done");
        } catch (e) {
          await finish("failed", e);
        }
      });
    } else {
      const r = await matchCandidateRules(db, subject.id);
      after(async () => {
        try {
          if (r) await matchCandidateAi(db, r.candidate, r.top);
          await finish("done");
        } catch (e) {
          await finish("failed", e);
        }
      });
    }
  } catch (e) {
    await finish("failed", e);
  }
}
