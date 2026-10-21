"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Real sign-in: Supabase email magic-link. Replaces the admin-API "shadow user created
// from a typed email, no credential check" pattern (src/lib/auth/shadow-user.ts) that
// /join and /charity used to write real user data with — see
// planning/responsible-design-decisions.md, Security, issues #8/#12/#13.
//
// docs/matching-design.md §3.2 names LinkedIn OIDC as the primary candidate sign-in path
// with magic-link as the fallback, and research-and-plan.md:90 names magic-link as the
// default for charity contacts. LinkedIn OIDC needs an external LinkedIn Developer App
// Jon would have to create — out of scope here; magic-link covers both sides.

export type SendLinkResult = { ok: true } | { ok: false; error: string };

export async function sendSignInLink(email: string, next?: string): Promise<SendLinkResult> {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: "Enter your email address." };

  const supabase = await createClient();
  const h = await headers();
  // Server actions invoked from the browser carry an Origin header — this is how the
  // callback URL is correct for both localhost:3001 and whatever the Demo/Production
  // deploy's real origin is, without a hardcoded site-URL env var.
  const origin = h.get("origin");
  if (!origin) return { ok: false, error: "Could not determine the site address — try again, or reload the page first." };

  const emailRedirectTo = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const { error } = await supabase.auth.signInWithOtp({ email: trimmed, options: { emailRedirectTo } });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface AuthStatus {
  signedIn: boolean;
  email: string | null;
  hasConfirmedProfile: boolean;
}

/** One consolidated session check for the nav (src/components/nav-auth.tsx) — label
 *  ("Become a trustee" vs "See your matches"), whether to show a sign-out control, and
 *  who it's signing out. Checked client-side on mount, same reasoning as
 *  DemoModeWidget's amIOperator(): keeps the root layout itself session-independent
 *  under Cache Components (next.config.ts) rather than making every page dynamic. */
export async function getAuthStatus(): Promise<AuthStatus> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { signedIn: false, email: null, hasConfirmedProfile: false };

  const { data } = await session.from("candidates").select("id").eq("id", user.id).not("confirmed_at", "is", null).maybeSingle();
  return { signedIn: true, email: user.email ?? null, hasConfirmedProfile: Boolean(data) };
}

export async function signOut(): Promise<void> {
  const session = await createClient();
  await session.auth.signOut();
}
