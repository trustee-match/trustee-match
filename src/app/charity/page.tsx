import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CharityFlow } from "./charity-flow";

export const metadata = { title: "For charities · Trustee Match" };
// See the matching note in src/app/join/page.tsx — entirely session-dependent, no static
// shell to prerender under Cache Components.
export const instant = false;

// Real sign-in gate (issues #8/#12/#13), mirroring src/app/join/page.tsx. A contact who
// already has published roles sees them listed — the "my roles" dashboard the design
// notes called for — rather than assuming there's only ever one.
//
// Dynamic API access (cookies, via createClient) has to happen inside this inner
// Suspense-wrapped component, not the page's top-level export — see the matching note in
// src/app/join/page.tsx for why (Cache Components).
async function Gate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/charity");

  const { data: memberships } = await supabase.from("org_members").select("organisation_id").eq("user_id", user.id);
  const orgIds = (memberships ?? []).map((m) => m.organisation_id);

  if (orgIds.length > 0) {
    const { data: roles } = await supabase
      .from("roles")
      .select("id, title, status, organisations(name)")
      .in("organisation_id", orgIds)
      .order("published_at", { ascending: false });

    if (roles && roles.length === 1) redirect(`/charity/role/${roles[0].id}`);

    if (roles && roles.length > 1) {
      return (
        <div className="max-w-2xl space-y-6">
          <h1 className="font-serif text-2xl font-semibold">Your roles</h1>
          <div className="space-y-2">
            {roles.map((r) => (
              <Link
                key={r.id}
                href={`/charity/role/${r.id}`}
                className="block rounded-lg border border-line bg-surface p-4 text-sm hover:border-sea"
              >
                <p className="font-medium">
                  {(r.organisations as unknown as { name: string } | null)?.name ?? ""} — {r.title}
                </p>
                <p className="text-ink-muted">{r.status}</p>
              </Link>
            ))}
          </div>
        </div>
      );
    }
  }

  return <CharityFlow email={user.email ?? ""} />;
}

export default function CharityPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <Gate />
    </Suspense>
  );
}
