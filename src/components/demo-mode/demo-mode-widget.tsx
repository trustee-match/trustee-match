"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { amIOperator, resetDemoData } from "./actions";

// A small, dismissible "meta layer" over the real product — explains that the site is
// in demo mode, links to /profiles and /operator, and offers a self-service reset.
// Deliberately kept visually separate from the actual app chrome (a floating corner
// widget, not a nav item) so it reads as scaffolding around the product, not part of it.
// Operator-only now (planning/responsible-design-decisions.md, Security) — it used to be
// reachable by anyone behind the shared demo password, which stopped being appropriate
// once real sign-in existed to check against. The check happens client-side on mount
// (rather than making the whole root layout session-dependent) and fails closed: nothing
// renders until amIOperator() confirms true, and resetDemoData re-checks server-side
// regardless of what this component decided to show.

type ResetState = { step: "idle" } | { step: "confirm1" } | { step: "confirm2" } | { step: "running" } | { step: "done" } | { step: "error"; message: string };

function ResetControl() {
  const router = useRouter();
  const [state, setState] = useState<ResetState>({ step: "idle" });

  async function runReset() {
    setState({ step: "running" });
    try {
      const summary = await resetDemoData();
      if (summary.errors.length > 0) {
        setState({ step: "error", message: summary.errors.join("; ") });
        return;
      }
      router.push("/profiles");
      router.refresh();
      setState({ step: "done" });
      setTimeout(() => setState({ step: "idle" }), 3000);
    } catch (e) {
      setState({ step: "error", message: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  if (state.step === "idle") {
    return (
      <button type="button" onClick={() => setState({ step: "confirm1" })} className="text-sea underline">
        click here to reset
      </button>
    );
  }

  if (state.step === "confirm1") {
    return (
      <span className="block rounded-md bg-missing-soft p-2 text-xs text-missing">
        This wipes every charity and candidate and reseeds the clean starting set.{" "}
        <button type="button" onClick={() => setState({ step: "confirm2" })} className="font-medium underline">
          Continue
        </button>{" "}
        ·{" "}
        <button type="button" onClick={() => setState({ step: "idle" })} className="underline">
          Cancel
        </button>
      </span>
    );
  }

  if (state.step === "confirm2") {
    return (
      <span className="block rounded-md bg-missing-soft p-2 text-xs text-missing">
        Really sure? This can&apos;t be undone.{" "}
        <button type="button" onClick={runReset} className="font-medium underline">
          Yes, reset now
        </button>{" "}
        ·{" "}
        <button type="button" onClick={() => setState({ step: "idle" })} className="underline">
          Cancel
        </button>
      </span>
    );
  }

  if (state.step === "running") {
    return <span className="text-ink-muted">Resetting…</span>;
  }

  if (state.step === "done") {
    return <span className="font-medium text-covered">Done — data reset.</span>;
  }

  return (
    <span className="block rounded-md bg-missing-soft p-2 text-xs text-missing">
      Reset failed: {state.message}{" "}
      <button type="button" onClick={() => setState({ step: "idle" })} className="underline">
        Dismiss
      </button>
    </span>
  );
}

function Accordion({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="rounded-md border border-line bg-bg">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{summary}</summary>
      <div className="px-3 pb-3 text-sm text-ink-muted">{children}</div>
    </details>
  );
}

export function DemoModeWidget() {
  // Plain state, not localStorage-backed: the root layout doesn't remount between
  // in-app navigations, so this naturally stays expanded as someone clicks around —
  // it only resets to the collapsed pill on an actual fresh page load, which is a
  // reasonable default without the hydration complexity a persisted version needs.
  const [open, setOpen] = useState(false);
  const [operator, setOperator] = useState(false);

  useEffect(() => {
    amIOperator().then(setOperator);
  }, []);

  if (!operator) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 rounded-full border border-gorse bg-gorse-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink shadow-md hover:shadow-lg"
      >
        Demo mode
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 max-h-[80vh] w-[min(380px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-gorse bg-surface p-4 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gorse">Demo Mode</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Collapse" className="text-ink-muted hover:text-ink">
          ✕
        </button>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        You&apos;re seeing this because you&apos;re signed in as an operator. Everyone else now goes through the
        real sign-in — this panel, and raw profile browsing, are only visible to you.
      </p>

      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        <li>Add more charities and trustee candidates from the menu above — the real flows, same as anyone.</li>
        <li>
          See how matching is actually performing across everyone at once on the{" "}
          <Link href="/operator" className="text-sea underline">
            operator overview
          </Link>
          , or browse raw records on{" "}
          <Link href="/profiles" className="text-sea underline">
            all profiles
          </Link>
          .
        </li>
        <li>
          Reset the data to the initial state — <ResetControl />
        </li>
      </ol>

      <div className="mt-3 space-y-2">
        <Accordion summary="Trustee flow">
          <p>
            When you submit a trustee profile, it will be passed through an AI agent which will extract information
            relevant to charity matches. You can adjust the result of the AI pass. When submitted, the trustee will
            be scored against open opportunities and see a ranked set of results. If you mark any opportunity as
            &ldquo;interested&rdquo; then you will get a notification if the charity matches you.
          </p>
        </Accordion>
        <Accordion summary="Charity flow">
          <p>
            Submit your opportunity. Score your charity&apos;s needs. Wait for matches. The AI agent will show you
            active trustees that look like a fit. If you mark any opportunity as &ldquo;interested&rdquo; then you
            will get a notification if the trustee matches you.
          </p>
        </Accordion>
        <Accordion summary="Match made?">
          <p>
            The trustee and charity will be sent an email (not active during demo) and will see contact details in
            their dashboard.
          </p>
        </Accordion>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        This panel and /profiles are operator-only now — not something a real candidate or charity contact can see.
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        Email <a href="mailto:jon@theplan.co.uk" className="underline">jon@theplan.co.uk</a> if you have any issues
        or WhatsApp 07736831551.
      </p>
    </div>
  );
}
