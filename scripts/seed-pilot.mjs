// Seeds the six invented pilot charities/roles (data/pilot/roles.md) into the live
// Supabase database. Run once locally: `node scripts/seed-pilot.mjs`.
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, read from .env.local.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// organisation + role, one entry each. board_skills cells are fully invented here on
// purpose — these are fictional charities (see planning/responsible-design-decisions.md,
// Accuracy: "Invented pilot charities..."), unlike the real-volunteer.gg-listing rule
// logged alongside it, which still applies whenever real charity data is used.
export const PILOT = [
  {
    org: { name: "Longfield Foodbank" },
    role: {
      title: "Treasurer",
      cause: "poverty",
      hours_per_month: 7,
      meeting_pattern: "Monthly board meeting, plus extra time in the first three months for the back-year catch-up",
      induction: "No formal handover — the outgoing treasurer left without one. The part-time bookkeeper (1 day/week) can walk you through what records exist.",
      purpose: "We serve about 140 households a month. Our treasurer of six years resigned suddenly in May for personal reasons, and nobody on the board has the background to pick it up properly. There's been no management accounts since February and no bank reconciliation review since the handover gap started — we don't know our real reserve position right now. Our biggest funder requires audited accounts in four months and we are not ready.",
      board_skills: [
        { skill: "finance_treasury", coverage: "missing", note: "Treasurer resigned suddenly in May with no handover; no management accounts produced since February" },
        { skill: "audit_risk", coverage: "thin", note: "No external review of controls in over two years" },
      ],
      must_have_skills: ["finance_treasury"],
      diversity_preference: null,
    },
  },
  {
    org: { name: "Bailiwick Young Carers" },
    role: {
      title: "Trustee, Safeguarding",
      cause: "children_youth",
      hours_per_month: 5,
      meeting_pattern: "Monthly evening board meeting (Tuesdays)",
      induction: "Handover sessions with the outgoing safeguarding lead before she steps down in December, plus the existing policy pack.",
      purpose: "We support around 60 children and young people across the Bailiwick who care for a family member at home. Our safeguarding lead on the board is stepping down at the end of the year after eight years, and nobody else could currently pick it up. An external review of our safeguarding arrangements is likely in the next 12–18 months, and our policies haven't had a full review since 2023.",
      board_skills: [
        { skill: "safeguarding", coverage: "missing", note: "Safeguarding lead stepping down in December after 8 years; no successor identified" },
        { skill: "hr_people", coverage: "thin" },
      ],
      must_have_skills: ["safeguarding"],
      diversity_preference: null,
    },
  },
  {
    org: { name: "Vale Community Hub" },
    role: {
      title: "General Trustee",
      cause: "community",
      hours_per_month: 4,
      meeting_pattern: "Monthly board meeting, Wednesday evenings",
      induction: "Half-day induction with the chair, plus sitting in on one meeting as an observer first if you'd like.",
      purpose: "We run a community space used by about a dozen local groups. We're a small, close board of five who are stretched thin covering everything from room bookings to grant reporting. We're not short of any one professional skill right now — we just need another steady pair of hands who'll turn up, read the papers, and help us think things through as we grow. We'd love this to be someone's first trustee role.",
      board_skills: [{ skill: "community_engagement", coverage: "thin" }],
      must_have_skills: [],
      diversity_preference: "first_time_trustee",
    },
  },
  {
    org: { name: "Petit Bot Wildlife Rescue" },
    role: {
      title: "Trustee, Marketing & Communications",
      cause: "animals",
      hours_per_month: 5,
      meeting_pattern: "Monthly board meeting, plus occasional ad hoc input between meetings",
      induction: "Walkthrough of current channels (a Facebook page, mostly) and what little brand material exists.",
      purpose: "We rescue and rehabilitate around 300 injured and orphaned animals a year. Almost nobody outside our existing supporters knows we exist, and our funding — almost entirely small individual donations — has been flat for three years while vet bills haven't. We've never had anyone on the board who knows what they're doing on the comms side.",
      board_skills: [
        { skill: "marketing_comms", coverage: "missing", note: "No board member with marketing/communications background; donor numbers flat for 3 years" },
        { skill: "fundraising", coverage: "thin" },
      ],
      must_have_skills: ["marketing_comms"],
      diversity_preference: null,
    },
  },
  {
    org: { name: "Clos du Parc Day Centre" },
    role: {
      title: "Trustee, Fundraising",
      cause: "older_people",
      hours_per_month: 6,
      meeting_pattern: "Monthly board meeting, plus a termly fundraising-strategy session",
      induction: "Session with the centre manager to understand the service, plus access to existing grant records.",
      purpose: "We run a day centre for around 45 older islanders at real risk of isolation. A grant covering roughly half our running costs for the last six years ends next March and won't be renewed. We don't have anyone on the board with real fundraising or bid-writing experience, and closing days or cutting transport are the realistic alternatives if we don't fix this before March.",
      board_skills: [
        { skill: "fundraising", coverage: "missing", note: "Grant covering ~half of running costs ends March 2027 and will not be renewed" },
        { skill: "strategy", coverage: "thin" },
      ],
      must_have_skills: ["fundraising"],
      diversity_preference: null,
    },
  },
  {
    org: { name: "Island Heritage Archive Trust" },
    role: {
      title: "Trustee, Digital & Data",
      cause: "arts_heritage",
      hours_per_month: 4,
      meeting_pattern: "Monthly board meeting, plus occasional project time for the digitisation work itself (flexible, self-directed)",
      induction: "A look through the uncatalogued collection, plus our existing (thin) data protection notes.",
      purpose: "We hold island photographs, oral histories and documents going back over a century. Nearly all of it is on paper or in boxes, and what little is digital lives on one volunteer's personal laptop with no backup anyone else can access. We also haven't properly thought through data protection for the oral history recordings, some of which include living people discussing sensitive family history.",
      board_skills: [
        { skill: "digital_data", coverage: "missing", note: "Digital archive exists only on one volunteer's personal laptop with no backup" },
        { skill: "project_management", coverage: "thin" },
      ],
      must_have_skills: ["digital_data"],
      diversity_preference: null,
    },
  },
  {
    org: { name: "New Routes Trust" },
    role: {
      title: "General Trustee",
      cause: "employment",
      hours_per_month: 6,
      meeting_pattern: "Monthly board meeting, plus a site visit to one of the three shops on rotation",
      induction: "A tour of all three sites, time with each shop manager, and a walkthrough of our current HR paperwork (such as it is).",
      purpose: "We run three charity shops — Bridge, Town, and our HQ in an old farmhouse out in the Forest — and use the proceeds to fund work-placement and life-skills training for islanders who've struggled to find steady work. We employ nine retail staff across the three shops plus two part-time custodians looking after the properties, and nobody on the board currently has any real HR background. We've been managing rotas, performance conversations and recruitment on instinct rather than good practice, and that's not sustainable as we keep growing. This is a general trustee role, not a specialist one, but HR experience would be very welcome given our real current gap.",
      board_skills: [
        { skill: "hr_people", coverage: "missing", note: "Nine retail staff plus two custodians; no board member has HR/people-management background" },
        { skill: "property_estates", coverage: "thin", note: "Responsible for three physical sites, including an ageing farmhouse HQ" },
      ],
      must_have_skills: [],
      diversity_preference: null,
    },
  },
  {
    org: { name: "Rocquaine Youth Sailing Trust" },
    role: {
      title: "Treasurer & Company Secretary",
      cause: "sport",
      hours_per_month: 6,
      meeting_pattern: "Monthly board meeting, plus the AGM and year-end accounts period",
      induction: "Full handover from our outgoing officer, including the insurance renewal cycle and current grant terms.",
      purpose: "We teach dinghy sailing to islanders aged 8-17. Five years ago we were three volunteers and two boats; now we're twelve boats, RYA-recognised instruction, and a grant that part-funds our safety equipment on condition we submit audited year-end accounts and keep a compliant constitution and AGM record. One volunteer has done the treasurer work and the company-secretary work alone for three years and is stepping back at the end of this season. She's asked us not to simply split the role in two — she believes it needs to be one person who can hold both halves together, the way she has.",
      board_skills: [
        { skill: "finance_treasury", coverage: "missing", note: "Outgoing officer held both treasurer and company-secretary roles alone for 3 years; stepping back end of season" },
        { skill: "governance_company_secretarial", coverage: "missing", note: "Same outgoing officer did constitution, AGM and filings single-handedly; asked the board not to split this into two separate roles" },
      ],
      must_have_skills: ["finance_treasury", "governance_company_secretarial"],
      diversity_preference: null,
    },
  },
];

async function main() {
  const now = new Date().toISOString();
  for (const { org, role } of PILOT) {
    const { data: orgRow, error: orgErr } = await db
      .from("organisations")
      .insert({ name: org.name, verified: false })
      .select("id")
      .single();
    if (orgErr) throw new Error(`org insert failed (${org.name}): ${orgErr.message}`);

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
      published_at: now,
    });
    if (roleErr) throw new Error(`role insert failed (${org.name} / ${role.title}): ${roleErr.message}`);

    console.log(`✓ ${org.name} — ${role.title}`);
  }
}

// Only run when executed directly (`node scripts/seed-pilot.mjs`), not when PILOT is
// imported elsewhere (e.g. scripts/seed-add-one.mjs).
if (import.meta.url === `file://${process.argv[1]}`) {
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
}
