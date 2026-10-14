import Link from "next/link";

// "Readiness explainer: 5 short cards on duties, liability, time and what boards look
// for. It's optional for experienced trustees and nudged for first-timers." —
// docs/matching-design.md §readiness. Ticking the checkbox in /join after reading this
// moves a first-timer's readiness score to the same level as an experienced trustee's
// (config/matching.json — "first_timer_read_guide": 1.0, same as "experienced"), so the
// content here should genuinely address the confidence blocker, not just exist to be
// checked off. Plain-English orientation, not legal advice — a real charity's own
// induction (every role on this site names one) covers the specifics.

export const metadata = { title: "Am I ready to be a trustee? · Trustee Match" };

const CARDS: { title: string; body: React.ReactNode }[] = [
  {
    title: "What a trustee actually does",
    body: (
      <>
        <p>
          You&apos;re one of a small group collectively responsible for a charity&apos;s direction — not running it
          day to day, but making sure it&apos;s being run well. In practice that&apos;s mostly: attending board
          meetings (often monthly, sometimes less), reading papers beforehand, asking honest questions, and voting
          on things like budgets, major decisions and who leads the charity day-to-day.
        </p>
        <p className="mt-2">
          You bring judgement and an outside perspective — not a job description. Boards specifically want people
          who&apos;ll notice what the people inside the organisation might miss.
        </p>
      </>
    ),
  },
  {
    title: "Legal responsibility, in plain English",
    body: (
      <>
        <p>
          Trustees are legally responsible for the charity, as a group. That sounds bigger than it usually feels
          in practice: the standard you&apos;re held to is acting reasonably and in good faith — not being an
          expert, not catching everything, not being personally liable for honest mistakes or decisions that don&apos;t
          work out.
        </p>
        <p className="mt-2">
          Most charities carry trustee indemnity insurance precisely for this. This isn&apos;t legal advice, and the
          specifics vary by charity — a proper induction (every role on this site names what induction they offer)
          is where you&apos;d get the real detail for that board.
        </p>
      </>
    ),
  },
  {
    title: "Time — and how fluid it actually is",
    body: (
      <>
        <p>
          Most roles here ask for somewhere between 4 and 8 hours a month, usually one evening meeting plus some
          reading. It&apos;s rarely exactly that every month — quieter stretches, busier ones around an AGM or a
          crunch. Treat the number on a role as a rough steer, not a strict cap.
        </p>
      </>
    ),
  },
  {
    title: "What boards are actually looking for",
    body: (
      <>
        <p>
          Specific skills matter — that&apos;s the whole point of matching on the gap, not the job title — but
          every board we&apos;ve talked to says the same thing: they want someone who&apos;ll turn up, read the
          papers, ask good questions, and genuinely care about what the charity does. Expertise gets you noticed;
          reliability and curiosity are what actually make you useful on a board.
        </p>
      </>
    ),
  },
  {
    title: "Is this the right time for you?",
    body: (
      <>
        <p>
          You don&apos;t need previous board experience — several of the roles on this site are explicitly open to
          first-time trustees. What&apos;s worth being honest with yourself about is capacity: a board seat is a
          standing commitment, not a one-off. If the hours above sound realistic for the next year or two, you&apos;re
          probably ready to look at what&apos;s out there.
        </p>
      </>
    ),
  },
];

export default function TrusteeGuidePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold">Am I ready to be a trustee?</h1>
        <p className="text-ink-muted">
          Five short answers to the questions that usually hold people back from a first board role: what the job
          actually is, what you&apos;re legally on the hook for, how much time it really takes, what boards want,
          and whether now&apos;s the moment.
        </p>
      </header>

      <div className="space-y-4">
        {CARDS.map((c) => (
          <section key={c.title} className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold">{c.title}</h2>
            <div className="mt-2 text-sm text-ink-muted">{c.body}</div>
          </section>
        ))}
      </div>

      <Link href="/join" className="inline-block rounded-md bg-sea px-5 py-2.5 font-medium text-white dark:text-bg">
        Back to your profile
      </Link>
    </div>
  );
}
