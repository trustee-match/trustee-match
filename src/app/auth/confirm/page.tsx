"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Intermediate "click to continue" page for the magic-link email — see
// planning/responsible-design-decisions.md (Security) for the full incident this
// fixes. Corporate mail security (Microsoft Defender's Safe Links, confirmed on the
// AGC's charity.org.gg domain, but common on any Microsoft 365 or similar mail
// gateway) prefetches every URL in an incoming email to scan it, which — for a
// one-time-use auth link — silently consumes the token before the real recipient
// ever clicks, producing a "link has expired or was already used" error within
// seconds of the email arriving. Supabase's own docs name this exact failure mode
// and recommend exactly this fix: https://supabase.com/docs/guides/auth/auth-email-templates#email-prefetching
//
// The real Supabase verification URL arrives here as an inert query parameter, not a
// link anyone's mail scanner would follow on its own — only an actual click below
// navigates to it and consumes the one-time token. This page itself does nothing
// else: no session logic, no redirect-on-load, genuinely inert until clicked.
//
// Requires the Supabase email template's magic-link button to be changed to point
// here first — see planning/operations.md for the exact template to paste in.

function ConfirmInner() {
  const searchParams = useSearchParams();
  const confirmationUrl = searchParams.get("confirmation_url");

  if (!confirmationUrl) {
    return (
      <div className="mx-auto max-w-sm space-y-3 pt-16 text-center">
        <h1 className="font-serif text-2xl font-semibold">Link incomplete</h1>
        <p className="text-sm text-ink-muted">
          This page needs a confirmation link to continue — go back to the email and click the button again, or{" "}
          <a href="/sign-in" className="text-sea underline">request a new sign-in link</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-16 text-center">
      <h1 className="font-serif text-2xl font-semibold">Finish signing in</h1>
      <p className="text-sm text-ink-muted">
        For security, we need you to click this yourself rather than your email provider doing it automatically.
      </p>
      <a
        href={confirmationUrl}
        className="inline-block rounded-md bg-sea px-5 py-2.5 font-medium text-white dark:text-bg"
      >
        Continue signing in
      </a>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<p className="pt-16 text-center text-sm text-ink-muted">Loading…</p>}>
      <ConfirmInner />
    </Suspense>
  );
}
