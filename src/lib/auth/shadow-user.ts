import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Two real callers now, both legitimate for the same underlying reason — creating the
// account grants nobody any access on its own, it's just a row that becomes real identity
// only once that email's owner actually proves it via a genuine magic-link sign-in:
//  - src/lib/jobs/reset.ts — seeds the 14 candidate personas and 8 pilot org contacts
//    deterministically (a reset shouldn't require 22 real inboxes to click magic links).
//    Fine precisely because nothing in Local/Demo is a real person
//    (planning/demo-scaffolding.md).
//  - src/app/operator/actions.ts's promoteToOperator — pre-seeding a real operator by
//    email before they've signed in yet (Jon, 2026-10-20). Fine for the same reason
//    seeding is: this creates a dormant account, not access.
// The real /join and /charity flows stopped using this once real sign-in (src/app/sign-in)
// landed — see planning/responsible-design-decisions.md, Security, issues #8/#12/#13.
// Never acceptable as a stand-in for granting someone access directly.

/** Finds or creates an auth user for `email`, independent of what kind of profile (if
 *  any) it ends up attached to. */
export async function findOrCreateAuthUser(db: SupabaseClient, email: string, displayName: string): Promise<string> {
  const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { display_name: displayName } });
  if (!error && created.user) return created.user.id;

  const { data: list, error: listError } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw new Error(listError.message);
  const found = list.users.find((u) => u.email === email);
  if (found) return found.id;
  throw new Error(error?.message ?? `Could not create or find a test user for ${email}`);
}

export type ProfileKind = "candidate" | "board_contact" | "operator";

/** Upserts a profile's display name, but never flips an existing profile's `kind` once
 *  set. The same real person could plausibly be both a trustee candidate and a charity's
 *  named contact — one profile row, two roles in the app — so creating/updating the
 *  second role must not silently relabel (and, via any future kind-gated logic, break)
 *  the first. Only a brand-new profile gets `kind` set at all. */
export async function upsertProfileWithoutDowngrading(db: SupabaseClient, userId: string, kind: ProfileKind, displayName: string): Promise<void> {
  const { data: existing } = await db.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) {
    const { error } = await db.from("profiles").update({ display_name: displayName }).eq("id", userId);
    if (error) throw new Error(`profiles update failed: ${error.message}`);
    return;
  }
  const { error } = await db.from("profiles").insert({ id: userId, kind, display_name: displayName });
  if (error) throw new Error(`profiles insert failed: ${error.message}`);
}
