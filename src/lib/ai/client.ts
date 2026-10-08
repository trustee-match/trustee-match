import Anthropic from "@anthropic-ai/sdk";

// One place for model choice and the on/off switch, so the provider stays swappable and
// the service degrades to rules-only matching when AI is unavailable or switched off.
// Hard spend limits are set on the Anthropic Console workspace, not in code.

export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

/** Server-side refusal fallback: Anthropic picks the fallback model by refusal category. */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01" as const;

export function aiEnabled(): boolean {
  return process.env.AI_DISABLED !== "true" && Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 });
  return client;
}

/** Log AI failures without leaking personal data into logs. */
export function logAiError(where: string, error: unknown): void {
  if (error instanceof Anthropic.RateLimitError) console.warn(`[ai:${where}] rate limited`);
  else if (error instanceof Anthropic.APIError) console.warn(`[ai:${where}] API error ${error.status}`);
  else console.warn(`[ai:${where}] ${error instanceof Error ? error.name : "unknown error"}`);
}
