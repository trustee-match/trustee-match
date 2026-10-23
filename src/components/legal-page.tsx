import type { ReactNode } from "react";

// Shared layout for /about, /terms and /privacy. Wording agreed with Nick on
// 22 Oct 2026 (review doc "Trustee Match: About, Terms and Privacy").

export function LegalPage({ title, updated, intro, children }: { title: string; updated?: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <article className="max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold">{title}</h1>
        {updated && <p className="text-sm text-ink-muted">Last updated {updated}</p>}
        {intro && <div className="text-ink-muted">{intro}</div>}
      </header>
      <div className="space-y-6 leading-relaxed">{children}</div>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export const CONTACT_EMAIL = "editor@thequarry.media";

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-sea underline">
      {CONTACT_EMAIL}
    </a>
  );
}
