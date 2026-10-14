import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { causeLabel } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmissionModalTrigger } from "./submission-modal";

export const metadata: Metadata = { title: "All profiles · Trustee Match" };

// A live index of every candidate and charity role currently in the database — the
// thing to come back to as test data changes shape, and the hub for giving someone a
// guided tour without hunting for individual links. Replaces the old /demo route
// (renamed to /profiles 2026-10-14, see planning/demo-scaffolding.md), which showed
// fixed synthetic data (src/lib/demo.ts) rather than anything real; that fixture
// data still exists and is still used by the matching engine's unit tests, just no
// longer shown here. See planning/responsible-design-decisions.md (Privacy) for why an
// aggregated, real-name index like this is an internal/test-only page, not a pattern the
// real product should ever expose.

interface CandidateRow {
  id: string;
  display_name: string | null;
  headline: string | null;
  hours_per_month: number;
  causes: string[];
  confirmed_at: string | null;
}

interface RoleRow {
  id: string;
  title: string;
  org_name: string;
  contact_name: string | null;
  hours_per_month: number;
  cause: string;
  status: string;
  published_at: string | null;
}

async function loadData() {
  const db = createAdminClient();

  const [{ data: candidateRows }, { data: profileRows }, { data: userList }] = await Promise.all([
    db.from("candidates").select("id, headline, hours_per_month, causes, confirmed_at").order("confirmed_at", { ascending: false }),
    db.from("profiles").select("id, display_name"),
    db.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);
  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]));
  const emailById = new Map(userList?.users.map((u) => [u.id, u.email ?? null]) ?? []);

  const candidates: (CandidateRow & { email: string | null })[] = (candidateRows ?? []).map((c) => ({
    id: c.id,
    display_name: nameById.get(c.id) ?? null,
    headline: c.headline,
    hours_per_month: c.hours_per_month,
    causes: c.causes,
    confirmed_at: c.confirmed_at,
    email: emailById.get(c.id) ?? null,
  }));

  const { data: roleRows } = await db
    .from("roles")
    .select("id, title, cause, hours_per_month, status, published_at, organisation_id, organisations(name)")
    .order("published_at", { ascending: false });
  const { data: orgMemberRows } = await db.from("org_members").select("organisation_id, user_id, created_at").order("created_at", { ascending: true });
  const contactByOrg = new Map<string, string | null>();
  for (const m of orgMemberRows ?? []) {
    if (!contactByOrg.has(m.organisation_id)) contactByOrg.set(m.organisation_id, nameById.get(m.user_id) ?? null);
  }

  const roles: RoleRow[] = (
    (roleRows ?? []) as unknown as { id: string; title: string; cause: string; hours_per_month: number; status: string; published_at: string | null; organisation_id: string; organisations: { name: string } | null }[]
  ).map((r) => ({
    id: r.id,
    title: r.title,
    org_name: r.organisations?.name ?? "",
    contact_name: contactByOrg.get(r.organisation_id) ?? null,
    hours_per_month: r.hours_per_month,
    cause: r.cause,
    status: r.status,
    published_at: r.published_at,
  }));

  return { candidates, roles };
}

async function AllProfiles() {
  const { candidates, roles } = await loadData();

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gorse">Internal — every test record, live</p>
        <h1 className="font-serif text-3xl font-semibold">All profiles</h1>
        <p className="max-w-2xl text-ink-muted">
          Every candidate and charity role currently in the database, updated as new ones are added. This page isn&apos;t
          part of the real product — it&apos;s a way to come back to any profile and see how matches and interest have
          changed since you last looked. Click through to see that person&apos;s or charity&apos;s actual matches.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Charities &amp; roles ({roles.length})</h2>
        <div className="space-y-2">
          {roles.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
              <div>
                <p className="font-medium">
                  {r.org_name} — {r.title}
                </p>
                <p className="text-ink-muted">
                  {causeLabel(r.cause)} · about {r.hours_per_month} hrs/month · contact: {r.contact_name ?? "none on file"} ·{" "}
                  {r.status}
                </p>
                <Link href={`/charity/role/${r.id}`} className="text-sea underline">
                  View matches
                </Link>
              </div>
              <SubmissionModalTrigger type="role" id={r.id} label="View submission" />
            </div>
          ))}
          {roles.length === 0 && <p className="text-sm text-ink-muted">No roles published yet.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Candidates ({candidates.length})</h2>
        <div className="space-y-2">
          {candidates.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
              <div>
                <p className="font-medium">
                  {c.display_name ?? "(unnamed)"} <span className="font-normal text-ink-muted">{c.email}</span>
                </p>
                <p className="text-ink-muted">
                  {c.headline} · {c.hours_per_month} hrs/month · {c.causes.map(causeLabel).join(", ")}
                </p>
                <Link href={`/join/candidate/${c.id}`} className="text-sea underline">
                  View matches
                </Link>
              </div>
              <SubmissionModalTrigger type="candidate" id={c.id} label="View CV" />
            </div>
          ))}
          {candidates.length === 0 && <p className="text-sm text-ink-muted">No candidates confirmed yet.</p>}
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-line bg-surface p-4 text-sm">
        <p className="font-medium">Add more test data</p>
        <p className="text-ink-muted">
          <Link href="/join" className="text-sea underline">
            Become a trustee
          </Link>{" "}
          adds a candidate · <Link href="/charity" className="text-sea underline">For charities</Link> publishes a role.
          To wipe and start over with a clean, known seed, run <code>npm run reset:db -- --yes</code> locally — see{" "}
          <code>scripts/reset-db.mjs</code>.
        </p>
      </section>
    </div>
  );
}

export default function ProfilesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <AllProfiles />
    </Suspense>
  );
}
