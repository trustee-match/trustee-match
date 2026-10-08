import type { Metadata } from "next";
import { CandidateCard, RoleCard, SkillsGrid } from "@/components/cards";
import { DEMO_CANDIDATES, DEMO_ROLES } from "@/lib/demo";
import { provisionalCard, rankCandidatesForRole, rankRolesForCandidate } from "@/lib/matching/engine";
import { MATCHING } from "@/lib/config";

export const metadata: Metadata = { title: "Demo · Trustee Match" };

// Rules-only matching on synthetic data: what users see in the first second after
// publishing, before the AI step upgrades the explanations. Fixed date keeps it deterministic.
const DEMO_NOW = new Date("2026-10-08T12:00:00Z");

export default function DemoPage() {
  const sam = DEMO_CANDIDATES.find((c) => c.id === "cand-fund-accountant")!;
  const samRoles = rankRolesForCandidate(sam, DEMO_ROLES, { now: DEMO_NOW }).slice(0, MATCHING.thresholds.candidate_deck_size);

  const youth = DEMO_ROLES.find((r) => r.id === "role-youth-finance")!;
  const youthCandidates = rankCandidatesForRole(youth, DEMO_CANDIDATES, { now: DEMO_NOW, discoverableOnly: true });

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gorse">Demo · made-up charities and people</p>
        <h1 className="font-serif text-3xl font-semibold">The same match, from both sides</h1>
        <p className="max-w-2xl text-ink-muted">
          This is the rules engine on synthetic data: the cards each side sees the moment a role or profile goes live.
          In the live service, Claude re-ranks the top matches and rewrites each &ldquo;why&rdquo; within seconds,
          and only reasons backed by the CV or the board audit survive.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold">Sam, a fund accountant: &ldquo;Boards that need you&rdquo;</h2>
        <p className="text-sm text-ink-muted">
          First-time trustee, 6 hrs/month, cares about the environment and young people. {samRoles.length} matching
          boards, best first.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {samRoles.map((p) => {
            const role = DEMO_ROLES.find((r) => r.id === p.roleId)!;
            return <RoleCard key={p.roleId} role={role} card={provisionalCard(p, role, sam)} />;
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold">
          Harbour Youth Trust&apos;s chair: &ldquo;Suggested trustees&rdquo;
        </h2>
        <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
          <p className="text-sm">
            <span className="font-medium">{youth.title}</span> · board skills audit:
          </p>
          <SkillsGrid role={youth} />
          <p className="text-xs text-ink-muted">
            Full ranked list (top {MATCHING.thresholds.charity_highlight_top} highlighted). Only candidates who chose to
            be discoverable appear, and nobody&apos;s name is shown until both sides say yes.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {youthCandidates.map((p, i) => {
            const c = DEMO_CANDIDATES.find((x) => x.id === p.candidateId)!;
            return (
              <div key={p.candidateId} className={i < MATCHING.thresholds.charity_highlight_top ? "" : "opacity-70"}>
                <CandidateCard candidate={c} card={provisionalCard(p, youth, c)} rank={i + 1} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
