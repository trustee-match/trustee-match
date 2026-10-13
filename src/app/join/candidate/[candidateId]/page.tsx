import { Suspense } from "react";
import { BoardsView } from "../../boards-view";

export const metadata = { title: "Boards that need you · Trustee Match" };

async function Boards({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  return <BoardsView candidateId={candidateId} />;
}

export default function CandidateBoardsPage({ params }: { params: Promise<{ candidateId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <Boards params={params} />
    </Suspense>
  );
}
