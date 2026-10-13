"use client";

import { useEffect, useState } from "react";
import { CandidateCard, SkillsGrid } from "@/components/cards";
import { causeLabel } from "@/lib/config";
import type { Role } from "@/lib/matching/types";
import type { NoMatchDiagnosis } from "@/lib/matching/no-match-feedback";
import { getSuggestedTrustees, toggleInterest, type SuggestedTrustee } from "./actions";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; role: Role; matches: SuggestedTrustee[]; diagnosis: NoMatchDiagnosis | null };

/** Shared by the post-publish results step and the shareable /charity/role/[roleId] URL. */
export function SuggestedTrusteesView({ roleId }: { roleId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pending, setPending] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<{ cardId: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSuggestedTrustees(roleId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState({ kind: "error", message: result.error });
        return;
      }
      setState({ kind: "loaded", role: result.role, matches: result.matches, diagnosis: "diagnosis" in result ? result.diagnosis : null });
    });
    return () => {
      cancelled = true;
    };
  }, [roleId]);

  async function handleToggle(match: SuggestedTrustee, action: "interested" | "pass") {
    if (state.kind !== "loaded") return;
    const nextAction = match.interest === action ? null : action;
    setPending(match.cardId);
    setToggleError(null);
    const result = await toggleInterest(match.cardId, roleId, match.candidate.id, nextAction);
    setPending(null);
    if (!result.ok) {
      setToggleError({ cardId: match.cardId, message: result.error });
      return;
    }
    setState({
      ...state,
      matches: state.matches.map((m) => (m.cardId === match.cardId ? { ...m, interest: result.interest, matched: result.matched } : m)),
    });
  }

  if (state.kind === "loading") return <p className="text-sm text-ink-muted">Loading…</p>;
  if (state.kind === "error") return <p className="rounded-md bg-missing-soft p-3 text-sm text-missing">{state.message}</p>;

  const { role, matches, diagnosis } = state;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-2xl font-semibold">{role.title}</h1>
        <p className="text-sm text-ink-muted">
          {role.organisationName} · {causeLabel(role.cause)} · about {role.hoursPerMonth} hrs/month · {role.meetingPattern}
        </p>
        <SkillsGrid role={role} />
      </header>

      <h2 className="font-serif text-xl font-semibold">Suggested trustees</h2>
      {matches.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="font-medium">No suggestions today</p>
          <p className="mt-2 text-sm text-ink-muted">{diagnosis?.message ?? "Check back soon."}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((m, i) => (
            <CandidateCard
              key={m.cardId}
              candidate={m.candidate}
              card={m.card}
              rank={i + 1}
              interactive={{
                current: m.interest,
                matched: m.matched,
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
