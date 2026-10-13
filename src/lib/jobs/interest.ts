import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROLE_SELECT, toRole, type RoleRow } from "../db/mappers";
import { sendEmail } from "../email/send";

// Records a side's interest in a card, and — the step nothing in the codebase built
// yet — detects a mutual match and creates the introduction (design doc §5.3, §6).
// Shared by the candidate side (src/app/join) and the charity side (src/app/charity)
// so "both sides said yes" is detected the same way regardless of who said yes second.

export type Side = "candidate" | "charity";
export type InterestAction = "interested" | "pass";

export interface RecordInterestInput {
  cardId: string;
  roleId: string;
  candidateId: string;
  side: Side;
  action: InterestAction;
  actedBy: string;
}

export interface RecordInterestResult {
  interest: InterestAction;
  status: "open" | "matched";
  matched: boolean;
}

export async function recordInterest(db: SupabaseClient, input: RecordInterestInput): Promise<RecordInterestResult> {
  const { error } = await db
    .from("interests")
    .upsert(
      { card_id: input.cardId, role_id: input.roleId, candidate_id: input.candidateId, side: input.side, action: input.action, status: "open", acted_by: input.actedBy },
      { onConflict: "card_id,side" },
    );
  if (error) throw new Error(`interest upsert failed: ${error.message}`);

  if (input.action !== "interested") return { interest: input.action, status: "open", matched: false };

  const otherSide: Side = input.side === "candidate" ? "charity" : "candidate";
  const { data: other } = await db
    .from("interests")
    .select("id")
    .eq("card_id", input.cardId)
    .eq("side", otherSide)
    .eq("action", "interested")
    .eq("status", "open")
    .maybeSingle();
  if (!other) return { interest: "interested", status: "open", matched: false };

  await createIntroduction(db, input.roleId, input.candidateId, input.cardId);
  return { interest: "interested", status: "matched", matched: true };
}

/** Clears a side's interest. Refuses once matched — an introduction already happened,
 *  so there's nothing to "un-invite". */
export async function clearInterest(db: SupabaseClient, cardId: string, side: Side): Promise<{ ok: boolean; status?: "matched" }> {
  const { data: existing } = await db.from("interests").select("status").eq("card_id", cardId).eq("side", side).maybeSingle();
  if (existing?.status === "matched") return { ok: false, status: "matched" };
  const { error } = await db.from("interests").delete().eq("card_id", cardId).eq("side", side);
  if (error) throw new Error(`interest delete failed: ${error.message}`);
  return { ok: true };
}

async function createIntroduction(db: SupabaseClient, roleId: string, candidateId: string, cardId: string): Promise<void> {
  // Guard against double-creation if this races with a cron sweep or a double click.
  const { data: already } = await db.from("matches").select("id").eq("role_id", roleId).eq("candidate_id", candidateId).maybeSingle();
  if (already) {
    await db.from("interests").update({ status: "matched" }).eq("card_id", cardId).in("side", ["candidate", "charity"]);
    return;
  }

  const { data: roleRow } = await db.from("roles").select(ROLE_SELECT).eq("id", roleId).single();
  const role = toRole(roleRow as unknown as RoleRow);

  const { data: candUser } = await db.auth.admin.getUserById(candidateId);
  const candidateEmail = candUser?.user?.email ?? null;
  const candidateName = (candUser?.user?.user_metadata?.display_name as string | undefined) ?? "the candidate";

  const { data: orgMembers } = await db.from("org_members").select("user_id").eq("organisation_id", role.organisationId).limit(1);
  let charityEmail: string | null = null;
  if (orgMembers && orgMembers.length > 0) {
    const { data: charityUser } = await db.auth.admin.getUserById(orgMembers[0].user_id);
    charityEmail = charityUser?.user?.email ?? null;
  }

  const recipients = [candidateEmail, charityEmail].filter((e): e is string => Boolean(e));
  let introEmailId: string | null = null;
  if (recipients.length > 0) {
    introEmailId = await sendEmail({
      to: recipients,
      subject: `You've matched: ${role.title} at ${role.organisationName}`,
      text: `${candidateName} and ${role.organisationName} have both said yes to ${role.title}. Most people start with a 30-minute coffee — over to you both to arrange.`,
    });
  }

  const { error: insertErr } = await db.from("matches").insert({
    role_id: roleId,
    candidate_id: candidateId,
    stage: "introduced",
    intro_email_id: introEmailId,
  });
  if (insertErr && !insertErr.message.includes("duplicate")) throw new Error(`match insert failed: ${insertErr.message}`);

  await db.from("interests").update({ status: "matched" }).eq("card_id", cardId).in("side", ["candidate", "charity"]);
}
