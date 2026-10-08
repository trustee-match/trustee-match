import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Operator · Trustee Match" };

export default function OperatorPage() {
  return (
    <ComingSoon
      title="Operator console"
      week="week 3"
      steps={[
        "Flags: reports, possible conflicts, safeguarding-sensitive roles. Nothing in the flow waits on these.",
        "Charity verification against the Guernsey Registry, once per organisation.",
        "Funnel: roles → cards shown → interest → mutual match → met → appointed, plus pass reasons.",
        "Matching weights and timers (config), and CSV export.",
      ]}
    />
  );
}
