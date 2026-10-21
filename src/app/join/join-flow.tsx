"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAUSES } from "@/lib/config";
import { confirmProfileAndMatch, extractFromDocx, extractFromPdf, extractFromText, type ConfirmInput, type EditableProfile } from "./actions";

const DOCX_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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

export function JoinFlow({ email, initialProfile }: { email: string; initialProfile?: EditableProfile }) {
  const router = useRouter();
  const isEditing = Boolean(initialProfile);
  const [step, setStep] = useState<Step>(
    initialProfile
      ? {
          kind: "review",
          headline: initialProfile.headline,
          skills: initialProfile.skills,
          suggestedCauses: initialProfile.causes,
          priorBoardExperience: initialProfile.priorBoardExperience,
        }
      : { kind: "intro" },
  );
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [cvText, setCvText] = useState(initialProfile?.cvText ?? "");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review-step fields not carried in `step` state directly, since they're edited in place.
  const [causes, setCauses] = useState<string[]>(initialProfile?.causes ?? []);
  const [hoursPerMonth, setHoursPerMonth] = useState(initialProfile?.hoursPerMonth ?? 5);
  const [priorBoardExperience, setPriorBoardExperience] = useState(initialProfile?.priorBoardExperience ?? false);
  const [readGuide, setReadGuide] = useState(initialProfile?.readGuide ?? false);
  const [conflictText, setConflictText] = useState(initialProfile?.conflictOrgNames.join(", ") ?? "");
  const [headline, setHeadline] = useState(initialProfile?.headline ?? "");
  const [skills, setSkills] = useState<(ExtractedSkill & { include: boolean })[]>(initialProfile?.skills ?? []);
  const [linkedinUrl, setLinkedinUrl] = useState(initialProfile?.linkedinUrl ?? "");
  const [motivation, setMotivation] = useState(initialProfile?.motivation ?? "");

  // The stale-state bug this used to guard against (planning/testing-log.md) can't
  // recur now: confirming navigates to a different route (/join/candidate/[id]) rather
  // than toggling local state, so a fresh visit to /join always mounts this component
  // anew. No explicit reset needed.

  async function handleExtract() {
    setError(null);
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    if (!cvFile && !cvText.trim()) {
      setError("Upload a CV, or paste your CV or a personal statement.");
      return;
    }
    setLoading(true);
    // A file takes priority over pasted text if both are present. A LinkedIn "Save to
    // PDF" export is just another CV in PDF form by this point — same extraction, same
    // schema (extract-profile.ts already pulls linkedin_url out of whatever document it's
    // given) — so there's nothing LinkedIn-specific to branch on here. .docx has no
    // native Claude document block (PDF-only), so it's routed to extractFromDocx, which
    // converts to text locally first before sending it the same way as pasted text.
    const result = !cvFile
      ? await extractFromText(cvText)
      : cvFile.name.toLowerCase().endsWith(".docx")
        ? await extractFromDocx(await fileToBase64(cvFile))
        : await extractFromPdf(await fileToBase64(cvFile));
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const { profile } = result;
    // File uploads don't go through the textarea, so this is the only place `cvText`
    // gets set for that path — without it, confirmProfileAndMatch saves an empty
    // candidates.cv_text for anyone who uploads rather than pastes (the primary path).
    setCvText(result.rawText);
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
      headline,
      skills,
      causes,
      hoursPerMonth,
      priorBoardExperience,
      readGuide,
      conflictOrgNames: conflictText.split(",").map((s) => s.trim()).filter(Boolean),
      cvText,
      linkedinUrl: linkedinUrl.trim() || null,
      motivation: motivation.trim() || null,
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
      // key="review" (and "intro" below) forces React to unmount/remount this subtree on
      // the step transition, rather than diffing two unrelated sets of form fields
      // positionally — without it, the intro step's Name input and the review step's
      // Headline input sit at the same tree position and React tries to reuse the same
      // DOM <input>, which is exactly what produces the "uncontrolled input becoming
      // controlled" warning (the field changes but the DOM node's prior value doesn't
      // reset the way a fresh mount would).
      <div key="review" className="max-w-2xl space-y-6">
        <h1 className="font-serif text-2xl font-semibold">{isEditing ? "Edit your profile" : "Check what we found"}</h1>
        <p className="text-sm text-ink-muted">
          {isEditing ? "Changes aren't saved until you confirm below." : "Nothing is saved yet. Review and adjust before confirming."}
        </p>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Headline</span>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">What draws you to this kind of work?</span>
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
            placeholder="e.g. I grew up relying on a charity like this one, and want to give back on the board side"
          />
          <span className="block text-xs text-ink-muted">
            Shown to charities alongside your skills — sometimes what you care about matters as much as your CV.
          </span>
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
            {loading ? "Saving…" : isEditing ? "Save changes" : "Confirm and find matches"}
          </button>
          <button type="button" onClick={() => setStep({ kind: "intro" })} className="rounded-md border border-line px-4 py-2 text-sm">
            {isEditing ? "Start over from a new CV" : "Back"}
          </button>
          {isEditing && (
            <button type="button" onClick={() => router.push("/join")} className="rounded-md border border-line px-4 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div key="intro" className="max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl font-semibold">{isEditing ? "Update your CV" : "Become a trustee"}</h1>
      <p className="text-ink-muted">
        {isEditing
          ? "Upload a new CV to refresh your profile — we'll re-extract your skills and causes from it."
          : "Tell us your name and upload your CV — we'll show you the boards that could use exactly what you've got."}
      </p>

      <label className="block max-w-sm space-y-1">
        <span className="text-sm font-medium">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          placeholder="e.g. David Ozanne"
        />
      </label>
      <p className="text-xs text-ink-muted">
        Signed in as <strong>{email}</strong>.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium">CV (PDF or Word)</span>
        <input
          type="file"
          accept={`application/pdf,${DOCX_ACCEPT}`}
          onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sea file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:file:text-bg"
        />
        {cvFile && <span className="block text-xs text-ink-muted">Selected: {cvFile.name}</span>}
      </label>
      <p className="text-xs text-ink-muted">
        On LinkedIn? Generate a CV from your profile: open your profile → the &ldquo;More&rdquo; button →{" "}
        <strong>Save to PDF</strong> — then upload that file above. We never fetch anything from linkedin.com
        ourselves, only the file you export yourself.
      </p>

      <details className="rounded-lg border border-line p-4" open={!cvFile && cvText.trim().length > 0}>
        <summary className="cursor-pointer text-sm font-medium text-ink-muted">No file to hand? Paste text instead</summary>
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          rows={8}
          disabled={Boolean(cvFile)}
          className="mt-3 w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs disabled:opacity-50"
          placeholder="Paste your CV or a personal statement here"
        />
        {cvFile && <p className="mt-2 text-xs text-ink-muted">Clear the file above to paste text instead.</p>}
      </details>

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
