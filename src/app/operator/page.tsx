import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CandidateCard } from "@/components/cards";
import { causeLabel } from "@/lib/config";
import { isOperator } from "@/lib/auth/operator";
import { createClient } from "@/lib/supabase/server";
import { getOperatorOverview } from "./actions";
import { PromoteForm } from "./promote-form";

export const metadata = { title: "Operator overview · Trustee Match" };
// Entirely session-dependent — see the matching note in src/app/join/page.tsx.
export const instant = false;

// Replaces the old "click any persona's link, no sign-in needed" Demo Mode walkthrough
// (planning/demo-scaffolding.md) with a real, permanent, narrowly-scoped capability: one
// read-only page showing matching results across every seeded candidate and role at
// once, for whoever Jon has personally promoted to operator — see
// planning/responsible-design-decisions.md for the full reasoning and the deliberate
// limits (read-only, no way to act as anyone, no self-promotion path).
async function Overview() {
  await connection();
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) redirect("/sign-in?next=/operator");
  if (!(await isOperator(session, user.id))) notFound();

  const result = await getOperatorOverview();
  if (!result.ok) return <p className="rounded-md bg-missing-soft p-3 text-sm text-missing">{result.error}</p>;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gorse">Operator — read-only</p>
        <h1 className="font-serif text-3xl font-semibold">Matching overview</h1>
        <p className="max-w-2xl text-ink-muted">
          Every published role and its top suggested trustees, across all {result.candidateCount} confirmed
          candidates — the real matching engine&apos;s own output, not a staged demo. This view can&apos;t act on
          anyone&apos;s behalf; it only shows what the engine already decided.
        </p>
      </header>

      <PromoteForm />

      <div className="space-y-6">
        {result.rows.map(({ role, topMatches }) => (
          <section key={role.id} className="space-y-3 rounded-lg border border-line bg-surface p-5">
            <header>
              <h2 className="font-serif text-lg font-semibold">
                {role.organisationName} — {role.title}
              </h2>
              <p className="text-sm text-ink-muted">
                {causeLabel(role.cause)} · about {role.hoursPerMonth} hrs/month · {role.meetingPattern}
              </p>
            </header>
            {topMatches.length === 0 ? (
              <p className="text-sm text-ink-muted">No matches yet for this role.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {topMatches.map(({ card, candidate }, i) => (
                  <CandidateCard key={candidate.id} candidate={candidate} card={card} rank={i + 1} />
                ))}
              </div>
            )}
          </section>
        ))}
        {result.rows.length === 0 && <p className="text-sm text-ink-muted">No published roles yet.</p>}
      </div>
    </div>
  );
}

export default function OperatorPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <Overview />
    </Suspense>
  );
}
