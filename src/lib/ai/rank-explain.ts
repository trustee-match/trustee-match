import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { MATCHING, causeLabel, skillLabel } from "../config";
import type { AiJudgement } from "../matching/engine";
import type { Candidate, EvidenceRef, Role, ScoredPair } from "../matching/types";
import { AI_MODEL, FALLBACK_BETA, aiEnabled, getClient, logAiError } from "./client";

// Re-rank the rules shortlist for one role and explain each match. Inputs are anonymised
// (no names, employers or contact details), and every reason must cite a reference that
// code then verifies (see matching/grounding.ts).

const Judgement = z.object({
  candidate_key: z.string().describe("The key of the candidate, e.g. C3"),
  rank: z.number().int().describe("1 = best fit for this board"),
  confidence: z.enum(["high", "medium", "low"]),
  reasons: z
    .array(
      z.object({
        claim: z.string().describe("One plain-English sentence, addressed to a reader deciding whether to meet"),
        ref_kind: z.enum(["candidate_skill", "board_cell", "candidate_cause", "role_field"]),
        ref_value: z.string().describe("Skill id, cause id, or role field name (hoursPerMonth, meetingPattern, induction, cause)"),
      }),
    )
    .describe("Up to 3 reasons, each grounded in one cited reference"),
  considerations: z.array(z.string()).describe("Up to 2 honest caveats, e.g. tight time, possible conflict; empty if none"),
});
const RankOutput = z.object({ judgements: z.array(Judgement) });

const SYSTEM = `You help a Guernsey charity trustee matching service explain why a candidate fits a board.

You receive one board's skills audit (which skills are covered, thin or missing) and an anonymised shortlist already scored by rules. Re-rank the shortlist by how well each person fills the board's actual gaps, using judgement the rules miss (e.g. whether their experience suits a small charity, how transferable it is).

For every candidate, give up to 3 reasons. Each reason must cite exactly one reference that exists in the input:
- candidate_skill: a skill id the candidate has (quote their evidence in the claim)
- board_cell: a skill id the board marked thin or missing
- candidate_cause: a cause id the candidate listed
- role_field: hoursPerMonth, meetingPattern, induction or cause
Claims must be true to the input. Don't infer anything about the person beyond it. Use "low" confidence when the fit is weak; those matches are not shown.`;

function refFrom(kind: string, value: string): EvidenceRef | null {
  switch (kind) {
    case "candidate_skill":
      return { kind, skill: value };
    case "board_cell":
      return { kind, skill: value };
    case "candidate_cause":
      return { kind, cause: value };
    case "role_field":
      return ["hoursPerMonth", "meetingPattern", "induction", "cause"].includes(value)
        ? { kind, field: value as "hoursPerMonth" | "meetingPattern" | "induction" | "cause" }
        : null;
    default:
      return null;
  }
}

function describeRole(role: Role): string {
  const cells = role.boardSkills
    .map((c) => `  - ${c.skill} (${skillLabel(c.skill)}): ${c.coverage}${c.note ? ` — "${c.note}"` : ""}`)
    .join("\n");
  return `Board cause: ${role.cause} (${causeLabel(role.cause)})
Role: ${role.title}; about ${role.hoursPerMonth} hrs/month; meets: ${role.meetingPattern}; induction: ${role.induction}
${role.diversityPreference ? `The charity has openly said it would welcome: ${role.diversityPreference.replaceAll("_", " ")}\n` : ""}Board skills audit:
${cells}`;
}

function describeCandidate(key: string, c: Candidate, pair: ScoredPair): string {
  const skills = c.skills.map((s) => `  - ${s.skill} (${s.level}): "${s.evidence}"`).join("\n");
  return `${key} (rules score ${pair.score}):
  hours/month: ${c.hoursPerMonth}; prior board experience: ${c.priorBoardExperience ? "yes" : "no"}
  causes: ${c.causes.join(", ") || "none listed"}
  skills:
${skills}`;
}

/** Returns judgements keyed to real candidate ids, or null to keep the rules-only cards. */
export async function rankAndExplain(
  role: Role,
  shortlist: { pair: ScoredPair; candidate: Candidate }[],
): Promise<AiJudgement[] | null> {
  if (!aiEnabled() || shortlist.length === 0) return null;
  const top = shortlist.slice(0, MATCHING.thresholds.ai_rerank_top_n);
  const keyed = top.map((s, i) => ({ key: `C${i + 1}`, ...s }));

  try {
    const response = await getClient().beta.messages.parse(
      {
        model: AI_MODEL,
        max_tokens: 16000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        system: SYSTEM,
        output_config: { effort: "medium", format: betaZodOutputFormat(RankOutput) },
        messages: [
          {
            role: "user",
            content: `${describeRole(role)}\n\nShortlist:\n${keyed.map((k) => describeCandidate(k.key, k.candidate, k.pair)).join("\n\n")}`,
          },
        ],
      },
      { timeout: MATCHING.timers.ai_timeout_seconds * 1000, maxRetries: 0 },
    );
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;

    const byKey = new Map(keyed.map((k) => [k.key, k]));
    return response.parsed_output.judgements.flatMap((j) => {
      const k = byKey.get(j.candidate_key);
      if (!k) return [];
      const reasons = j.reasons.flatMap((r) => {
        const ref = refFrom(r.ref_kind, r.ref_value);
        return ref ? [{ claim: r.claim, ref }] : [];
      });
      return [
        {
          candidateId: k.candidate.id,
          roleId: role.id,
          rank: j.rank,
          confidence: j.confidence,
          reasons,
          considerations: j.considerations.slice(0, 2),
        },
      ];
    });
  } catch (error) {
    logAiError("rank-explain", error);
    return null;
  }
}
