import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Become a trustee · Trustee Match" };

export default function JoinPage() {
  return (
    <ComingSoon
      title="Become a trustee"
      week="week 2"
      steps={[
        "Continue with LinkedIn (or get an email sign-in link).",
        "Upload your LinkedIn profile PDF (More → Save to PDF) or your CV. We draft your skills profile from it.",
        "Check every skill we found and add the causes you care about and the hours you can give.",
        "Read the two-minute “Am I ready to be a trustee?” guide, and choose whether charities can see an anonymous version of you.",
        "See the boards that need you, straight away.",
      ]}
    />
  );
}
