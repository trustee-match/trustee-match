import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "For charities · Trustee Match" };

export default function CharityPage() {
  return (
    <ComingSoon
      title="Find the trustee your board is missing"
      week="week 1"
      steps={[
        "Sign in with an email link and add your charity (registry number for the verified badge).",
        "Ten-minute board skills audit: mark each skill covered, thin or missing.",
        "We draft the role brief; you edit it. We'll prompt you for anything candidates ask about first.",
        "Publish, and see your suggested trustees within a minute: anonymous, skills-first, with the reasons why.",
        "Share the shortlist with your fellow trustees, then Invite. If they've said yes too, we introduce you by email.",
      ]}
    />
  );
}
