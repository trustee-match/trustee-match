import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// "Operator" (profiles.kind = 'operator') is a real, permanent role already designed
// into the schema on day 1 (is_operator() in supabase/migrations/20261008000000_init.sql,
// used by profiles_self_read and the invite-reports/flags policies) — not demo
// scaffolding. It's the deliberate replacement for the old "anyone behind the shared
// password can impersonate any seeded persona via a raw link" pattern
// (planning/demo-scaffolding.md), scoped to specific, real, signed-in people Jon has
// personally promoted — see planning/responsible-design-decisions.md for the full
// reasoning on why this is locked down the way it is.
//
// profiles_self_insert's own RLS check (`kind <> 'operator'`) already makes it impossible
// to self-promote through the normal profile-upsert path (src/lib/auth/shadow-user.ts) —
// the only ways to become an operator are the one-time direct-DB bootstrap for the first
// operator, or promoteToOperator (src/app/operator/actions.ts), which itself requires the
// caller to already be an operator.

/** Uses the session-aware (RLS-respecting) client — profiles_self_read already lets a
 *  user read their own profile regardless of kind, so no admin client needed here. */
export async function isOperator(session: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await session.from("profiles").select("kind").eq("id", userId).maybeSingle();
  return data?.kind === "operator";
}
