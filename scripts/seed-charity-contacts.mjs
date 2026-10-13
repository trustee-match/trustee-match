// Backfills a named contact (profiles + org_members, via the Supabase admin API — same
// shadow-auth-user approach as the candidate personas, see planning/responsible-design-
// decisions.md's Security entry on confirmProfileAndMatch) for each of the 8 pilot
// charities seeded by seed-pilot.mjs, none of which had a real org_members row until now.
// Run once locally: `node scripts/seed-charity-contacts.mjs`.
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, read from .env.local.

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

const env = loadEnvLocal();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Invented contacts, one per pilot org, matched by org name to PILOT in seed-pilot.mjs.
// Names chosen the same way as the 14 candidate personas (planning/dummy-candidates/
// test-candidates.md): reflecting Guernsey's actual demographic mix — predominantly
// Guernsey French surnames, UK mainland (England and Northern Ireland), a Madeiran
// community, and a lower density of other European nationalities (e.g. Latvian) — not
// an arbitrary/generic name list. Test-only emails, @test.local, matching the existing
// convention (see charity-tester@test.local in src/app/charity/actions.ts).
const CONTACTS = {
  "Longfield Foodbank": { name: "Diane Falla", email: "diane.falla@test.local" }, // Guernsey French
  "Bailiwick Young Carers": { name: "Siobhan Doherty", email: "siobhan.doherty@test.local" }, // Northern Ireland
  "Vale Community Hub": { name: "Carlos Freitas", email: "carlos.freitas@test.local" }, // Madeiran
  "Petit Bot Wildlife Rescue": { name: "Mark Thompson", email: "mark.thompson@test.local" }, // UK mainland
  "Clos du Parc Day Centre": { name: "Jean Nicolle", email: "jean.nicolle@test.local" }, // Guernsey French
  "Island Heritage Archive Trust": { name: "Helen Marshall", email: "helen.marshall@test.local" }, // UK mainland
  "New Routes Trust": { name: "Teresa Abreu", email: "teresa.abreu@test.local" }, // Madeiran
  "Rocquaine Youth Sailing Trust": { name: "Andrejs Ozols", email: "andrejs.ozols@test.local" }, // Latvian
};

async function findOrCreateAuthUser(email, displayName) {
  const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { display_name: displayName } });
  if (!error && created.user) return created.user.id;

  const { data: list, error: listError } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw new Error(listError.message);
  const found = list.users.find((u) => u.email === email);
  if (found) return found.id;
  throw new Error(error?.message ?? `Could not create or find a user for ${email}`);
}

async function main() {
  for (const { org } of PILOT) {
    const contact = CONTACTS[org.name];
    if (!contact) {
      console.warn(`⚠ No contact mapped for "${org.name}" — skipping`);
      continue;
    }

    const { data: orgRow, error: orgErr } = await db.from("organisations").select("id").ilike("name", org.name).maybeSingle();
    if (orgErr) throw new Error(`org lookup failed (${org.name}): ${orgErr.message}`);
    if (!orgRow) {
      console.warn(`⚠ Organisation "${org.name}" not found — run seed-pilot.mjs first. Skipping.`);
      continue;
    }

    const userId = await findOrCreateAuthUser(contact.email, contact.name);

    const { data: existingProfile } = await db.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (existingProfile) {
      const { error } = await db.from("profiles").update({ display_name: contact.name }).eq("id", userId);
      if (error) throw new Error(`profiles update failed (${contact.name}): ${error.message}`);
    } else {
      const { error } = await db.from("profiles").insert({ id: userId, kind: "board_contact", display_name: contact.name });
      if (error) throw new Error(`profiles insert failed (${contact.name}): ${error.message}`);
    }

    const { error: memberErr } = await db
      .from("org_members")
      .upsert({ organisation_id: orgRow.id, user_id: userId }, { onConflict: "organisation_id,user_id", ignoreDuplicates: true });
    if (memberErr) throw new Error(`org_members upsert failed (${org.name}): ${memberErr.message}`);

    console.log(`✓ ${org.name} — ${contact.name} <${contact.email}>`);
  }
}

main().then(
  () => {
    console.log("Done.");
    process.exit(0);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
