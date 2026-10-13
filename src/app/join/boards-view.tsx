"use client";

import { useEffect, useState } from "react";
import { RoleCard } from "@/components/cards";
import { getMatchesForCandidate, toggleCandidateInterest, type CandidateMatch } from "./actions";
import type { NoMatchDiagnosis } from "@/lib/matching/no-match-feedback";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; matches: CandidateMatch[]; diagnosis: NoMatchDiagnosis | null };

/** Shared by the post-confirm results step and the shareable /join/candidate/[candidateId] URL. */
export function BoardsView({ candidateId }: { candidateId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pending, setPending] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<{ cardId: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMatchesForCandidate(candidateId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState({ kind: "error", message: result.error });
        return;
      }
      setState({ kind: "loaded", matches: result.matches, diagnosis: "diagnosis" in result ? result.diagnosis : null });
    });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  async function handleToggle(match: CandidateMatch, action: "interested" | "pass") {
    if (state.kind !== "loaded") return;
    const nextAction = match.interest === action ? null : action;
    setPending(match.cardId);
    setToggleError(null);
    const result = await toggleCandidateInterest(match.cardId, match.role.id, candidateId, nextAction);
    setPending(null);
    if (!result.ok) {
      setToggleError({ cardId: match.cardId, message: result.error });
      return;
    }
    if (result.matched && !match.matched) {
      // Just became a mutual match — refetch so the charity's contact details (not
      // known client-side) come through on the card rather than showing as empty.
      const refreshed = await getMatchesForCandidate(candidateId);
      if (refreshed.ok) {
        setState({ kind: "loaded", matches: refreshed.matches, diagnosis: "diagnosis" in refreshed ? refreshed.diagnosis : null });
        return;
      }
    }
    setState({
      ...state,
      matches: state.matches.map((m) => (m.cardId === match.cardId ? { ...m, interest: result.interest, matched: result.matched } : m)),
    });
  }

  if (state.kind === "loading") return <p className="text-sm text-ink-muted">Loading…</p>;
  if (state.kind === "error") return <p className="rounded-md bg-missing-soft p-3 text-sm text-missing">{state.message}</p>;

  const { matches, diagnosis } = state;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Boards that need you</h1>
      {matches.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="font-medium">No matches today</p>
          <p className="mt-2 text-sm text-ink-muted">{diagnosis?.message ?? "Check back soon."}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((m) => (
            <RoleCard
              key={m.cardId}
              role={m.role}
              card={m.card}
              interactive={{
                current: m.interest,
                matched: m.matched,
                matchedContact: m.matchedContact,
                onInterested: () => handleToggle(m, "interested"),
                onPass: () => handleToggle(m, "pass"),
                pending: pending === m.cardId,
                error: toggleError?.cardId === m.cardId ? toggleError.message : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
