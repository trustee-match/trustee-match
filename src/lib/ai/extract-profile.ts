import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CAUSES, CAUSE_IDS, SKILLS, SKILL_IDS } from "../config";
import { AI_MODEL, FALLBACK_BETA, aiEnabled, getClient, logAiError } from "./client";
import { docxToText } from "./docx";

// CV / LinkedIn "Save to PDF" → structured candidate profile. The candidate then reviews
// and confirms every field; this is a draft, never the final record.

export const ExtractedProfile = z.object({
  headline: z.string().describe("One-line professional summary, e.g. 'Chartered accountant, fund administration'"),
  skills: z
    .array(
      z.object({
        skill: z.enum(SKILL_IDS),
        level: z.enum(["working", "professional", "senior"]),
        evidence: z.string().describe("Short quote or close paraphrase from the document supporting this skill"),
      }),
    )
    .describe("Only skills clearly supported by the document, strongest first, at most 6"),
  suggested_causes: z.array(z.enum(CAUSE_IDS)).describe("Causes the document shows an interest in; empty if none"),
  prior_board_experience: z.boolean().describe("True only if the document shows trustee, governor, committee or board service"),
  board_roles: z.array(z.string()).describe("Organisations where they have served on a board or committee, for conflict checks"),
  linkedin_url: z.string().nullable().describe("Their LinkedIn profile URL if it appears in the document, else null"),
});
export type ExtractedProfile = z.infer<typeof ExtractedProfile>;

export type ProfileSource = { kind: "pdf"; base64: string } | { kind: "docx"; base64: string } | { kind: "text"; text: string };

/** Only asked of the PDF path — text and .docx already have their exact original text in
 *  hand locally (the textarea value, or mammoth's output) with no need to round-trip it
 *  through the model. PDF has no local text source (Claude's `document` block is
 *  understanding, not extraction), so this is the one case where "verbatim" means "as
 *  verbatim as a transcription can be." Used only for candidates.cv_text, which
 *  ConfirmInput's doc comment already scopes to "testers can compare what was submitted
 *  against what the engine extracted" — demo/testing-only, never shown to the candidate. */
const ExtractedProfileWithRawText = ExtractedProfile.extend({
  raw_text: z.string().describe("The document's full text, transcribed as close to verbatim as possible — for internal record-keeping only, never shown to the candidate"),
});

const SYSTEM = `You turn a CV or LinkedIn profile export into a draft profile for a charity trustee matching service in Guernsey.

Map experience onto this fixed skills taxonomy (use the ids exactly):
${SKILLS.map((s) => `- ${s.id}: ${s.label} (${s.hint})`).join("\n")}

Levels: "senior" = leads or directs this area, or 10+ years; "professional" = does this as a core part of their job; "working" = practical experience, volunteering or adjacent work.

Causes (ids): ${CAUSES.map((c) => c.id).join(", ")}.

Rules:
- Only include a skill when the document gives evidence for it, and quote or closely paraphrase that evidence. Never invent experience.
- Do not record or infer age, gender, ethnicity, nationality, religion, health, disability, sexuality, marital status or any other protected characteristic, even if the document states it. "youth_voice" and "lived_experience" are only for experience the person explicitly offers as relevant, not for inferred characteristics.
- Leave out contact details other than a LinkedIn URL.
- The person will review everything you produce, so be accurate rather than generous.`;

export type ExtractedResult = { profile: ExtractedProfile; rawText: string };

/** Returns null when AI is disabled or fails; the UI then falls back to the 6-question form.
 *  `rawText` is the document's original text — exact for "text"/"docx" (no model involved
 *  in producing it), a transcription for "pdf" (see ExtractedProfileWithRawText above) —
 *  returned so the caller can save it as candidates.cv_text regardless of which path the
 *  candidate used, not just the paste-a-textarea path. */
export async function extractProfile(source: ProfileSource): Promise<ExtractedResult | null> {
  if (!aiEnabled()) return null;
  if (source.kind === "docx") {
    const text = await docxToText(source.base64);
    const result = await extractProfile({ kind: "text", text });
    return result ? { profile: result.profile, rawText: text } : null;
  }

  try {
    if (source.kind === "pdf") {
      const response = await getClient().beta.messages.parse({
        model: AI_MODEL,
        max_tokens: 16000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        system: SYSTEM,
        output_config: { effort: "medium", format: betaZodOutputFormat(ExtractedProfileWithRawText) },
        messages: [
          {
            role: "user",
            content: [
              { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: source.base64 } },
              { type: "text" as const, text: "Extract the draft trustee profile from this document." },
            ],
          },
        ],
      });
      if (response.stop_reason === "refusal") return null;
      const parsed = response.parsed_output;
      if (!parsed) return null;
      const { raw_text, ...rest } = parsed;
      return { profile: { ...rest, skills: rest.skills.slice(0, 6) }, rawText: raw_text };
    }

    const response = await getClient().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: betaZodOutputFormat(ExtractedProfile) },
      messages: [{ role: "user", content: [{ type: "text" as const, text: `Extract the draft trustee profile from this CV text:\n\n<cv>\n${source.text}\n</cv>` }] }],
    });
    if (response.stop_reason === "refusal") return null;
    const parsed = response.parsed_output;
    if (!parsed) return null;
    return { profile: { ...parsed, skills: parsed.skills.slice(0, 6) }, rawText: source.text };
  } catch (error) {
    logAiError("extract-profile", error);
    return null;
  }
}
