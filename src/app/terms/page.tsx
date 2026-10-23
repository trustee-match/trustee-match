import Link from "next/link";
import { ContactLink, LegalPage, Section } from "@/components/legal-page";

export const metadata = { title: "Terms of use · Trustee Match" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="22 October 2026"
      intro={
        <p>
          Trustee Match is run by The Quarry (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using
          the service you agree to these terms. They&apos;re written to be read, so please do.
        </p>
      }
    >
      <Section title="Who can use it">
        <ul className="list-disc space-y-2 pl-5">
          <li>You must be 18 or over.</li>
          <li>Candidates must be using the service for themselves, with information that is true and their own.</li>
          <li>
            Charity accounts must be set up by someone authorised by the charity, usually its chair or secretary, for a
            charity or voluntary organisation in the Bailiwick of Guernsey. We check each charity&apos;s registration
            once, and until we have, its roles show as &ldquo;Unverified&rdquo;.
          </li>
        </ul>
      </Section>

      <Section title="What the service does, and doesn't do">
        <ul className="list-disc space-y-2 pl-5">
          <li>It suggests possible matches and, when both sides say yes, sends one introduction email. That&apos;s all.</li>
          <li>
            It isn&apos;t a recruitment agency and doesn&apos;t appoint anyone. Each charity runs its own process and
            makes its own decisions about who joins its board.
          </li>
          <li>
            A suggestion isn&apos;t a recommendation. AI helps rank and explain matches, and it can get things wrong.
            Read what&apos;s shown, use your own judgement, and ask questions.
          </li>
          <li>
            We don&apos;t check candidates&apos; backgrounds, references or qualifications, or vouch for any charity
            beyond confirming it is registered. Charities remain responsible for their own checks, including any
            vetting or safeguarding checks a role requires, and candidates should satisfy themselves about a charity
            before joining its board.
          </li>
          <li>It&apos;s free. We don&apos;t charge charities or candidates, and we don&apos;t take bookings or payments.</li>
        </ul>
      </Section>

      <Section title="Your responsibilities">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Keep your information accurate. Candidates check and correct their AI-drafted profile before it goes live
            and should update it if things change. Charities should keep roles current and close them once filled.
          </li>
          <li>
            Respect anonymity. Don&apos;t try to identify a candidate before a mutual match, and don&apos;t share
            candidate cards beyond the people involved in your charity&apos;s decision. Share links for fellow trustees
            expire after 14 days.
          </li>
          <li>
            Use introductions only for the role they relate to. Don&apos;t add people to mailing lists or use their
            details for anything else.
          </li>
          <li>
            Declare conflicts of interest. Candidates can record organisations they&apos;re connected to so they
            aren&apos;t matched with them.
          </li>
          <li>
            Don&apos;t post personal contact details in role descriptions, misrepresent yourself or your charity, upload
            anything you don&apos;t have the right to share, or use the service to harass, discriminate against or
            mislead anyone.
          </li>
        </ul>
      </Section>

      <Section title="Reporting a problem">
        <p>
          If a role, profile or someone&apos;s behaviour concerns you, email <ContactLink />. We review reports and may
          hide content, pause an account or remove a charity while we look into it.
        </p>
      </Section>

      <Section title="Ending your use">
        <p>
          You can stop using Trustee Match at any time. Candidates can pause their profile or turn off being suggested
          to charities. To delete your account and data, email us and we&apos;ll do it within five working days; see
          the{" "}
          <Link href="/privacy" className="text-sea underline">
            privacy notice
          </Link>
          . We may suspend or close an account that breaks these terms.
        </p>
      </Section>

      <Section title="Our responsibility">
        <p>
          We take care to run the service well, but it&apos;s a prototype being tested as part of a competition, so it
          may change, have interruptions or be withdrawn. We aren&apos;t responsible for decisions charities or
          candidates make, for what happens after an introduction, or for loss arising from relying on a suggestion.
          Nothing in these terms limits any rights you have by law, or our liability where it can&apos;t be limited by
          law.
        </p>
      </Section>

      <Section title="Changes and law">
        <p>
          We may update these terms; the date at the top shows when. If a change matters to how you use the service,
          we&apos;ll tell you by email. These terms are governed by the law of the Island of Guernsey. The code is open
          source under the MIT licence; that licence covers the code, not the service or the data in it.
        </p>
      </Section>
    </LegalPage>
  );
}
