"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAUSES, SKILLS } from "@/lib/config";
import { publishRoleAndMatch } from "./actions";

type Gap = "missing" | "thin" | null;

export function CharityFlow() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
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
      contactName,
      contactEmail,
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
    router.push(`/charity/role/${published.roleId}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl font-semibold">Find the trustee your board is missing</h1>
      <p className="text-ink-muted">
        Enter your charity&apos;s name and a contact, describe the role, and mark which skills your board is
        missing or thin on — then publish to see who it suggests.
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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Contact name</span>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" placeholder="You, or a colleague handling this" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Contact email</span>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" placeholder="e.g. treasurer@yourcharity.gg" />
        </label>
      </div>
      <p className="text-xs text-ink-muted">
        This is who we&apos;ll reveal to a trustee once you both say yes — not shown to anyone before then.
      </p>

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
