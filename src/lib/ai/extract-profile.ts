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

/** Returns null when AI is disabled or fails; the UI then falls back to the 6-question form. */
export async function extractProfile(source: ProfileSource): Promise<ExtractedProfile | null> {
  if (!aiEnabled()) return null;
  const resolvedSource: ProfileSource = source.kind === "docx" ? { kind: "text", text: await docxToText(source.base64) } : source;
  const content =
    resolvedSource.kind === "pdf"
      ? [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: resolvedSource.base64 } },
          { type: "text" as const, text: "Extract the draft trustee profile from this document." },
        ]
      : [{ type: "text" as const, text: `Extract the draft trustee profile from this CV text:\n\n<cv>\n${resolvedSource.text}\n</cv>` }];

  try {
    const response = await getClient().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: betaZodOutputFormat(ExtractedProfile) },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") return null;
    const parsed = response.parsed_output;
    if (!parsed) return null;
    return { ...parsed, skills: parsed.skills.slice(0, 6) };
  } catch (error) {
    logAiError("extract-profile", error);
    return null;
  }
}
