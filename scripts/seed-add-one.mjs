// Seeds a single additional org+role from the PILOT array in seed-pilot.mjs by name,
// without re-inserting everything else. Usage: node scripts/seed-add-one.mjs "<org name>"

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PILOT } from "./seed-pilot.mjs";

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

const name = process.argv[2];
const entry = PILOT.find((p) => p.org.name === name);
if (!entry) {
  console.error(`No PILOT entry named "${name}". Known: ${PILOT.map((p) => p.org.name).join(", ")}`);
  process.exit(1);
}

const env = loadEnvLocal();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { org, role } = entry;
const { data: orgRow, error: orgErr } = await db.from("organisations").insert({ name: org.name, verified: false }).select("id").single();
if (orgErr) throw new Error(`org insert failed: ${orgErr.message}`);

const { error: roleErr } = await db.from("roles").insert({
  organisation_id: orgRow.id,
  title: role.title,
  purpose: role.purpose,
  cause: role.cause,
  hours_per_month: role.hours_per_month,
  meeting_pattern: role.meeting_pattern,
  induction: role.induction,
  board_skills: role.board_skills,
  must_have_skills: role.must_have_skills,
  diversity_preference: role.diversity_preference,
  status: "published",
  published_at: new Date().toISOString(),
});
if (roleErr) throw new Error(`role insert failed: ${roleErr.message}`);

console.log(`✓ ${org.name} — ${role.title}`);
