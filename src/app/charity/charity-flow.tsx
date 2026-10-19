"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAUSES, SKILLS } from "@/lib/config";
import { extractRoleFromDocx, extractRoleFromPdf, extractRoleFromText, publishRoleAndMatch } from "./actions";

type Gap = "missing" | "thin" | null;

const DOCX_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Reads a File into a bare base64 string (no `data:...;base64,` prefix), same helper as
 *  src/app/join/join-flow.tsx — small enough not to be worth sharing, and each side's
 *  import panel is independent. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(",");
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

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
  const [volunteerGgUrl, setVolunteerGgUrl] = useState("");
  const [skillState, setSkillState] = useState<Record<string, { gap: Gap; mustHave: boolean }>>(
    () => Object.fromEntries(SKILLS.map((s) => [s.id, { gap: null, mustHave: false }])),
  );

  const [roleFile, setRoleFile] = useState<File | null>(null);
  const [roleText, setRoleText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  function setGap(skillId: string, gap: Gap) {
    setSkillState((prev) => ({ ...prev, [skillId]: { ...prev[skillId], gap: prev[skillId].gap === gap ? null : gap } }));
  }

  function toggleMustHave(skillId: string) {
    setSkillState((prev) => ({ ...prev, [skillId]: { ...prev[skillId], mustHave: !prev[skillId].mustHave } }));
  }

  /** Pastes a volunteer.gg ad, a recruitment email, or a PDF/.docx job spec into the form
   *  fields below for review — same "draft, then you edit and confirm" pattern as /join's
   *  CV import. AGC feedback (planning/feedback/agc1.md, Wayne) — see
   *  planning/feedback/agc1-response-draft.md, issue A. */
  async function handleExtractRole() {
    setExtractError(null);
    if (!roleFile && !roleText.trim()) {
      setExtractError("Upload a PDF/.docx, or paste the role description first.");
      return;
    }
    setExtracting(true);
    const result = !roleFile
      ? await extractRoleFromText(roleText)
      : roleFile.name.toLowerCase().endsWith(".docx")
        ? await extractRoleFromDocx(await fileToBase64(roleFile))
        : await extractRoleFromPdf(await fileToBase64(roleFile));
    setExtracting(false);
    if (!result.ok) {
      setExtractError(result.error);
      return;
    }
    const r = result.role;
    setTitle(r.title);
    setCause(r.cause);
    setPurpose(r.purpose);
    if (r.hours_per_month !== null) setHoursPerMonth(r.hours_per_month);
    setMeetingPattern(r.meeting_pattern);
    setInduction(r.induction);
    setDiversityPreference(r.diversity_preference);
    setVolunteerGgUrl(r.volunteer_gg_url ?? "");
    setSkillState((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) next[id] = { gap: null, mustHave: false };
      for (const id of r.must_have_skills) if (next[id]) next[id] = { ...next[id], mustHave: true };
      for (const id of r.thin_skills) if (next[id]) next[id] = { ...next[id], gap: "thin" };
      for (const id of r.missing_skills) if (next[id]) next[id] = { ...next[id], gap: "missing" };
      return next;
    });
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
      volunteerGgUrl: volunteerGgUrl.trim() || null,
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
        Tell us about your charity and the role, mark where your board&apos;s skills could use a hand, then
        publish to see who we&apos;d suggest.
      </p>

      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="text-sm font-semibold">Already have a role description?</p>
        <p className="mt-1 text-sm text-ink-muted">
          Paste a volunteer.gg ad, a recruitment email, or upload a PDF/Word job spec — we&apos;ll draft the
          fields below for you to check and edit before publishing. Nothing is saved until you publish.
        </p>
        <label className="mt-3 block">
          <span className="text-sm font-medium">Upload (PDF or Word)</span>
          <input
            type="file"
            accept={`application/pdf,${DOCX_ACCEPT}`}
            onChange={(e) => setRoleFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sea file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:file:text-bg"
          />
          {roleFile && <span className="mt-1 block text-xs text-ink-muted">Selected: {roleFile.name}</span>}
        </label>
        <label className="mt-3 block space-y-1">
          <span className="text-sm font-medium">Or paste the role description{roleFile ? " (ignored while a file is selected)" : ""}</span>
          <textarea
            value={roleText}
            onChange={(e) => setRoleText(e.target.value)}
            rows={6}
            disabled={Boolean(roleFile)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs disabled:opacity-50"
            placeholder="Paste a volunteer.gg listing or any role description here"
          />
        </label>
        {extractError && <p className="mt-2 rounded-md bg-missing-soft p-3 text-sm text-missing">{extractError}</p>}
        <button
          type="button"
          onClick={handleExtractRole}
          disabled={extracting}
          className="mt-3 rounded-md bg-sea px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:text-bg"
        >
          {extracting ? "Reading…" : "Draft from this"}
        </button>
      </div>

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

      <label className="block space-y-1">
        <span className="text-sm font-medium">volunteer.gg listing URL (optional)</span>
        <input
          value={volunteerGgUrl}
          onChange={(e) => setVolunteerGgUrl(e.target.value)}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          placeholder="https://volunteer.gg/..."
        />
        <span className="block text-xs text-ink-muted">
          If this role is also listed on volunteer.gg, we&apos;ll credit and link to it from the role&apos;s card.
        </span>
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
