import { causeLabel, skillLabel } from "@/lib/config";
import type { Card, Candidate, Coverage, Role } from "@/lib/matching/types";

const coverageStyle: Record<Coverage, string> = {
  missing: "bg-missing-soft text-missing",
  thin: "bg-thin-soft text-thin",
  covered: "bg-covered-soft text-covered",
};

export function SkillsGrid({ role }: { role: Role }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Board skills">
      {role.boardSkills.map((c) => (
        <li key={c.skill} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${coverageStyle[c.coverage]}`}>
          {skillLabel(c.skill)}: {c.coverage}
        </li>
      ))}
    </ul>
  );
}

function Why({ card, label }: { card: Card; label: string }) {
  return (
    <div className="rounded-md bg-sea-soft p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-sea">
        {label}
        <span className="ml-2 font-normal normal-case tracking-normal text-ink-muted">
          {card.source === "ai" ? "AI-suggested, people decide" : "Suggested from the board's skills gap"}
        </span>
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
        {card.reasons.map((r, i) => (
          <li key={i}>{r.claim}</li>
        ))}
      </ul>
      {card.considerations.length > 0 && (
        <p className="mt-2 text-xs text-ink-muted">Worth knowing: {card.considerations.join("; ")}</p>
      )}
    </div>
  );
}

function Actions({ primary }: { primary: string }) {
  // Demo only: the real buttons write interests and carry the consent wording (design §5.2).
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button disabled className="rounded-md bg-sea px-4 py-2 text-sm font-medium text-white opacity-90 dark:text-bg">
          {primary}
        </button>
        <button disabled className="rounded-md border border-line px-4 py-2 text-sm">Not for me</button>
        <button disabled className="rounded-md border border-line px-4 py-2 text-sm">Save</button>
      </div>
      <p className="text-xs text-ink-muted">
        If they say yes too, we&apos;ll introduce you both by email and share your name, email and LinkedIn.
      </p>
    </div>
  );
}

/** What a candidate sees: the charity is named; the board's gap and "why you". */
export function RoleCard({ role, card }: { role: Role; card: Card }) {
  return (
    <article className="space-y-3 rounded-lg border border-line bg-surface p-5">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-lg font-semibold">{role.organisationName}</h3>
          {role.verified ? (
            <span className="rounded bg-covered-soft px-1.5 py-0.5 text-xs text-covered">✓ verified</span>
          ) : (
            <span className="rounded bg-gorse-soft px-1.5 py-0.5 text-xs text-ink">Unverified</span>
          )}
        </div>
        <p className="text-sm text-ink-muted">
          {role.title} · {causeLabel(role.cause)} · about {role.hoursPerMonth} hrs/month · {role.meetingPattern}
        </p>
        <p className="text-sm text-ink-muted">Induction: {role.induction}</p>
      </header>
      <SkillsGrid role={role} />
      <Why card={card} label="Why you" />
      <Actions primary="Interested" />
    </article>
  );
}

/** What a charity sees: skills and evidence only. No name, employer or photo. */
export function CandidateCard({ candidate, card, rank }: { candidate: Candidate; card: Card; rank: number }) {
  return (
    <article className="space-y-3 rounded-lg border border-line bg-surface p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold">Candidate #{rank}</h3>
          <p className="text-sm text-ink-muted">
            {candidate.hoursPerMonth} hrs/month ·{" "}
            {candidate.priorBoardExperience ? "has board experience" : "first-time trustee"}
            {!candidate.priorBoardExperience && candidate.readGuide ? ", has read the trustee guide" : ""}
          </p>
        </div>
        <span className="shrink-0 rounded bg-sea-soft px-2 py-0.5 text-xs text-sea">score {card.score}</span>
      </header>
      <ul className="space-y-1 text-sm">
        {candidate.skills.map((s) => (
          <li key={s.skill}>
            <span className="font-medium">{skillLabel(s.skill)}</span>{" "}
            <span className="text-ink-muted">({s.level})</span>: “{s.evidence}”
          </li>
        ))}
      </ul>
      <Why card={card} label="Why this person" />
      <Actions primary="Invite" />
    </article>
  );
}
