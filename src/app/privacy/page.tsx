import { ContactLink, LegalPage, Section } from "@/components/legal-page";

export const metadata = { title: "Privacy notice · Trustee Match" };

// Keep this in step with the code. Facts it states that live elsewhere:
//  - CV text kept during testing: candidates.cv_text (remove that line when the column goes)
//  - AI retention: true for claude-sonnet-5 (src/lib/ai/client.ts). Some models require
//    30-day retention at Anthropic; check before changing ANTHROPIC_MODEL.
//  - Netlify functions region: default Ohio; update the table if it's moved.

const PROVIDERS: [string, string, string][] = [
  ["Supabase", "Database and sign-in", "London, UK"],
  ["Anthropic", "AI drafting and match explanations", "United States"],
  ["Resend", "Sending email", "United States"],
  [
    "Netlify",
    "Hosting the website",
    "United States (Ohio) for the parts that handle your information; pages themselves are served from Netlify's worldwide network",
  ],
];

const BASES: [string, string][] = [
  ["Draft and hold a candidate's profile and suggest matches", "Your consent, given when you set up your profile"],
  ["Share a candidate's name and email with a charity after both say yes", "Your consent, plus your yes to that specific role"],
  ["Hold charity contacts' details and run their roles", "Our legitimate interest in running the service the charity asked to use"],
  ["Send service emails: sign-in links, new matches, reminders and follow-ups", "Needed to provide the service you signed up for"],
  ["Look into reports and keep the service secure", "Our legitimate interest in keeping the service safe"],
];

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-line py-2 pr-4 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i} className="border-b border-line py-2 pr-4 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy notice"
      updated="22 October 2026"
      intro={<p>This notice explains what information Trustee Match holds about you, why, who sees it and what your rights are.</p>}
    >
      <Section title="Who we are">
        <p>
          Trustee Match is run by The Quarry, which is the controller of your information and is registered with the
          Office of the Data Protection Authority in Guernsey (registration number DPA11598). Contact us about your
          information at <ContactLink />.
        </p>
      </Section>

      <Section title="What we hold about candidates">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your email address, used to sign you in with a one-time link, and your name.</li>
          <li>What you give us to build your profile: a CV, a LinkedIn &ldquo;Save to PDF&rdquo; export or text you paste in.</li>
          <li>
            While we&apos;re testing the service, the full text of what you submitted, so the testing team can check how
            well your profile was drafted. We don&apos;t keep the uploaded file itself.
          </li>
          <li>
            Your profile: headline, skills with the evidence for each, causes you care about and any you&apos;d rather
            avoid, hours a month you can give, previous board experience, what motivates you, organisations you&apos;re
            connected to (so we don&apos;t match you with them), and optionally your LinkedIn address.
          </li>
          <li>
            What you do on the service: roles you say yes or no to (with an optional reason or short note), matches, and
            whether you met or were appointed.
          </li>
        </ul>
      </Section>

      <Section title="What we hold about charity contacts">
        <p>
          Your name and email address, your charity&apos;s name and registration number, the board skills audit, the
          roles you publish, and what you do on the service (the candidates you say yes or no to, and matches).
        </p>
      </Section>

      <Section title="What we never record">
        <p>
          We don&apos;t record age, gender, ethnicity, nationality, religion, health, disability, sexuality, marital
          status or any other protected characteristic. The AI is instructed not to pick these up from your CV, even if
          it mentions them, and there&apos;s nowhere in the system to store them. The only exception is experience you
          choose to offer as relevant, such as lived experience of a charity&apos;s cause.
        </p>
      </Section>

      <Section title="Why we use it, and the legal basis">
        <Table head={["What we do", "Legal basis"]} rows={BASES} />
        <p>
          You can withdraw consent at any time by pausing or deleting your profile. We don&apos;t send marketing, and we
          don&apos;t sell or share your information for anyone else&apos;s purposes, including The Quarry&apos;s
          journalism or mailings.
        </p>
      </Section>

      <Section title="Who sees what">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Charities, before a match</strong>: your skills and the evidence for them, causes, hours and why you
            might fit their board. Not your name, email, LinkedIn or CV. Write your skill evidence with this in mind,
            because an employer you name there will be visible.
          </li>
          <li>
            <strong>Charities, after you both say yes</strong>: your name and email address, in one introduction email
            that also gives you the charity contact&apos;s name and email.
          </li>
          <li>
            <strong>A charity&apos;s fellow trustees</strong>: the same anonymous view, through a link the charity
            contact shares, which expires after 14 days.
          </li>
          <li>
            <strong>The team running the service</strong>: The Quarry&apos;s pilot team can see all records to run,
            test and fix the service and to deal with reports.
          </li>
          <li>Roles that charities publish are public.</li>
        </ul>
      </Section>

      <Section title="How we use AI">
        <p>
          We use Claude, an AI model provided by Anthropic, to draft your profile from your CV, to draft role
          descriptions from a charity&apos;s audit, and to help rank and explain matches. To do this, your CV text,
          profile and role details are sent to Anthropic for processing. Under Anthropic&apos;s terms for business
          customers, what we send isn&apos;t used to train its models, and Anthropic doesn&apos;t keep it once it has
          returned its answer. The exception is anything its automated safety systems flag, which it may keep for up to
          two years. AI suggestions never decide anything about you: you check your own profile before it goes live, and
          you and the charity decide whether to say yes.
        </p>
      </Section>

      <Section title="Service providers">
        <Table head={["Provider", "What for", "Where"]} rows={PROVIDERS} />
        <p>
          Each provider processes information only on our instructions. Where information goes outside the Bailiwick to
          a country without equivalent data protection law, we rely on the provider&apos;s data protection terms to
          protect it.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We only use cookies needed for the service to work: one keeps you signed in and, while we&apos;re testing, one
          remembers that you&apos;ve entered the preview password. No advertising or tracking cookies.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Candidate profiles are deleted 12 months after you last sign in, and we&apos;ll email you 30 days before.
          Records of matches and outcomes are kept for 2 years so we can show whether the service works, then deleted.
          Roles are deleted 12 months after they close. If the service doesn&apos;t continue after the competition,
          we&apos;ll delete everything.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Under the Data Protection (Bailiwick of Guernsey) Law, 2017 you can ask to see the information we hold about
          you, have it corrected or deleted, restrict or object to how we use it, take a copy of it, and withdraw
          consent. Email <ContactLink /> and we&apos;ll respond within five working days. If you&apos;re unhappy with
          how we&apos;ve handled your information, you can complain to the{" "}
          <a href="https://www.odpa.gg" className="text-sea underline">
            Office of the Data Protection Authority
          </a>
          .
        </p>
      </Section>

      <Section title="Changes">
        <p>We&apos;ll update this notice if what we do changes, and email you if a change affects you.</p>
      </Section>
    </LegalPage>
  );
}
