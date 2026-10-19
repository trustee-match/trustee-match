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
  /** Null for Peter Collins — consistent with his own words ("I've never been one for
   *  office work and haven't got a proper CV"); real for everyone else. */
  linkedinUrl: string | null;
  headline: string;
  /** The CV text (or, for Peter Collins, personal statement) as it would be pasted into
   *  /join — stored to candidates.cv_text on seed, same as a real confirm does, so the
   *  /profiles page's "View CV" modal (src/app/profiles/submission-modal.tsx) has something to show
   *  for seeded personas, not just freshly-run ones. */
  cvText: string;
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
    linkedinUrl: "https://www.linkedin.com/in/david-ozanne",
    headline: "Semi-retired Finance Director and Financial Controller",
    cvText: `David Ozanne
Semi-retired Finance Director and Financial Controller

An experienced finance professional with more than 35 years of experience across
commercial organisations and the charity sector. Now semi-retired, David is interested
in using his financial knowledge to support organisations with a strong social purpose.
He is methodical, calm under pressure and accustomed to explaining complex financial
information to non-financial colleagues.

PROFESSIONAL EXPERIENCE

Interim Finance Consultant | Self-employed | 2022-present
- Provide occasional financial planning and reporting support to small organisations.
- Help business owners understand cash flow, budgets and financial risks.
- Support annual budgeting and review financial controls.

Finance Director | Midlands Manufacturing Group | 2008-2022
- Led financial planning, budgeting, forecasting and statutory reporting.
- Presented financial performance and risk information to the board.
- Oversaw cash management, audit preparation and regulatory compliance.
- Managed a team of eight finance professionals.
- Worked with operational directors on business strategy and investment decisions.

Financial Controller | Regional Distribution Company | 1996-2008
- Managed monthly management accounts and annual budgets.
- Introduced improved reporting processes and internal financial controls.
- Coordinated external audits and supported tax and statutory reporting requirements.

Earlier career: progressed through management accounting and financial accounting roles.

SKILLS
Financial oversight and budget management; risk management and internal controls;
audit and regulatory compliance; strategic planning; board-level reporting;
constructive challenge and financial scrutiny.

QUALIFICATIONS
Chartered Accountant (ACA); BSc Accounting and Finance`,
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
    linkedinUrl: "https://www.linkedin.com/in/beatriz-gouveia",
    headline: "Social Worker | Safeguarding and Young People's Services",
    cvText: `Beatriz Gouveia
Social Worker | Safeguarding and Young People's Services

A qualified social worker with 10 years of professional experience supporting
children, young people and families. Experienced in safeguarding, risk assessment,
multi-agency working and advocating for young people whose voices may otherwise be
overlooked. A thoughtful practitioner who understands the importance of
accountability, confidentiality and professional boundaries.

PROFESSIONAL EXPERIENCE

Children and Families Social Worker | Local Authority Children's Services | 2019-present
- Assess safeguarding concerns relating to children and young people, including
  neglect, emotional abuse, physical abuse and exploitation.
- Undertake statutory assessments and contribute to child protection conferences and
  core group meetings.
- Develop, implement and review child protection and child-in-need plans.
- Identify and respond to risks associated with child sexual exploitation, criminal
  exploitation, missing episodes and contextual safeguarding.
- Work directly with young people to understand their wishes, feelings and lived
  experiences.
- Coordinate with schools, police, health professionals, youth services and voluntary
  organisations to manage safeguarding risks.
- Escalate immediate concerns and ensure referrals are made in line with statutory
  procedures.
- Maintain accurate, timely and confidential case records.
- Support young people transitioning towards adulthood and greater independence.
- Contribute to case reviews and discussions aimed at improving safeguarding practice.

Family Support Practitioner | Community Family Service | 2016-2019
- Supported families experiencing difficulties with housing, education, family
  relationships and access to services.
- Helped identify early signs of harm and referred concerns to appropriate
  professionals.
- Delivered practical and emotional support to parents and young people.
- Worked alongside schools and community organisations to improve outcomes for
  families.

SKILLS
Safeguarding and child protection; risk assessment and professional judgement;
trauma-informed practice; multi-agency collaboration; confidentiality and information
governance; listening, advocacy and communication; ethical decision-making.

QUALIFICATIONS
BA (Hons) Social Work; Social Work England registered; regular safeguarding and
professional development training.`,
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
    linkedinUrl: "https://www.linkedin.com/in/emily-foster",
    headline: "HR Adviser | Former Marketing and Communications Professional",
    cvText: `Emily Foster
HR Adviser | Former Marketing and Communications Professional

A people-focused professional who moved from marketing and communications into Human
Resources five years ago. Brings a combination of creative communication skills,
employee relations experience and an understanding of organisational culture. Recently
developed a particular interest in inclusive workplaces, staff wellbeing and the role
of good leadership in retaining people.

PROFESSIONAL EXPERIENCE

HR Adviser | National Professional Services Firm | 2023-present
- Advise managers on employee relations, performance management and absence.
- Support recruitment, onboarding and employee development.
- Help implement people policies and improve consistency across teams.
- Contribute to employee engagement initiatives and staff communications.
- Support investigations and sensitive workplace conversations.

HR Coordinator | Regional Healthcare Organisation | 2021-2023
- Coordinated recruitment administration and onboarding.
- Maintained personnel records and supported HR reporting.
- Assisted with learning and development programmes.
- Helped review staff feedback and identify opportunities to improve employee
  experience.

Marketing and Communications Executive | Consumer Services Company | 2015-2021
- Developed and delivered content programmes aligned with business objectives.
- Wrote copy for websites, newsletters, campaigns and internal communications.
- Designed and produced multi-media assets, including online video.
- Helped develop and produce a corporate podcast, from planning topics and
  coordinating contributors to preparing content for publication.
- Worked with designers, subject matter experts and external agencies.
- Monitored content engagement and used performance insights to improve future
  output.

(Emily left marketing and communications in 2021 and has worked in HR since then.)

SKILLS
HR policy and employee relations; recruitment and employee engagement; content design
and production; copywriting and editorial planning; video and podcast production;
internal communications; stakeholder engagement.

QUALIFICATIONS
CIPD Level 5 Associate Diploma in People Management; BA (Hons) Media and
Communications; additional training in workplace mediation.`,
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
    linkedinUrl: "https://www.linkedin.com/in/michael-le-page",
    headline: "Business Development and Sales Professional",
    cvText: `Michael Le Page
Business Development and Sales Professional

A commercially minded sales professional with 10 years of direct business-to-business
sales experience. Has progressed from individual sales delivery into building sales
capability, improving processes and training colleagues. Enjoys developing
relationships, understanding customer needs and helping teams perform well. Wants to
use commercial experience in a mission-led organisation.

PROFESSIONAL EXPERIENCE

Sales Development Manager | Business Technology Provider | 2021-present
- Helped build a sales development function from an initial team of three to a team
  of 12.
- Designed lead qualification processes, sales scripts and performance reporting.
- Introduced onboarding and coaching for new sales agents.
- Trained colleagues in consultative selling, objection handling and account
  development.
- Worked with marketing to improve lead quality and campaign conversion.
- Monitored team performance against activity, pipeline and revenue targets.

Business Development Executive | B2B Software Company | 2016-2021
- Managed the full sales cycle, from prospecting and qualification to negotiation and
  closing.
- Developed relationships with business owners, department heads and procurement
  teams.
- Prepared proposals and presentations tailored to customer needs.
- Maintained a sales pipeline and forecast.
- Consistently worked towards revenue and new-business targets.

Sales Representative | Office Equipment Supplier | 2014-2016
- Generated new business through outbound prospecting and referrals.
- Maintained customer relationships and identified opportunities for repeat business.
- Negotiated pricing and service agreements.

SKILLS
B2B sales and relationship management; business development; team building and
coaching; process design and improvement; negotiation and influencing; performance
monitoring; commercial planning.

QUALIFICATIONS
HND Business and Marketing; Certificate in Sales Management; ongoing professional
development in leadership and coaching.`,
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
    linkedinUrl: null,
    headline: "Retired taxi driver and former Scout Leader",
    cvText: `I've recently retired after driving taxis for about 50 years. I've met just about
every sort of person you can imagine and heard plenty of stories along the way. Most
people have something going on in their lives, and sometimes all they need is
somebody who'll listen without judging them.

I was a Scout Leader for many years too. I enjoyed helping the youngsters learn
things, have a go at something new and grow in confidence. We organised camps, trips
and activities, and there was always something that needed sorting out. You learn to
be patient and to get on with all sorts of people.

I've never been one for office work and haven't got a proper CV. I left school a long
time ago and went straight into work. I've always turned up, done my best and tried to
treat people fairly.

I suppose I'm good at talking to people and getting them to feel comfortable. I can
usually tell when somebody isn't quite themselves. I've helped passengers who were
upset or worried, and I've always tried to be dependable. As a Scout Leader, I had to
think about the young people, make sure things were safe and work with parents and
other leaders.

I don't have experience running a charity, and I wouldn't pretend to know everything
about being a trustee. But I care about people, I have plenty of common sense, and
I'm willing to learn. I'd like to give some of my time to something worthwhile now
that I'm retired.`,
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
    linkedinUrl: "https://www.linkedin.com/in/liga-kalnina",
    headline: "Digital Product Manager | Technology and Service Improvement",
    cvText: `Liga Kalnina
Digital Product Manager | Technology and Service Improvement

An experienced digital product manager with a background in delivering
technology-enabled services. Skilled at translating complex problems into practical
solutions, balancing user needs against organisational priorities and coordinating
multidisciplinary teams. Interested in using digital skills to improve access to
public and community services.

PROFESSIONAL EXPERIENCE

Senior Product Manager | Digital Services Company | 2022-present
- Lead the development roadmap for a customer-facing digital platform.
- Gather user feedback and translate it into prioritised product improvements.
- Coordinate engineers, designers, analysts and business stakeholders.
- Monitor performance measures and use data to inform decisions.
- Manage competing priorities, delivery risks and resource constraints.

Product Manager | Online Services Business | 2018-2022
- Managed product development from discovery through to launch.
- Introduced structured user research and regular feedback sessions.
- Improved accessibility and usability across key digital journeys.
- Worked with compliance teams to address data protection and security requirements.

Business Analyst | Financial Services Company | 2015-2018
- Mapped business processes and identified inefficiencies.
- Gathered requirements for technology projects.
- Produced recommendations for operational improvements.

SKILLS
Strategic and operational planning; digital transformation; data-informed
decision-making; risk and issue management; user-centred design; stakeholder
management; accessibility and service improvement.

QUALIFICATIONS
MSc Information Systems; BSc Computer Science; Agile product management
certification.`,
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
    linkedinUrl: "https://www.linkedin.com/in/robert-williams",
    headline: "School Headteacher | Education and Community Leadership",
    cvText: `Robert Williams
School Headteacher | Education and Community Leadership

A senior education leader with more than 20 years of experience across teaching,
school improvement and organisational leadership. Experienced in safeguarding, staff
development, budgets, governance and working with families and community partners.
Motivated by improving opportunities for children and reducing barriers to learning.

PROFESSIONAL EXPERIENCE

Headteacher | Community Secondary School | 2016-present
- Lead school strategy, improvement planning and organisational performance.
- Oversee staffing, budgets, safeguarding arrangements and resource allocation.
- Work with governors to monitor educational outcomes and manage strategic risks.
- Lead recruitment, performance development and staff wellbeing initiatives.
- Build partnerships with families, local services and community organisations.
- Support inclusive practice and improvements for disadvantaged pupils.

Deputy Headteacher | Comprehensive School | 2010-2016
- Managed curriculum development and quality improvement.
- Coordinated staff training and leadership development.
- Supported behaviour, attendance and safeguarding initiatives.

Teacher and Department Lead | Secondary Schools | 2003-2010
- Taught humanities and led a subject department.
- Mentored early-career teachers and supported curriculum planning.

SKILLS
Strategic leadership and governance; safeguarding and child welfare; budget
management; organisational culture; staff recruitment and development; performance
monitoring; partnership working.

QUALIFICATIONS
PGCE; BA (Hons) History; National Professional Qualification for Headship; current
safeguarding leadership training.`,
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
    linkedinUrl: "https://www.linkedin.com/in/leanne-robilliard",
    headline: "Freelance Artist and Community Arts Facilitator",
    cvText: `Leanne Robilliard
Freelance Artist and Community Arts Facilitator

A creative practitioner who combines freelance illustration with community arts
projects. Experienced in making creative activities accessible to people who may not
ordinarily engage with the arts. Has worked with children, adults with additional
support needs and community groups. Brings empathy, adaptability and a practical
understanding of small-scale project delivery.

PROFESSIONAL EXPERIENCE

Freelance Illustrator and Designer | Self-employed | 2017-present
- Develop visual concepts and artwork for clients in education, publishing and
  community services.
- Manage client relationships, pricing, project schedules and invoicing.
- Deliver projects independently, balancing creative quality against budgets and
  deadlines.
- Promote services through digital portfolios and social media.

Community Arts Facilitator | Local Arts Charity | 2020-present, part-time
- Plan and deliver accessible creative workshops.
- Adapt activities for different ages, abilities and confidence levels.
- Collaborate with community organisations to reach underserved groups.
- Help evaluate participation and gather feedback from attendees.
- Follow organisational safeguarding and health and safety procedures.

Studio Assistant | Independent Design Studio | 2014-2017
- Supported production schedules and client projects.
- Prepared visual assets and coordinated materials.
- Helped organise exhibitions and community events.

SKILLS
Creative problem-solving; community engagement; workshop facilitation; project and
budget management; communication and accessibility; relationship building;
independent working.

QUALIFICATIONS
BA (Hons) Illustration; Certificate in Community Arts Practice; safeguarding
awareness training.`,
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
    linkedinUrl: "https://www.linkedin.com/in/sofia-nobrega",
    headline: "Employment Solicitor | Employment Rights and Governance",
    cvText: `Sofia Nobrega
Employment Solicitor | Employment Rights and Governance

A solicitor with eight years of experience advising employers on employment law,
workplace disputes and organisational policies. Combines analytical thinking with a
practical understanding of people-related risks. Interested in helping charities
create fair, transparent and well-governed workplaces.

PROFESSIONAL EXPERIENCE

Senior Associate, Employment Law | Regional Law Firm | 2023-present
- Advise employers on complex employment matters and dispute resolution.
- Support organisations with disciplinary procedures, grievances and restructuring.
- Review employment policies and provide guidance on legal compliance.
- Explain legal risks and options to senior decision-makers.
- Supervise junior colleagues and contribute to client training.

Employment Solicitor | Commercial Law Firm | 2018-2023
- Drafted employment contracts, settlement agreements and workplace policies.
- Supported clients responding to tribunal claims.
- Advised on redundancy, performance management and discrimination matters.
- Researched legal developments and prepared clear written advice.

Additional experience: volunteers occasionally at a local employment advice clinic,
helping individuals understand workplace procedures and identify appropriate sources
of support.

SKILLS
Employment law and regulatory compliance; risk identification and mitigation; policy
development; confidentiality and professional ethics; written communication;
constructive challenge; dispute resolution.

QUALIFICATIONS
LLB Law; Solicitor of England and Wales; continuing professional development in
employment law.`,
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
    linkedinUrl: "https://www.linkedin.com/in/samuel-carter",
    headline: "Community Development Officer | Volunteer and Partnership Coordination",
    cvText: `Samuel Carter
Community Development Officer | Volunteer and Partnership Coordination

A community development professional with six years of experience coordinating local
projects and supporting volunteer-led initiatives. Experienced in bringing together
residents, charities and public services to address practical community needs.
Approachable and organised, with a strong belief that communities should help shape
the services designed for them.

PROFESSIONAL EXPERIENCE

Community Development Officer | Neighbourhood Partnership Organisation | 2022-present
- Coordinate projects addressing social isolation, food insecurity and access to
  local services.
- Build relationships with residents, community groups and statutory partners.
- Organise community consultations and use feedback to shape local activities.
- Monitor project spending and report progress to funders.
- Recruit and support volunteers, including induction and ongoing supervision.
- Help identify funding opportunities and prepare grant applications.

Project Coordinator | Regional Voluntary Sector Organisation | 2020-2022
- Coordinated a programme supporting people into volunteering.
- Maintained project records and prepared outcome reports.
- Organised training sessions and networking events.
- Worked with partner organisations to improve referrals and participation.

Community Support Worker | Local Advice Centre | 2018-2020
- Helped residents navigate local services and support options.
- Supported community events and information sessions.
- Signposted people to specialist organisations where appropriate.

VOLUNTEERING
Volunteer coordinator for a monthly community food-sharing project; occasional
mentor for young adults exploring volunteering and employment; participates in local
neighbourhood improvement initiatives.

SKILLS
Community engagement; volunteer recruitment and support; partnership development;
project planning and delivery; grant applications and reporting; inclusive
communication; monitoring and evaluation.

QUALIFICATIONS
BA (Hons) Sociology; Certificate in Community Development; First Aid at Work.`,
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
    linkedinUrl: "https://www.linkedin.com/in/colin-mitchell",
    headline: "Finance Director",
    cvText: `Colin Mitchell
Finance Director

A senior finance professional with a strong corporate background. Experienced in
financial planning, statutory reporting and board-level presentation of financial
performance.

PROFESSIONAL EXPERIENCE

Finance Director | Channel Islands Logistics Group | 2017-present
- Leads financial planning, statutory reporting and board-level financial
  presentations for a mid-sized group.
- Oversees audit, tax and regulatory compliance.
- Manages a small finance team.

Financial Controller | Regional Retail Group | 2009-2017
- Managed management accounts, budgeting and financial controls.
- Supported external audit and statutory reporting.

SKILLS
Financial oversight and budget management; audit and regulatory compliance;
board-level reporting.

QUALIFICATIONS
Chartered Accountant (ACA)`,
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
    linkedinUrl: "https://www.linkedin.com/in/paul-mauger",
    headline: "Company Secretary and Finance Professional",
    cvText: `Paul Mauger
Company Secretary and Finance Professional

A governance and finance generalist with experience doing both the numbers and the
paperwork side of board life. Supports small charities and clubs with combined
treasurer/company-secretary work.

PROFESSIONAL EXPERIENCE

Finance & Governance Consultant | Self-employed, part-time | 2021-present
- Supports small charities and clubs with combined treasurer/company-secretary
  work: accounts, filings, constitutions, AGMs.
- Has set up proper financial controls and governance paperwork from scratch for two
  small organisations.

Company Secretary | Regional Trade Association | 2005-2021
- Managed statutory filings, board papers, AGMs and constitutional matters.
- Coordinated with the association's treasurer on annual accounts and audit.
- Advised the board on governance compliance and risk.

SKILLS
Governance and company secretarial practice; financial oversight and reporting;
constitutions, AGMs and statutory filings; risk and compliance.

QUALIFICATIONS
ICSA-chartered governance professional; AAT-qualified in accounting.`,
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
    linkedinUrl: "https://www.linkedin.com/in/fatima-jardim",
    headline: "Retired District Nurse and Health Visitor",
    cvText: `Fatima Jardim
Retired District Nurse and Health Visitor

A retired health professional with a long NHS career in community nursing and health
visiting.

PROFESSIONAL EXPERIENCE

Health Visitor | Community Health Services | 2005-2023
- Supported families with young children, including developmental checks,
  immunisation programmes and early identification of health and wellbeing concerns.
- Worked closely with GPs, midwives and social care on complex family cases.
- Delivered health education sessions to new parents.

District Nurse | Regional Health Authority | 1990-2005
- Provided clinical nursing care to patients in their own homes.
- Managed caseloads of patients with long-term and palliative care needs.
- Trained and supervised junior nursing staff.

SKILLS
Clinical and community health practice; patient and family support; multi-agency
health coordination; training and supervision.

QUALIFICATIONS
Registered General Nurse (RGN); Specialist Community Public Health Nurse (Health
Visiting).`,
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
    linkedinUrl: "https://www.linkedin.com/in/andris-liepa",
    headline: "Retired Facilities and Community Centre Manager",
    cvText: `Andris Liepa
Retired Facilities and Community Centre Manager

A retired facilities/community-centre manager with hands-on experience running a
busy shared building, and six years on its own management committee including two
as vice-chair.

PROFESSIONAL EXPERIENCE

Community Centre Manager | Multi-Use Community Centre | 2008-2023 (retired)
- Managed the day-to-day running of a busy community building used by a dozen local
  groups.
- Oversaw building maintenance, contractors and health & safety for the site.
- Built relationships with user groups, funders and the local council.
- Sat on the centre's own management committee for the last six years of his tenure,
  including two years as vice-chair.

Facilities Supervisor | Regional Housing Association | 1995-2008
- Managed routine and reactive maintenance across a portfolio of residential and
  community buildings.
- Supervised contractors and managed maintenance budgets.

SKILLS
Community engagement and relationship building; building and facilities management;
committee/board experience (vice-chair, 2 years); budget oversight for a small
organisation.

QUALIFICATIONS
NEBOSH General Certificate in Health and Safety.`,
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
