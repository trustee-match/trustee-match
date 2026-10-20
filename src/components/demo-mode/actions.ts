"use server";

import { isOperator } from "@/lib/auth/operator";
import { runFullReset, type ResetSummary } from "@/lib/jobs/reset";
import { createClient } from "@/lib/supabase/server";

// The widget used to be reachable by anyone behind the shared demo password, no sign-in
// at all — now operator-only (planning/responsible-design-decisions.md, Security), same
// as /profiles and /operator. amIOperator lets the widget (a client component rendered
// on every page via the root layout) decide whether to render itself at all, without
// making the whole layout session-dependent. resetDemoData re-checks independently —
// never trust that the UI was correctly hidden; the real gate is always server-side.

export async function amIOperator(): Promise<boolean> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return false;
  return isOperator(session, user.id);
}

export async function resetDemoData(): Promise<ResetSummary> {
  if (!(await amIOperator())) {
    return { usersDeleted: 0, orgsDeleted: 0, orgsSeeded: 0, candidatesSeeded: 0, errors: ["Not an operator."] };
  }
  return runFullReset();
}
