import Link from "next/link";

/** Placeholder for flows still being built; describes what will happen here. */
export function ComingSoon({ title, steps, week }: { title: string; steps: string[]; week: string }) {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gorse">Being built · {week}</p>
      <h1 className="font-serif text-3xl font-semibold">{title}</h1>
      <ol className="list-decimal space-y-2 pl-5 text-ink-muted">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="text-sm">
        Meanwhile, <Link href="/demo" className="text-sea underline">see the matching demo</Link>.
      </p>
    </div>
  );
}
