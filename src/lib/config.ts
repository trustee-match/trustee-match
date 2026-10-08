import taxonomy from "../../config/taxonomy.json";
import causes from "../../config/causes.json";
import matching from "../../config/matching.json";

export type SkillId = (typeof taxonomy.skills)[number]["id"];
export type CauseId = (typeof causes.causes)[number]["id"];

export const SKILLS = taxonomy.skills;
export const SKILL_IDS = taxonomy.skills.map((s) => s.id) as [SkillId, ...SkillId[]];
export const CAUSES = causes.causes;
export const CAUSE_IDS = causes.causes.map((c) => c.id) as [CauseId, ...CauseId[]];
export const RELATED_CAUSES = causes.related as [string, string][];

export const MATCHING = matching;
export type MatchingConfig = typeof matching;

export function skillLabel(id: string): string {
  return SKILLS.find((s) => s.id === id)?.label ?? id;
}

export function causeLabel(id: string): string {
  return CAUSES.find((c) => c.id === id)?.label ?? id;
}
