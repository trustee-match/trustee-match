"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sendSignInLink } from "./actions";

function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "link_expired" ? "That link has expired or was already used — send a new one." : null,
  );
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = await sendSignInLink(email, next);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm space-y-3 pt-16 text-center">
        <h1 className="font-serif text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-ink-muted">
          We&apos;ve sent a sign-in link to <strong>{email}</strong>. Click it to continue — this tab can stay open.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-16">
      <div className="space-y-2 text-center">
        <h1 className="font-serif text-2xl font-semibold">Sign in or register</h1>
        <p className="text-sm text-ink-muted">
          Enter your email — we&apos;ll sign you in if you already have an account, or get you started if you&apos;re
          new. No password to remember.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-3"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
        {error && <p className="text-sm text-missing">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-sea px-4 py-2.5 font-medium text-white disabled:opacity-50 dark:text-bg"
        >
          {loading ? "Sending…" : "Continue"}
        </button>
      </form>
      {!next && (
        <p className="text-center text-sm text-ink-muted">
          New here?{" "}
          <Link href="/join" className="text-sea underline">
            Apply as a trustee
          </Link>{" "}
          ·{" "}
          <Link href="/charity" className="text-sea underline">
            Register your charity
          </Link>
        </p>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="pt-16 text-center text-sm text-ink-muted">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
