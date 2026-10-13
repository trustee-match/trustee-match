import "server-only";
import type { BoardSkillCell } from "../matching/types";

// The single source of truth for the 8 invented pilot charities/roles and their
// contacts — ported from scripts/seed-pilot.mjs and scripts/seed-charity-contacts.mjs
// (now retired) so the reset endpoint (src/app/api/admin/reset/route.ts) can reseed
// them without duplicating this data in two places. See planning/responsible-design-
// decisions.md, Accuracy: "Invented pilot charities read as candid/realistic by design."

export interface PilotOrg {
  name: string;
  contactName: string;
  contactEmail: string;
  role: {
    title: string;
    cause: string;
    purpose: string;
    hoursPerMonth: number;
    meetingPattern: string;
    induction: string;
    boardSkills: BoardSkillCell[];
    mustHaveSkills: string[];
    diversityPreference: string | null;
  };
}

// Contact names chosen the same way as the 14 candidate personas
// (planning/dummy-candidates/test-candidates.md): reflecting Guernsey's actual
// demographic mix — predominantly Guernsey French surnames, UK mainland (England and
// Northern Ireland), a Madeiran community, and a lower density of other European
// nationalities (e.g. Latvian).
export const PILOT_ORGS: PilotOrg[] = [
  {
    name: "Longfield Foodbank",
    contactName: "Diane Falla", // Guernsey French
    contactEmail: "diane.falla@test.local",
    role: {
      title: "Treasurer",
      cause: "poverty",
      hoursPerMonth: 7,
      meetingPattern: "Monthly board meeting, plus extra time in the first three months for the back-year catch-up",
      induction: "No formal handover — the outgoing treasurer left without one. The part-time bookkeeper (1 day/week) can walk you through what records exist.",
      purpose: "We serve about 140 households a month. Our treasurer of six years resigned suddenly in May for personal reasons, and nobody on the board has the background to pick it up properly. There's been no management accounts since February and no bank reconciliation review since the handover gap started — we don't know our real reserve position right now. Our biggest funder requires audited accounts in four months and we are not ready.",
      boardSkills: [
        { skill: "finance_treasury", coverage: "missing", note: "Treasurer resigned suddenly in May with no handover; no management accounts produced since February" },
        { skill: "audit_risk", coverage: "thin", note: "No external review of controls in over two years" },
      ],
      mustHaveSkills: ["finance_treasury"],
      diversityPreference: null,
    },
  },
  {
    name: "Bailiwick Young Carers",
    contactName: "Siobhan Doherty", // Northern Ireland
    contactEmail: "siobhan.doherty@test.local",
    role: {
      title: "Trustee, Safeguarding",
      cause: "children_youth",
      hoursPerMonth: 5,
      meetingPattern: "Monthly evening board meeting (Tuesdays)",
      induction: "Handover sessions with the outgoing safeguarding lead before she steps down in December, plus the existing policy pack.",
      purpose: "We support around 60 children and young people across the Bailiwick who care for a family member at home. Our safeguarding lead on the board is stepping down at the end of the year after eight years, and nobody else could currently pick it up. An external review of our safeguarding arrangements is likely in the next 12–18 months, and our policies haven't had a full review since 2023.",
      boardSkills: [
        { skill: "safeguarding", coverage: "missing", note: "Safeguarding lead stepping down in December after 8 years; no successor identified" },
        { skill: "hr_people", coverage: "thin" },
      ],
      mustHaveSkills: ["safeguarding"],
      diversityPreference: null,
    },
  },
  {
    name: "Vale Community Hub",
    contactName: "Carlos Freitas", // Madeiran
    contactEmail: "carlos.freitas@test.local",
    role: {
      title: "General Trustee",
      cause: "community",
      hoursPerMonth: 4,
      meetingPattern: "Monthly board meeting, Wednesday evenings",
      induction: "Half-day induction with the chair, plus sitting in on one meeting as an observer first if you'd like.",
      purpose: "We run a community space used by about a dozen local groups. We're a small, close board of five who are stretched thin covering everything from room bookings to grant reporting. We're not short of any one professional skill right now — we just need another steady pair of hands who'll turn up, read the papers, and help us think things through as we grow. We'd love this to be someone's first trustee role.",
      boardSkills: [{ skill: "community_engagement", coverage: "thin" }],
      mustHaveSkills: [],
      diversityPreference: "first_time_trustee",
    },
  },
  {
    name: "Petit Bot Wildlife Rescue",
    contactName: "Mark Thompson", // UK mainland
    contactEmail: "mark.thompson@test.local",
    role: {
      title: "Trustee, Marketing & Communications",
      cause: "animals",
      hoursPerMonth: 5,
      meetingPattern: "Monthly board meeting, plus occasional ad hoc input between meetings",
      induction: "Walkthrough of current channels (a Facebook page, mostly) and what little brand material exists.",
      purpose: "We rescue and rehabilitate around 300 injured and orphaned animals a year. Almost nobody outside our existing supporters knows we exist, and our funding — almost entirely small individual donations — has been flat for three years while vet bills haven't. We've never had anyone on the board who knows what they're doing on the comms side.",
      boardSkills: [
        { skill: "marketing_comms", coverage: "missing", note: "No board member with marketing/communications background; donor numbers flat for 3 years" },
        { skill: "fundraising", coverage: "thin" },
      ],
      mustHaveSkills: ["marketing_comms"],
      diversityPreference: null,
    },
  },
  {
    name: "Clos du Parc Day Centre",
    contactName: "Jean Nicolle", // Guernsey French
    contactEmail: "jean.nicolle@test.local",
    role: {
      title: "Trustee, Fundraising",
      cause: "older_people",
      hoursPerMonth: 6,
      meetingPattern: "Monthly board meeting, plus a termly fundraising-strategy session",
      induction: "Session with the centre manager to understand the service, plus access to existing grant records.",
      purpose: "We run a day centre for around 45 older islanders at real risk of isolation. A grant covering roughly half our running costs for the last six years ends next March and won't be renewed. We don't have anyone on the board with real fundraising or bid-writing experience, and closing days or cutting transport are the realistic alternatives if we don't fix this before March.",
      boardSkills: [
        { skill: "fundraising", coverage: "missing", note: "Grant covering ~half of running costs ends March 2027 and will not be renewed" },
        { skill: "strategy", coverage: "thin" },
      ],
      mustHaveSkills: ["fundraising"],
      diversityPreference: null,
    },
  },
  {
    name: "Island Heritage Archive Trust",
    contactName: "Helen Marshall", // UK mainland
    contactEmail: "helen.marshall@test.local",
    role: {
      title: "Trustee, Digital & Data",
      cause: "arts_heritage",
      hoursPerMonth: 4,
      meetingPattern: "Monthly board meeting, plus occasional project time for the digitisation work itself (flexible, self-directed)",
      induction: "A look through the uncatalogued collection, plus our existing (thin) data protection notes.",
      purpose: "We hold island photographs, oral histories and documents going back over a century. Nearly all of it is on paper or in boxes, and what little is digital lives on one volunteer's personal laptop with no backup anyone else can access. We also haven't properly thought through data protection for the oral history recordings, some of which include living people discussing sensitive family history.",
      boardSkills: [
        { skill: "digital_data", coverage: "missing", note: "Digital archive exists only on one volunteer's personal laptop with no backup" },
        { skill: "project_management", coverage: "thin" },
      ],
      mustHaveSkills: ["digital_data"],
      diversityPreference: null,
    },
  },
  {
    name: "New Routes Trust",
    contactName: "Teresa Abreu", // Madeiran
    contactEmail: "teresa.abreu@test.local",
    role: {
      title: "General Trustee",
      cause: "employment",
      hoursPerMonth: 6,
      meetingPattern: "Monthly board meeting, plus a site visit to one of the three shops on rotation",
      induction: "A tour of all three sites, time with each shop manager, and a walkthrough of our current HR paperwork (such as it is).",
      purpose: "We run three charity shops — Bridge, Town, and our HQ in an old farmhouse out in the Forest — and use the proceeds to fund work-placement and life-skills training for islanders who've struggled to find steady work. We employ nine retail staff across the three shops plus two part-time custodians looking after the properties, and nobody on the board currently has any real HR background. We've been managing rotas, performance conversations and recruitment on instinct rather than good practice, and that's not sustainable as we keep growing. This is a general trustee role, not a specialist one, but HR experience would be very welcome given our real current gap.",
      boardSkills: [
        { skill: "hr_people", coverage: "missing", note: "Nine retail staff plus two custodians; no board member has HR/people-management background" },
        { skill: "property_estates", coverage: "thin", note: "Responsible for three physical sites, including an ageing farmhouse HQ" },
      ],
      mustHaveSkills: [],
      diversityPreference: null,
    },
  },
  {
    name: "Rocquaine Youth Sailing Trust",
    contactName: "Andrejs Ozols", // Latvian
    contactEmail: "andrejs.ozols@test.local",
    role: {
      title: "Treasurer & Company Secretary",
      cause: "sport",
      hoursPerMonth: 6,
      meetingPattern: "Monthly board meeting, plus the AGM and year-end accounts period",
      induction: "Full handover from our outgoing officer, including the insurance renewal cycle and current grant terms.",
      purpose: "We teach dinghy sailing to islanders aged 8-17. Five years ago we were three volunteers and two boats; now we're twelve boats, RYA-recognised instruction, and a grant that part-funds our safety equipment on condition we submit audited year-end accounts and keep a compliant constitution and AGM record. One volunteer has done the treasurer work and the company-secretary work alone for three years and is stepping back at the end of this season. She's asked us not to simply split the role in two — she believes it needs to be one person who can hold both halves together, the way she has.",
      boardSkills: [
        { skill: "finance_treasury", coverage: "missing", note: "Outgoing officer held both treasurer and company-secretary roles alone for 3 years; stepping back end of season" },
        { skill: "governance_company_secretarial", coverage: "missing", note: "Same outgoing officer did constitution, AGM and filings single-handedly; asked the board not to split this into two separate roles" },
      ],
      mustHaveSkills: ["finance_treasury", "governance_company_secretarial"],
      diversityPreference: null,
    },
  },
];
