"use client";

import { useState } from "react";
import { CandidateCard } from "@/components/cards";
import { CAUSES, SKILLS } from "@/lib/config";
import type { Candidate, Card } from "@/lib/matching/types";
import type { NoMatchDiagnosis } from "@/lib/matching/no-match-feedback";
import { getSuggestedTrustees, publishRoleAndMatch } from "./actions";

type Gap = "missing" | "thin" | null;

type Step =
  | { kind: "form" }
  | { kind: "results"; matches: { candidate: Candidate; card: Card }[]; diagnosis: NoMatchDiagnosis | null };

export function CharityFlow() {
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [title, setTitle] = useState("");
  const [cause, setCause] = useState(CAUSES[0].id);
  const [purpose, setPurpose] = useState("");
  const [hoursPerMonth, setHoursPerMonth] = useState(5);
  const [meetingPattern, setMeetingPattern] = useState("");
  const [induction, setInduction] = useState("");
  const [diversityPreference, setDiversityPreference] = useState<string | null>(null);
  const [skillState, setSkillState] = useState<Record<string, { gap: Gap; mustHave: boolean }>>(
    () => Object.fromEntries(SKILLS.map((s) => [s.id, { gap: null, mustHave: false }])),
  );

  function resetAll() {
    setStep({ kind: "form" });
    setError(null);
    setOrgName("");
    setTitle("");
    setCause(CAUSES[0].id);
    setPurpose("");
    setHoursPerMonth(5);
    setMeetingPattern("");
    setInduction("");
    setDiversityPreference(null);
    setSkillState(Object.fromEntries(SKILLS.map((s) => [s.id, { gap: null, mustHave: false }])));
  }

  function setGap(skillId: string, gap: Gap) {
    setSkillState((prev) => ({ ...prev, [skillId]: { ...prev[skillId], gap: prev[skillId].gap === gap ? null : gap } }));
  }

  function toggleMustHave(skillId: string) {
    setSkillState((prev) => ({ ...prev, [skillId]: { ...prev[skillId], mustHave: !prev[skillId].mustHave } }));
  }

  async function handlePublish() {
    setError(null);
    setLoading(true);
    const missingSkills = Object.entries(skillState).filter(([, v]) => v.gap === "missing").map(([k]) => k);
    const thinSkills = Object.entries(skillState).filter(([, v]) => v.gap === "thin").map(([k]) => k);
    const mustHaveSkills = Object.entries(skillState).filter(([, v]) => v.mustHave).map(([k]) => k);

    const published = await publishRoleAndMatch({
      orgName,
      title,
      cause,
      purpose,
      hoursPerMonth,
      meetingPattern,
      induction,
      mustHaveSkills,
      missingSkills,
      thinSkills,
      diversityPreference,
    });
    if (!published.ok) {
      setLoading(false);
      setError(published.error);
      return;
    }
    const matches = await getSuggestedTrustees(published.roleId);
    setLoading(false);
    if (!matches.ok) {
      setError(matches.error);
      return;
    }
    if (matches.matches.length === 0) {
      setStep({ kind: "results", matches: [], diagnosis: "diagnosis" in matches ? matches.diagnosis : null });
    } else {
      setStep({ kind: "results", matches: matches.matches, diagnosis: null });
    }
  }

  if (step.kind === "results") {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-semibold">Suggested trustees</h1>
        {step.matches.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface p-5">
            <p className="font-medium">No suggestions today</p>
            <p className="mt-2 text-sm text-ink-muted">{step.diagnosis?.message ?? "Check back soon."}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {step.matches.map(({ candidate, card }, i) => (
              <CandidateCard key={candidate.id} candidate={candidate} card={card} rank={i + 1} />
            ))}
          </div>
        )}
        <button type="button" onClick={resetAll} className="rounded-md border border-line px-4 py-2 text-sm">
          Publish another role
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl font-semibold">Find the trustee your board is missing</h1>
      <p className="text-ink-muted">
        Internal test harness: no sign-in yet, just your charity&apos;s name. Describe the role and mark which skills
        your board is missing or thin on, then publish to see who it suggests.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Charity name</span>
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" placeholder="e.g. Longfield Foodbank" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Role title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" placeholder="e.g. Treasurer" />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Cause</span>
        <select value={cause} onChange={(e) => setCause(e.target.value)} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
          {CAUSES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Purpose — what does your charity do, and why this role now?</span>
        <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={4} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Hours per month</span>
          <input type="number" min={1} value={hoursPerMonth} onChange={(e) => setHoursPerMonth(Number(e.target.value))} className="w-24 rounded-md border border-line bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Meeting pattern</span>
          <input value={meetingPattern} onChange={(e) => setMeetingPattern(e.target.value)} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" placeholder="e.g. Monthly board meeting" />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Induction you&apos;ll offer</span>
        <textarea value={induction} onChange={(e) => setInduction(e.target.value)} rows={2} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Diversity preference (optional)</span>
        <select
          value={diversityPreference ?? ""}
          onChange={(e) => setDiversityPreference(e.target.value || null)}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="">None</option>
          <option value="first_time_trustee">We&apos;d welcome a first-time trustee</option>
        </select>
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">Board skills — mark any gaps, and tick a skill as a must-have if the role can&apos;t go ahead without it</p>
        <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border border-line">
          {SKILLS.map((s) => {
            const state = skillState[s.id];
            return (
              <div key={s.id} className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-sm last:border-b-0">
                <span className="flex-1">{s.label}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setGap(s.id, "missing")}
                    className={`rounded px-2 py-1 text-xs ${state.gap === "missing" ? "bg-missing text-white" : "border border-line text-ink-muted"}`}
                  >
                    Missing
                  </button>
                  <button
                    type="button"
                    onClick={() => setGap(s.id, "thin")}
                    className={`rounded px-2 py-1 text-xs ${state.gap === "thin" ? "bg-thin text-white" : "border border-line text-ink-muted"}`}
                  >
                    Thin
                  </button>
                  <label className="ml-2 flex items-center gap-1 text-xs text-ink-muted">
                    <input type="checkbox" checked={state.mustHave} onChange={() => toggleMustHave(s.id)} />
                    Must-have
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="rounded-md bg-missing-soft p-3 text-sm text-missing">{error}</p>}

      <button
        type="button"
        onClick={handlePublish}
        disabled={loading}
        className="rounded-md bg-sea px-5 py-2.5 font-medium text-white disabled:opacity-50 dark:text-bg"
      >
        {loading ? "Publishing…" : "Publish and find trustees"}
      </button>
    </div>
  );
}
