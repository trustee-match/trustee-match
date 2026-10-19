import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CAUSE_IDS, SKILLS, SKILL_IDS } from "../config";
import { AI_MODEL, FALLBACK_BETA, aiEnabled, getClient, logAiError } from "./client";
import { docxToText } from "./docx";

// A pasted/uploaded role description (a volunteer.gg ad, a recruitment email, a PDF job
// spec) → a draft role listing for /charity. docs/matching-design.md §3.2's candidate-side
// import (extract-profile.ts) has a mirror image on the charity side per AGC feedback
// (planning/feedback/agc1.md, Wayne: "liked the button... couldn't see a facility for
// us?") — see planning/feedback/agc1-response-draft.md, issue A. The charity contact then
// reviews and edits every field before publishing; this is a draft, never the final record.

export const ExtractedRole = z.object({
  title: z.string().describe("The role's title, e.g. 'Treasurer' or 'Trustee'"),
  cause: z.enum(CAUSE_IDS).describe("Best-fit cause area for this charity/role, from what the text says the charity does"),
  purpose: z.string().describe("What the charity does, and why this role is needed now — in the ad's own words where possible"),
  hours_per_month: z.number().nullable().describe("Stated monthly time commitment; null if the text doesn't give one"),
  meeting_pattern: z.string().describe("How often and how the board meets, e.g. 'Monthly, evenings'; empty string if not stated"),
  induction: z.string().describe("Induction or support offered to a new trustee; empty string if not stated"),
  must_have_skills: z.array(z.enum(SKILL_IDS)).describe("Skills the text describes as essential or required, not merely helpful"),
  missing_skills: z.array(z.enum(SKILL_IDS)).describe("Skills the text says the board currently lacks, or is specifically recruiting for"),
  thin_skills: z.array(z.enum(SKILL_IDS)).describe("Skills the text suggests are only partially covered — less certain than missing"),
  diversity_preference: z
    .enum(["first_time_trustee"])
    .nullable()
    .describe("'first_time_trustee' only if the text explicitly welcomes first-time trustees, else null"),
  volunteer_gg_url: z.string().nullable().describe("A volunteer.gg URL if one appears in the text, else null"),
});
export type ExtractedRole = z.infer<typeof ExtractedRole>;

export type RoleSource = { kind: "pdf"; base64: string } | { kind: "docx"; base64: string } | { kind: "text"; text: string };

const SYSTEM = `You turn a charity board-role description (a volunteer.gg ad, a recruitment email, a job spec) into a draft role listing for a trustee matching service in Guernsey.

Map the board's skills gap onto this fixed taxonomy (use the ids exactly):
${SKILLS.map((s) => `- ${s.id}: ${s.label} (${s.hint})`).join("\n")}

Cause ids: ${CAUSE_IDS.join(", ")}.

Rules:
- Only mark a skill missing/thin/must-have when the text gives actual evidence for it. Never invent a gap the text doesn't state — the fact a charity is advertising for a role is itself evidence it currently lacks that skill, so a stated role like "seeking a Treasurer" supports marking finance_treasury missing even without the word "skill" appearing.
- "missing" = the text says the board currently has nobody doing this, or is specifically recruiting for it. "thin" = the text suggests only partial or stretched coverage — less certain than missing. A skill can be must-have without being missing or thin (a standing requirement the ad names, not necessarily a current gap).
- Leave out any named individual's personal details (e.g. a named outgoing trustee, a contact's direct email) — only the role's own content.
- The charity contact will review and edit everything before publishing, so be accurate rather than generous.`;

/** Returns null when AI is disabled or fails; the UI then falls back to the plain form. */
export async function extractRole(source: RoleSource): Promise<ExtractedRole | null> {
  if (!aiEnabled()) return null;
  const resolvedSource: RoleSource = source.kind === "docx" ? { kind: "text", text: await docxToText(source.base64) } : source;
  const content =
    resolvedSource.kind === "pdf"
      ? [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: resolvedSource.base64 } },
          { type: "text" as const, text: "Extract the draft role listing from this document." },
        ]
      : [{ type: "text" as const, text: `Extract the draft role listing from this text:\n\n<role>\n${resolvedSource.text}\n</role>` }];

  try {
    const response = await getClient().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: betaZodOutputFormat(ExtractedRole) },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") return null;
    return response.parsed_output ?? null;
  } catch (error) {
    logAiError("extract-role", error);
    return null;
  }
}
