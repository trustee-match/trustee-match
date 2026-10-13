import "server-only";
import type { Level } from "../matching/types";

// The 14 fictional candidate personas (planning/dummy-candidates/test-candidates.md),
// each built to exercise a specific mechanism in the matching engine — not a random
// sample. Used by the reset endpoint (src/app/api/admin/reset/route.ts) to repopulate
// candidates deterministically, bypassing the real AI CV-extraction step entirely (that
// step is still exercised normally via /join — this is only for getting back to a known,
// repeatable state between test sessions, not a substitute for testing extraction itself).
//
// Skills/levels/evidence for the 7 personas already run through the real /join flow
// (Ozanne, Foster, Collins, Williams, Le Page, Robilliard, Jardim) are taken verbatim
// from what the real AI extraction actually produced — the most reliable ground truth
// available. The other 7 are hand-derived from their CVs in test-candidates.md, judged
// against the same level conventions the AI has demonstrated elsewhere (senior: a
// multi-year leadership/specialist career squarely in that skill; professional: solid,
// current, qualified practice; working: real but secondary or less central evidence).
// Peter Collins was run twice during testing with two different (non-deterministic) AI
// outputs — this seed keeps the fuller 4-skill run (peter2@testerson.biz) as canonical.

export interface PilotCandidate {
  name: string;
  email: string;
  headline: string;
  skills: { skill: string; level: Level; evidence: string }[];
  causes: string[];
  hoursPerMonth: number;
  priorBoardExperience: boolean;
  readGuide: boolean;
  conflictOrgNames: string[];
}

export const PILOT_CANDIDATES: PilotCandidate[] = [
  {
    name: "David Ozanne",
    email: "david.ozanne@test.local",
    headline: "Semi-retired Finance Director and Financial Controller",
    hoursPerMonth: 12,
    priorBoardExperience: true,
    readGuide: false,
    causes: ["education", "community", "poverty"],
    conflictOrgNames: [],
    skills: [
      { skill: "finance_treasury", level: "senior", evidence: "Led financial planning, budgeting, forecasting and statutory reporting; Oversaw cash management" },
      { skill: "audit_risk", level: "senior", evidence: "Oversaw cash management, audit preparation and regulatory compliance; risk management and internal controls" },
      { skill: "strategy", level: "professional", evidence: "Worked with operational directors on business strategy and investment decisions" },
      { skill: "hr_people", level: "working", evidence: "Managed a team of eight finance professionals" },
      { skill: "governance_company_secretarial", level: "professional", evidence: "Presented financial performance and risk information to the board" },
    ],
  },
  {
    name: "Beatriz Gouveia",
    email: "beatriz.gouveia@test.local",
    headline: "Social Worker | Safeguarding and Young People's Services",
    hoursPerMonth: 5,
    priorBoardExperience: false,
    readGuide: false,
    causes: ["children_youth", "domestic_abuse"],
    conflictOrgNames: [],
    skills: [
      { skill: "safeguarding", level: "professional", evidence: "Assess safeguarding concerns relating to children and young people, including neglect, emotional abuse, physical abuse and exploitation; undertake statutory assessments and contribute to child protection conferences and core group meetings" },
      { skill: "community_engagement", level: "working", evidence: "Coordinate with schools, police, health professionals, youth services and voluntary organisations to manage safeguarding risks" },
    ],
  },
  {
    name: "Emily Foster",
    email: "emily.foster@test.local",
    headline: "HR Adviser | Former Marketing and Communications Professional",
    hoursPerMonth: 5,
    priorBoardExperience: false,
    readGuide: false,
    causes: ["employment", "mental_health", "community"],
    conflictOrgNames: [],
    skills: [
      { skill: "hr_people", level: "professional", evidence: "Advise managers on employee relations, performance management and absence... Support recruitment, onboarding and employee development." },
      { skill: "marketing_comms", level: "professional", evidence: "Developed and delivered content programmes aligned with business objectives. Wrote copy for websites, newsletters, campaigns and internal communications." },
      { skill: "digital_data", level: "working", evidence: "Designed and produced multi-media assets, including online video... video and podcast production." },
    ],
  },
  {
    name: "Michael Le Page",
    email: "michael.lepage@test.local",
    headline: "Business Development and Sales Professional",
    hoursPerMonth: 5,
    priorBoardExperience: false,
    readGuide: false,
    causes: ["employment", "children_youth", "community"],
    conflictOrgNames: [],
    skills: [
      { skill: "strategy", level: "working", evidence: "Helped build a sales development function from an initial team of three to a team of 12." },
      { skill: "hr_people", level: "professional", evidence: "Introduced onboarding and coaching for new sales agents. Trained colleagues in consultative selling, objection handling and account development." },
      { skill: "operations", level: "professional", evidence: "Designed lead qualification processes, sales scripts and performance reporting." },
      { skill: "marketing_comms", level: "working", evidence: "Worked with marketing to improve lead quality and campaign conversion." },
    ],
  },
  {
    name: "Peter Collins",
    email: "peter.collins@test.local",
    headline: "Retired taxi driver and former Scout Leader",
    hoursPerMonth: 5,
    priorBoardExperience: false,
    readGuide: true,
    causes: ["children_youth", "community"],
    conflictOrgNames: [],
    skills: [
      { skill: "community_engagement", level: "working", evidence: "Met just about every sort of person... sometimes all they need is somebody who'll listen without judging them" },
      { skill: "youth_voice", level: "working", evidence: "Scout Leader for many years, helping youngsters learn things, have a go at something new and grow in confidence" },
      { skill: "safeguarding", level: "working", evidence: "As a Scout Leader, I had to think about the young people, make sure things were safe and work with parents and other leaders" },
      { skill: "operations", level: "working", evidence: "We organised camps, trips and activities, and there was always something that needed sorting out" },
    ],
  },
  {
    name: "Liga Kalnina",
    email: "liga.kalnina@test.local",
    headline: "Digital Product Manager | Technology and Service Improvement",
    hoursPerMonth: 4,
    priorBoardExperience: false,
    readGuide: false,
    causes: ["education", "disability", "community"],
    conflictOrgNames: [],
    skills: [
      { skill: "digital_data", level: "senior", evidence: "Lead the development roadmap for a customer-facing digital platform... Worked with compliance teams to address data protection and security requirements." },
      { skill: "strategy", level: "professional", evidence: "Manage competing priorities, delivery risks and resource constraints; strategic and operational planning." },
    ],
  },
  {
    name: "Robert Williams",
    email: "robert.williams@test.local",
    headline: "School Headteacher | Education and Community Leadership",
    hoursPerMonth: 10,
    priorBoardExperience: true,
    readGuide: false,
    causes: ["education", "children_youth", "poverty"],
    conflictOrgNames: [],
    skills: [
      { skill: "education", level: "senior", evidence: "Senior education leader with more than 20 years of experience across teaching, school improvement and organisational leadership" },
      { skill: "safeguarding", level: "senior", evidence: "Oversee staffing, budgets, safeguarding arrangements and resource allocation" },
      { skill: "strategy", level: "senior", evidence: "Lead school strategy, improvement planning and organisational performance" },
      { skill: "hr_people", level: "senior", evidence: "Lead recruitment, performance development and staff wellbeing initiatives" },
      { skill: "finance_treasury", level: "professional", evidence: "Oversee staffing, budgets, safeguarding arrangements and resource allocation" },
      { skill: "community_engagement", level: "professional", evidence: "Build partnerships with families, local services and community organisations" },
    ],
  },
  {
    name: "Leanne Robilliard",
    email: "leanne.robilliard@test.local",
    headline: "Freelance Artist and Community Arts Facilitator",
    hoursPerMonth: 5,
    priorBoardExperience: true,
    readGuide: true,
    causes: ["arts_heritage", "community", "disability"],
    conflictOrgNames: [],
    skills: [
      { skill: "arts_culture", level: "professional", evidence: "Freelance Illustrator and Designer...Develop visual concepts and artwork for clients" },
      { skill: "community_engagement", level: "professional", evidence: "Collaborate with community organisations to reach underserved groups" },
      { skill: "education", level: "working", evidence: "Plan and deliver accessible creative workshops. Adapt activities for different ages, abilities and confidence levels" },
      { skill: "safeguarding", level: "working", evidence: "Follow organisational safeguarding and health and safety procedures; safeguarding awareness training" },
      { skill: "project_management", level: "working", evidence: "Deliver projects independently, balancing creative quality against budgets and deadlines; project and budget management" },
      { skill: "marketing_comms", level: "working", evidence: "Promote services through digital portfolios and social media" },
    ],
  },
  {
    name: "Sofia Nobrega",
    email: "sofia.nobrega@test.local",
    headline: "Employment Solicitor | Employment Rights and Governance",
    hoursPerMonth: 4,
    priorBoardExperience: false,
    readGuide: false,
    causes: ["domestic_abuse", "employment"],
    conflictOrgNames: [],
    skills: [
      { skill: "legal", level: "senior", evidence: "Advise employers on complex employment matters and dispute resolution; Senior Associate, Employment Law, 8 years of experience advising employers on employment law, workplace disputes and organisational policies" },
    ],
  },
  {
    name: "Samuel Carter",
    email: "samuel.carter@test.local",
    headline: "Community Development Officer | Volunteer and Partnership Coordination",
    hoursPerMonth: 6,
    priorBoardExperience: false,
    readGuide: false,
    causes: ["poverty", "community", "older_people"],
    conflictOrgNames: [],
    skills: [
      { skill: "fundraising", level: "professional", evidence: "Help identify funding opportunities and prepare grant applications; grant applications and reporting" },
      { skill: "community_engagement", level: "professional", evidence: "Build relationships with residents, community groups and statutory partners; organise community consultations and use feedback to shape local activities" },
      { skill: "hr_people", level: "working", evidence: "Recruit and support volunteers, including induction and ongoing supervision" },
    ],
  },
  {
    name: "Colin Mitchell",
    email: "colin.mitchell@test.local",
    headline: "Finance Director",
    hoursPerMonth: 2,
    priorBoardExperience: false,
    readGuide: false,
    causes: ["poverty", "community"],
    conflictOrgNames: [],
    skills: [
      { skill: "finance_treasury", level: "senior", evidence: "Leads financial planning, statutory reporting and board-level financial presentations for a mid-sized group" },
      { skill: "audit_risk", level: "professional", evidence: "Oversees audit, tax and regulatory compliance" },
    ],
  },
  {
    name: "Paul Mauger",
    email: "paul.mauger@test.local",
    headline: "Company Secretary and Finance Professional",
    hoursPerMonth: 6,
    priorBoardExperience: true,
    readGuide: false,
    causes: ["sport", "education", "community"],
    conflictOrgNames: ["Longfield Foodbank"],
    skills: [
      { skill: "governance_company_secretarial", level: "senior", evidence: "Managed statutory filings, board papers, AGMs and constitutional matters; ICSA-chartered governance professional" },
      { skill: "finance_treasury", level: "professional", evidence: "Supports small charities and clubs with combined treasurer/company-secretary work: accounts, filings, constitutions, AGMs; AAT-qualified in accounting" },
    ],
  },
  {
    name: "Fatima Jardim",
    email: "fatima.jardim@test.local",
    headline: "Retired District Nurse and Health Visitor",
    hoursPerMonth: 5,
    priorBoardExperience: false,
    readGuide: false,
    causes: ["health", "mental_health", "disability"],
    conflictOrgNames: [],
    skills: [
      { skill: "clinical_health", level: "senior", evidence: "Long NHS career in community nursing and health visiting; developmental checks, immunisation programmes, caseloads of patients with long-term and palliative care needs" },
      { skill: "education", level: "working", evidence: "Delivered health education sessions to new parents" },
      { skill: "hr_people", level: "working", evidence: "Trained and supervised junior nursing staff" },
      { skill: "safeguarding", level: "working", evidence: "Early identification of health and wellbeing concerns; worked closely with GPs, midwives and social care on complex family cases" },
      { skill: "community_engagement", level: "working", evidence: "Supported families with young children... multi-agency health coordination" },
    ],
  },
  {
    name: "Andris Liepa",
    email: "andris.liepa@test.local",
    headline: "Retired Facilities and Community Centre Manager",
    hoursPerMonth: 6,
    priorBoardExperience: true,
    readGuide: false,
    causes: ["community", "sport"],
    conflictOrgNames: [],
    skills: [
      { skill: "community_engagement", level: "professional", evidence: "Built relationships with user groups, funders and the local council; sat on the centre's own management committee for the last six years of his tenure, including two years as vice-chair" },
      { skill: "property_estates", level: "professional", evidence: "Oversaw building maintenance, contractors and health & safety for the site; managed routine and reactive maintenance across a portfolio of residential and community buildings" },
    ],
  },
];
