import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { BoardsView } from "../../boards-view";

export const metadata = { title: "Boards that need you · Trustee Match" };
// See the matching note in src/app/join/page.tsx — entirely session-dependent, no static
// shell to prerender under Cache Components.
export const instant = false;

// Real ownership check (planning/responsible-design-decisions.md, Security, issue #12):
// the URL's candidateId is no longer sufficient access on its own — only the signed-in
// candidate it belongs to can load this page. Anyone else is sent to sign in.
async function Boards({ params }: { params: Promise<{ candidateId: string }> }) {
  // `instant = false` alone didn't stop Next's Cache Components prerender-shell analysis
  // from tripping over Date.now() somewhere inside the Supabase SDK's session check
  // (confirmed live — reproduced after a clean rebuild). `connection()` is Next's own
  // suggested fix for this exact error class: it never resolves during prerendering, only
  // at real request time, which forces everything after it — including createClient()
  // below — out of the prerender-analysis path entirely.
  await connection();
  const { candidateId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== candidateId) {
    redirect(`/sign-in?next=${encodeURIComponent(`/join/candidate/${candidateId}`)}`);
  }
  return <BoardsView />;
}

export default function CandidateBoardsPage({ params }: { params: Promise<{ candidateId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <Boards params={params} />
    </Suspense>
  );
}
