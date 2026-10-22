import Link from "next/link";
import { ContactLink, LegalPage, Section } from "@/components/legal-page";

export const metadata = { title: "About · Trustee Match" };

export default function AboutPage() {
  return (
    <LegalPage
      title="About Trustee Match"
      intro={
        <p>
          Trustee Match helps skilled islanders find charity boards in the Bailiwick of Guernsey that need what they
          know. It&apos;s free to use for both charities and candidates.
        </p>
      }
    >
      <Section title="Why we built it">
        <p>
          Charities depend on their trustees, and many boards struggle to fill the gaps in their skills, whether
          that&apos;s finance, law, fundraising or digital. At the same time, plenty of islanders would make good
          trustees but have never been asked, or assume they need to be an expert. Most don&apos;t: good judgement,
          reliability and caring about the cause count for more. Trustee Match puts the two sides in touch without an
          application form or a gatekeeper.
        </p>
      </Section>

      <Section title="How it works">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            A charity spends about ten minutes on a board skills audit, saying which skills its board already has and
            which it&apos;s missing, and publishes a role.
          </li>
          <li>
            A candidate uploads a CV or a LinkedIn &ldquo;Save to PDF&rdquo; export. AI drafts a profile from it, and
            the candidate checks and corrects every part before it goes live.
          </li>
          <li>
            The service suggests matches based on the gaps in each board, not job titles, and explains each suggestion
            using evidence from the CV and the audit. If it can&apos;t point to the evidence, it doesn&apos;t suggest
            the match.
          </li>
          <li>
            Charities see candidates&apos; skills and why they fit, but not their name or contact details. A candidate
            is only identified when both sides say yes.
          </li>
          <li>
            When both say yes, we send one introduction email to both. What happens next is up to you; most people
            start with a coffee.
          </li>
        </ol>
      </Section>

      <Section title="The G-Prize">
        <p>
          Trustee Match is an entry to the{" "}
          <a href="https://innovateguernsey.com/gprize" className="text-sea underline">
            G-Prize 2026
          </a>
          , a competition run by Innovate Guernsey that asks islanders to build working tools, using AI, to tackle real
          Guernsey problems. It&apos;s entered under the Wildcard category, as a clearly evidenced problem facing
          Guernsey&apos;s charities. Entries close on 8 November 2026, and we&apos;re testing the service with
          charities and candidates in the meantime. It&apos;s a working prototype, so you may find rough edges; please
          tell us about them.
        </p>
      </Section>

      <Section title="Built to last beyond the competition">
        <p>
          The code is free and open source under the MIT licence, and the service is designed so it can be handed over
          to and run by a Bailiwick charity body after the competition. It&apos;s built to keep working without anyone
          checking every match: people make the decisions, and the service handles reminders and follow-ups.
        </p>
      </Section>

      <Section title="How we use AI">
        <p>
          Claude, an AI model made by Anthropic, drafts candidate profiles from CVs, drafts role descriptions from
          skills audits, and helps rank and explain matches. AI never makes a decision for you: you check your own
          profile before it goes live, and both sides choose whether to say yes. If the AI isn&apos;t available, the
          service carries on using simple rules. See the{" "}
          <Link href="/privacy" className="text-sea underline">
            privacy notice
          </Link>{" "}
          for what this means for your data.
        </p>
      </Section>

      <Section title="Who runs it">
        <p>
          For the competition, Trustee Match is run by The Quarry, Guernsey&apos;s independent, reader-funded
          newsroom. Questions, feedback or problems: email <ContactLink />.
        </p>
      </Section>
    </LegalPage>
  );
}
