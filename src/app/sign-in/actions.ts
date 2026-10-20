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
