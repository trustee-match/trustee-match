import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="space-y-5 pt-6">
        <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          The board that needs your skills
          <br />
          <span className="text-sea">is probably down the road.</span>
        </h1>
        <p className="max-w-2xl text-lg text-ink-muted">
          Two-thirds of Bailiwick charities struggle to find trustees. Trustee Match shows you the boards
          your skills would fill, and why, in about two minutes. When you and a board both say yes, we
          introduce you over email. No application form, no gatekeeper.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/join" className="rounded-md bg-sea px-5 py-3 font-medium text-white dark:text-bg">
            Continue with LinkedIn or a CV
          </Link>
          <Link href="/charity" className="rounded-md border border-line bg-surface px-5 py-3 font-medium">
            I chair a charity board
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Recruit for the gap", "Charities say which skills their board is missing. We match on the gap, not the job title."],
          ["Anonymous until you both say yes", "Charities see your skills and why you fit, not your name, until there's a mutual match."],
          ["A coffee, not an interview", "A match is one introduction email. What happens next is between you and the board."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-ink-muted">{body}</p>
          </div>
        ))}
      </section>

      <p className="text-sm text-ink-muted">
        See it working on made-up data: <Link href="/demo" className="text-sea underline">open the demo</Link>.
      </p>
    </div>
  );
}
