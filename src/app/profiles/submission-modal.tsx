"use client";

import { useState } from "react";
import { getCandidateSubmission, getRoleSubmission } from "./actions";

// Demo-only "see what was submitted" modal — not part of the real product, built so
// testers can compare a candidate's actual CV/personal statement (or a charity's full
// role submission) against what matching surfaces. See planning/demo-scaffolding.md:
// this component and profiles/actions.ts both need to be deleted, not just hidden, when the
// demo scaffolding comes out — along with candidates.cv_text itself (see the Privacy
// entry in planning/responsible-design-decisions.md on why storing raw CV text is a new
// category of data, not just a display change).

type State = { kind: "closed" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "candidate"; name: string; email: string | null; headline: string | null; cvText: string | null; linkedinUrl: string | null } | {
  kind: "role";
  orgName: string;
  title: string;
  purpose: string | null;
  hoursPerMonth: number;
  meetingPattern: string;
  induction: string;
  mustHaveSkills: string[];
  diversityPreference: string | null;
  boardSkills: { skill: string; coverage: string; note?: string }[];
  contactName: string | null;
  contactEmail: string | null;
};

export function SubmissionModalTrigger({ type, id, label }: { type: "candidate" | "role"; id: string; label: string }) {
  const [state, setState] = useState<State>({ kind: "closed" });

  async function open() {
    setState({ kind: "loading" });
    if (type === "candidate") {
      const result = await getCandidateSubmission(id);
      setState(result.ok ? { kind: "candidate", ...result } : { kind: "error", message: result.error });
      return;
    }
    const result = await getRoleSubmission(id);
    setState(result.ok ? { kind: "role", ...result } : { kind: "error", message: result.error });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          open();
        }}
        className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-ink-muted hover:border-sea hover:text-sea"
      >
        {label}
      </button>

      {state.kind !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setState({ kind: "closed" })}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {state.kind === "loading" && <p className="text-sm text-ink-muted">Loading…</p>}
            {state.kind === "error" && <p className="text-sm text-missing">{state.message}</p>}

            {state.kind === "candidate" && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-serif text-xl font-semibold">{state.name}</h2>
                  <p className="text-sm text-ink-muted">{state.email} · {state.headline}</p>
                  {state.linkedinUrl && (
                    <p className="text-sm">
                      <a href={state.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sea underline">
                        {state.linkedinUrl}
                      </a>
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">As submitted — CV / personal statement</p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md border border-line bg-bg p-3 font-mono text-xs">
                    {state.cvText ?? "No CV text on file for this candidate (seeded before this was stored, or extracted without a confirm step)."}
                  </pre>
                </div>
              </div>
            )}

            {state.kind === "role" && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-serif text-xl font-semibold">{state.orgName} — {state.title}</h2>
                  <p className="text-sm text-ink-muted">
                    {state.hoursPerMonth} hrs/month · {state.meetingPattern} · contact: {state.contactName ?? "none on file"}
                    {state.contactEmail ? ` <${state.contactEmail}>` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Purpose, as submitted</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{state.purpose ?? "(none given)"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Induction offered</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{state.induction}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Board skills audit</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {state.boardSkills.map((c) => (
                      <li key={c.skill}>
                        {c.skill}: {c.coverage}
                        {state.mustHaveSkills.includes(c.skill) ? " (must-have)" : ""}
                        {c.note ? ` — ${c.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
                {state.diversityPreference && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Diversity preference</p>
                    <p className="mt-1 text-sm">{state.diversityPreference}</p>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setState({ kind: "closed" })}
              className="mt-6 rounded-md border border-line px-4 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
