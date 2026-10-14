"use server";

import { runFullReset, type ResetSummary } from "@/lib/jobs/reset";

// Powers the "Reset data" button in the Demo Mode widget (demo-mode-widget.tsx). No
// secret check, unlike POST /api/admin/reset (src/app/api/admin/reset/route.ts), which
// shares the same underlying logic — deliberately: this is meant to be a normal, visible
// part of the demo experience (anyone who's already behind the site-wide password gate
// can use it), not an admin-only operation. The double-confirmation in the widget's UI
// is the safeguard here, not a secret. See planning/responsible-design-decisions.md,
// Security, for the reasoning.

export async function resetDemoData(): Promise<ResetSummary> {
  return runFullReset();
}
