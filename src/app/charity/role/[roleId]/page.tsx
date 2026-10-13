import { Suspense } from "react";
import { SuggestedTrusteesView } from "../../suggested-trustees-view";

export const metadata = { title: "Suggested trustees · Trustee Match" };

async function RoleResults({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  return <SuggestedTrusteesView roleId={roleId} />;
}

export default function RoleResultsPage({ params }: { params: Promise<{ roleId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <RoleResults params={params} />
    </Suspense>
  );
}
