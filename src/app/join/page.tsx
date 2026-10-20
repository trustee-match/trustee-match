import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOwnProfileForEdit } from "./actions";
import { JoinFlow } from "./join-flow";

export const metadata = { title: "Become a trustee · Trustee Match" };
// Entirely session-dependent content — no sensible static shell to prerender under Cache
// Components (next.config.ts). Without this, Next's prerender analysis trips on dynamic
// reads (cookies, and transitively Date.now() inside the Supabase SDK's session checks)
// even though they're correctly inside the Suspense boundary below — see the
// "blocking-prerender-current-time" error this fixes.
export const instant = false;

// Real sign-in gate (issues #8/#12/#13): no session → off to /sign-in first. Session +
// an already-confirmed profile → straight to their own matches, the "my matches"
// dashboard the design notes called for (src/app/join/candidate/[candidateId]/page.tsx
// is already that page) — unless `?edit=1` (the candidate page's "Edit your profile"
// link), in which case the same CV-upload/review form is shown again, pre-filled with
// their existing data (getOwnProfileForEdit) and landing straight on the review step.
// Session + no confirmed profile yet → the CV/LinkedIn import and review flow below,
// same as always, just no longer asking for a name/email with no way to verify either.
//
// The dynamic API access (cookies, via createClient) has to happen inside this inner
// Suspense-wrapped component, not the page's top-level export — this project runs with
// Cache Components on (next.config.ts), which errors ("blocking-prerender-runtime" /
// "blocking-prerender-current-time") if a dynamic read happens outside a Suspense
// boundary. Same pattern as join/candidate/[candidateId]/page.tsx.
async function Gate({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  // instant=false (above) wasn't enough on its own to stop Cache Components' background
  // prerender-shell analysis from occasionally tripping over Date.now() inside the
  // Supabase SDK's session check — confirmed live on join/candidate/[candidateId], same
  // pattern here. connection() never resolves during that analysis, only at real request
  // time, so everything after it is unambiguously out of the prerender path.
  await connection();
  const { edit } = await searchParams;
  const wantsEdit = edit === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(wantsEdit ? "/join?edit=1" : "/join")}`);

  const { data: candidate } = await supabase.from("candidates").select("id").eq("id", user.id).not("confirmed_at", "is", null).maybeSingle();

  if (candidate && wantsEdit) {
    const result = await getOwnProfileForEdit();
    if (result.ok) return <JoinFlow email={user.email ?? ""} initialProfile={result.profile} />;
    // Fell through (shouldn't normally happen — candidate row exists but the edit read
    // failed) — fall back to a fresh intro rather than a dead end.
  } else if (candidate) {
    redirect(`/join/candidate/${user.id}`);
  }

  return <JoinFlow email={user.email ?? ""} />;
}

export default function JoinPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <Gate searchParams={searchParams} />
    </Suspense>
  );
}
