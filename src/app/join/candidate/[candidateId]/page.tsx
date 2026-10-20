import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { BoardsView } from "../../boards-view";

export const metadata = { title: "Boards that need you · Trustee Match" };

// Real ownership check (planning/responsible-design-decisions.md, Security, issue #12):
// the URL's candidateId is no longer sufficient access on its own — only the signed-in
// candidate it belongs to can load this page. Anyone else is sent to sign in.
async function Boards({ params }: { params: Promise<{ candidateId: string }> }) {
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
