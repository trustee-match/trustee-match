"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAUSES } from "@/lib/config";
import { confirmProfileAndMatch, extractFromPdf, extractFromText, type ConfirmInput } from "./actions";

type ExtractedSkill = { skill: string; level: string; evidence: string };

type Step =
  | { kind: "intro" }
  | { kind: "review"; headline: string; skills: (ExtractedSkill & { include: boolean })[]; suggestedCauses: string[]; priorBoardExperience: boolean };

/** Reads a File into a bare base64 string (no `data:...;base64,` prefix) for the PDF
 *  extraction server action — sent as a plain string since server actions don't take a
 *  raw File/Blob argument directly. */
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

export function JoinFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cvText, setCvText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review-step fields not carried in `step` state directly, since they're edited in place.
  const [causes, setCauses] = useState<string[]>([]);
  const [hoursPerMonth, setHoursPerMonth] = useState(5);
  const [priorBoardExperience, setPriorBoardExperience] = useState(false);
  const [readGuide, setReadGuide] = useState(false);
  const [conflictText, setConflictText] = useState("");
  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState<(ExtractedSkill & { include: boolean })[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // The stale-state bug this used to guard against (planning/testing-log.md) can't
  // recur now: confirming navigates to a different route (/join/candidate/[id]) rather
  // than toggling local state, so a fresh visit to /join always mounts this component
  // anew. No explicit reset needed.

  async function handleExtract() {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Enter your name and email first.");
      return;
    }
    if (!pdfFile && !cvText.trim()) {
      setError("Upload a LinkedIn/CV PDF, or paste your CV or a personal statement.");
      return;
    }
    setLoading(true);
    // A PDF (LinkedIn's own "Save to PDF" export, or a CV) takes priority over pasted
    // text if both are present — docs/matching-design.md §3.2's "Import your LinkedIn
    // profile" path, now actually wired up rather than just extract-profile.ts
    // supporting it with nothing in the UI to reach it.
    const result = pdfFile ? await extractFromPdf(await fileToBase64(pdfFile)) : await extractFromText(cvText);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const { profile } = result;
    setHeadline(profile.headline ?? "");
    setSkills(profile.skills.map((s) => ({ ...s, include: true })));
    setCauses(profile.suggested_causes);
    setPriorBoardExperience(profile.prior_board_experience);
    setLinkedinUrl(profile.linkedin_url ?? "");
    setStep({ kind: "review", headline: profile.headline ?? "", skills: profile.skills.map((s) => ({ ...s, include: true })), suggestedCauses: profile.suggested_causes, priorBoardExperience: profile.prior_board_experience });
  }

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    const input: ConfirmInput = {
      name,
      email,
      headline,
      skills,
      causes,
      hoursPerMonth,
      priorBoardExperience,
      readGuide,
      conflictOrgNames: conflictText.split(",").map((s) => s.trim()).filter(Boolean),
      cvText,
      linkedinUrl: linkedinUrl.trim() || null,
    };
    const confirmed = await confirmProfileAndMatch(input);
    if (!confirmed.ok) {
      setLoading(false);
      setError(confirmed.error);
      return;
    }
    router.push(`/join/candidate/${confirmed.candidateId}`);
  }

  function toggleCause(id: string) {
    setCauses((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function toggleSkill(i: number) {
    setSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, include: !s.include } : s)));
  }

  if (step.kind === "review") {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="font-serif text-2xl font-semibold">Check what we found</h1>
        <p className="text-sm text-ink-muted">Nothing is saved yet. Review and adjust before confirming.</p>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Headline</span>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">LinkedIn profile URL (optional)</span>
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
            placeholder="https://www.linkedin.com/in/your-name"
          />
          <span className="block text-xs text-ink-muted">
            Only shown to a charity once you both say yes — never before, and never to anyone browsing.
          </span>
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium">Skills found — untick any that aren&apos;t right</p>
          <ul className="space-y-2">
            {skills.map((s, i) => (
              <li key={`${s.skill}-${i}`} className="flex items-start gap-2 rounded-md border border-line bg-surface p-3 text-sm">
                <input type="checkbox" checked={s.include} onChange={() => toggleSkill(i)} className="mt-1" />
                <span>
                  <span className="font-medium">{s.skill}</span> <span className="text-ink-muted">({s.level})</span>
                  <br />
                  <span className="text-ink-muted">&ldquo;{s.evidence}&rdquo;</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Causes you care about</p>
          <div className="flex flex-wrap gap-2">
            {CAUSES.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleCause(c.id)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  causes.includes(c.id) ? "border-sea bg-sea-soft text-sea" : "border-line text-ink-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Hours you can give per month</span>
          <input
            type="number"
            min={0}
            value={hoursPerMonth}
            onChange={(e) => setHoursPerMonth(Number(e.target.value))}
            className="w-24 rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={priorBoardExperience} onChange={(e) => setPriorBoardExperience(e.target.checked)} />
          I&apos;ve served as a trustee or board member before
        </label>

        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={readGuide} onChange={(e) => setReadGuide(e.target.checked)} />
            I&apos;ve read the &ldquo;Am I ready to be a trustee?&rdquo; guide
          </label>
          <Link href="/join/guide" target="_blank" className="text-sea underline">
            Read it
          </Link>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Any charities you already have a conflict with?</span>
          <input
            value={conflictText}
            onChange={(e) => setConflictText(e.target.value)}
            placeholder="Comma-separated organisation names, e.g. Longfield Foodbank"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="rounded-md bg-missing-soft p-3 text-sm text-missing">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-md bg-sea px-5 py-2.5 font-medium text-white disabled:opacity-50 dark:text-bg"
          >
            {loading ? "Finding matches…" : "Confirm and find matches"}
          </button>
          <button type="button" onClick={() => setStep({ kind: "intro" })} className="rounded-md border border-line px-4 py-2 text-sm">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl font-semibold">Become a trustee</h1>
      <p className="text-ink-muted">
        Enter your name and email, then upload your LinkedIn profile (from LinkedIn&apos;s own{" "}
        <em>More → Save to PDF</em>) or a CV, or just paste in some text — and see which boards need your skills.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
            placeholder="e.g. David Ozanne"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
            placeholder="e.g. david.ozanne@example.com"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">LinkedIn profile PDF or a CV (PDF)</span>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sea file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:file:text-bg"
        />
        <span className="block text-xs text-ink-muted">
          On LinkedIn: your profile → the &ldquo;More&rdquo; button → Save to PDF. We never fetch anything from
          linkedin.com ourselves — only the file you export and upload yourself.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Or paste a CV or personal statement{pdfFile ? " (ignored while a PDF is selected)" : ""}</span>
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          rows={10}
          disabled={Boolean(pdfFile)}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs disabled:opacity-50"
          placeholder="Paste CV text here"
        />
      </label>

      {error && <p className="rounded-md bg-missing-soft p-3 text-sm text-missing">{error}</p>}

      <button
        type="button"
        onClick={handleExtract}
        disabled={loading}
        className="rounded-md bg-sea px-5 py-2.5 font-medium text-white disabled:opacity-50 dark:text-bg"
      >
        {loading ? "Reading…" : "Extract profile"}
      </button>
    </div>
  );
}
