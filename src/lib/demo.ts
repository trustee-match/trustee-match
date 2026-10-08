import rolesJson from "../../data/demo/roles.json";
import candidatesJson from "../../data/demo/candidates.json";
import type { Candidate, Role } from "./matching/types";

// Synthetic demo data: fictional organisations and people, safe to show publicly
// (judges' demo, tests). Real CVs never go here.

export type DemoCandidate = Candidate & { displayName: string };

export const DEMO_ROLES = rolesJson as unknown as Role[];
export const DEMO_CANDIDATES = candidatesJson as unknown as DemoCandidate[];
