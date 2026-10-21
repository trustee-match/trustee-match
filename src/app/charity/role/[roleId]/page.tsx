import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { isOperator } from "@/lib/auth/operator";
import { createClient } from "@/lib/supabase/server";
import { SuggestedTrusteesView } from "../../suggested-trustees-view";

export const metadata = { title: "Suggested trustees · Trustee Match" };
// See the matching note in src/app/join/page.tsx — entirely session-dependent, no static
// shell to prerender under Cache Components.
export const instant = false;

// Real ownership check (planning/responsible-design-decisions.md, Security, issue #12):
// the role id alone is no longer sufficient access — only a signed-in contact for that
// role's organisation (org_members), or a verified operator, can load this page.
// Operator access (2026-10-21) is the deliberate, audited replacement for the old
// "anyone with the link" pattern this issue closed — the underlying actions
// (getSuggestedTrustees/toggleInterest, src/app/charity/actions.ts) already grant this
// via requireOrgMember's operator check, so nothing more is needed there; this page just
// also needs to know whether to show the "you're not actually a member" banner.
async function RoleResults({ params }: { params: Promise<{ roleId: string }> }) {
  // See the matching note in join/candidate/[candidateId]/page.tsx — instant=false alone
  // didn't stop the Date.now() prerender error; connection() does.
  await connection();
  const { roleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/charity/role/${roleId}`)}`);

  const { data: role } = await supabase.from("roles").select("organisation_id").eq("id", roleId).maybeSingle();
  if (!role) redirect("/charity");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organisation_id")
    .eq("organisation_id", role.organisation_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const isMember = Boolean(membership);
  if (!isMember && !(await isOperator(supabase, user.id))) {
    redirect(`/sign-in?next=${encodeURIComponent(`/charity/role/${roleId}`)}`);
  }

  return <SuggestedTrusteesView roleId={roleId} impersonating={!isMember} />;
}

export default function RoleResultsPage({ params }: { params: Promise<{ roleId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <RoleResults params={params} />
    </Suspense>
  );
}
