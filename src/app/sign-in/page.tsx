"use client";

import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { sendSignInLink, verifySignInCode } from "./actions";

// Cloudflare Turnstile dummy sitekey — always passes, works on any domain including
// localhost. Real Demo/Production deploys should set NEXT_PUBLIC_TURNSTILE_SITE_KEY to
// a real widget's sitekey (dash.cloudflare.com → Turnstile) — see planning/operations.md.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "link_expired" ? "That link has expired or was already used — send a new one." : null,
  );
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileInstance>(null);

  // Manual code entry — a fallback for the emailed link, not a replacement for it (see
  // actions.ts's verifySignInCode doc comment). Separate loading/error state from the
  // link-request form above since both can be live on screen at once.
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  async function handleVerifyCode() {
    setCodeError(null);
    setCodeLoading(true);
    const result = await verifySignInCode(email, code);
    setCodeLoading(false);
    if (!result.ok) {
      setCodeError(result.error);
      return;
    }
    router.push(next ?? "/");
    router.refresh();
  }

  async function handleSubmit() {
    if (!captchaToken) {
      setError("Complete the verification check first.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await sendSignInLink(email, next, captchaToken);
    setLoading(false);
    turnstile.current?.reset();
    setCaptchaToken(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm space-y-6 pt-16 text-center">
        <div className="space-y-3">
          <h1 className="font-serif text-2xl font-semibold">Check your email</h1>
          <p className="text-sm text-ink-muted">
            We&apos;ve sent a sign-in link to <strong>{email}</strong>. Click it to continue — this tab can stay open.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-line bg-surface p-4 text-left">
          <p className="text-sm font-medium">Link not working?</p>
          <p className="text-xs text-ink-muted">
            Some workplace email systems automatically open links to scan them, which can use up the link before you
            click it yourself. If that happens, enter the 6-digit code from the same email instead.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyCode();
            }}
            className="space-y-2"
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              className="w-full rounded-md border border-line bg-bg px-3 py-2 text-center text-sm tracking-widest"
            />
            {codeError && <p className="text-sm text-missing">{codeError}</p>}
            <button
              type="submit"
              disabled={codeLoading || !code.trim()}
              className="w-full rounded-md bg-sea px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:text-bg"
            >
              {codeLoading ? "Checking…" : "Use code instead"}
            </button>
          </form>
        </div>
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
        <Turnstile ref={turnstile} siteKey={TURNSTILE_SITE_KEY} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
        {error && <p className="text-sm text-missing">{error}</p>}
        <button
          type="submit"
          disabled={loading || !captchaToken}
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
