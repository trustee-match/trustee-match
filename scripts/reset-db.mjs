// Wipes and reseeds the database to a known-clean state: the 8 pilot charities/roles/
// contacts and the 14 candidate personas, matched. Supersedes the old seed-pilot.mjs /
// seed-add-one.mjs / seed-charity-contacts.mjs (deleted) — reseeding now lives behind
// POST /api/admin/reset (src/app/api/admin/reset/route.ts) so it can trigger real
// matching, which needs Next's server runtime and can't run from a plain script.
//
// DESTRUCTIVE: deletes every auth user and organisation in the target project first.
// Requires --yes. Usage:
//   node scripts/reset-db.mjs --yes                  # against http://localhost:3000
//   node scripts/reset-db.mjs --yes --base=https://trustee-match-preview.netlify.app

import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[m[1]] = value;
  }
  return env;
}

const args = process.argv.slice(2);
if (!args.includes("--yes")) {
  console.error("This wipes every candidate, charity, and match in the target database.\nRe-run with --yes to confirm (optionally --base=<url> for a non-local target).");
  process.exit(1);
}
const baseArg = args.find((a) => a.startsWith("--base="));
const base = baseArg ? baseArg.slice("--base=".length) : "http://localhost:3000";

const env = loadEnvLocal();
if (!env.ADMIN_RESET_SECRET) {
  console.error("ADMIN_RESET_SECRET is not set in .env.local.");
  process.exit(1);
}

console.log(`Resetting ${base} ...`);
const res = await fetch(`${base}/api/admin/reset`, {
  method: "POST",
  headers: { authorization: `Bearer ${env.ADMIN_RESET_SECRET}` },
});
const body = await res.json();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, body);
  process.exit(1);
}
console.log(JSON.stringify(body, null, 2));
if (body.errors?.length) {
  console.warn(`\n${body.errors.length} error(s) during reset — see above.`);
  process.exit(1);
}
console.log("\nDone.");
