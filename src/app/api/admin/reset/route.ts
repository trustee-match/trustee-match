import { NextResponse } from "next/server";
import { runFullReset } from "@/lib/jobs/reset";

// Scripted/ops entry point for the shared reset logic in src/lib/jobs/reset.ts — see
// that file for what it actually does. Run via `node scripts/reset-db.mjs`, not
// directly — see that script for the required confirmation flag.
//
// Secret-protected (unlike the UI reset button in src/components/demo-mode/actions.ts,
// which has no secret — see that file for why the two paths are gated differently).
// This must never be reachable without ADMIN_RESET_SECRET, and must never ship to a
// real multi-tenant deployment.

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!process.env.ADMIN_RESET_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.ADMIN_RESET_SECRET}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const summary = await runFullReset();
  return NextResponse.json(summary);
}
