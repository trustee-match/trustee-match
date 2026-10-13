# Matching design
*Trustee Match, v1, 8 Oct 2026. Status: agreed direction, ready to scaffold.*

> **The mechanics of a dating app, the manners of a board appointment.**
> Instant, well-explained suggestions the moment a role or profile goes live. Both sides opt in. Identity is revealed step by step. No human gatekeeper in the loop.

---

## 1. Principles

1. **The people being matched are the human in the loop.** A candidate and a charity chair judge fit better than any intermediary. The system provides guardrails, ranking and explanation. It never decides.
2. **Quality checks happen at entry, not at the match.** Roles and profiles must meet a quality bar before they're matched. After that, every generated match is fit to show without review.
3. **No step waits on an operator.** Operators deal with exceptions (flags) asynchronously. The service must keep working if nobody looks at the admin for a month.
4. **Recruit for the board's gap, not the role title.** Match against what the board is missing, from the skills audit.
5. **Evidence or silence.** Every "why" must cite the CV or the board audit. If the evidence isn't there, the match isn't shown.
6. **Immediate, but never overwhelming.** A new role or profile produces matches within a minute, because publishing is the moment of highest motivation. The pool is small (pilot: ~15 roles, ~100 candidates), so show a few good cards at a time, never an endless swipe stack. Caps and alert throttling keep it considered.
7. **Lopsided privacy.** Charities are advertising, so they're visible. Candidates stay anonymous until both sides say yes.

## 2. Actors

| Actor | Who | Main job |
|---|---|---|
| **Candidate** | A skilled islander, possibly a first-time trustee | Build a profile from a CV, review cards, express interest |
| **Charity** | One "board contact" account per organisation (usually the chair or secretary), plus share links for fellow trustees | Run a skills audit, publish roles, review candidate cards, invite |
| **Operator** | Pilot team now, AGC later | Verify each charity once, triage flags, tune weights monthly. Target ≤30 min/week |
| **System** | Scoring engine + Claude | Filter, score, rank, explain, run the lifecycle (expiry, nudges, follow-ups) |

## 3. Inputs and quality gates

### 3.1 Board skills audit → role (charity)
- Short guided flow (form or chat, ~10 minutes): mission/cause; for each taxonomy skill on the current board, **covered / thin / missing**; meeting pattern; hours per month; induction offered; any must-have skills; optional diversity preference (e.g. "we'd welcome a first-time or under-35 trustee").
- Claude drafts the **role brief** from the audit. The charity edits it.
- **Quality gate** (Claude + rules). A role can't be published until it has:
  - at least one `missing` or `thin` skill
  - hours per month and meeting pattern
  - an induction description
  - a plain-English purpose of the board
  - no personal contact details in the free text.
  
  Claude coaches the charity on any gaps ("Candidates ask about time first. Roughly how many hours a month?").
- **Charity verification:** an operator checks the registry number once per organisation, asynchronously. Until then, roles are live but show an **"Unverified"** badge.

### 3.2 CV → profile (candidate)
- **Primary path: LinkedIn.**
  1. **Continue with LinkedIn** (OIDC sign-in): verified name and email. We don't store or display the photo.
  2. **Import your LinkedIn profile**: upload the PDF from LinkedIn's *More → Save to PDF*. Claude extracts positions, skills and summary.
  3. **Profile URL** captured, and revealed only at the match stage.

  The OIDC API gives identity only. Work history comes from the user-exported PDF. We never scrape LinkedIn.
- **Fallbacks:** upload a CV (PDF/Word), paste text, or answer 6 questions.
- Every route ends the same way: Claude extracts into `data/candidate-profile.schema.json` (skills from the taxonomy with level + evidence quote; causes; exclusions; hours; conflicts). Uploaded files are deleted once extraction is confirmed.
- **We never extract** age, gender, ethnicity, health, religion, photo or other protected characteristics. Anything like that is stripped before storage.
- **Quality gate:** the candidate confirms or edits every extracted skill. They are the reviewer of their own data. Minimum to go live: ≥1 skill at professional level or above, *or* lived experience; hours per month; ≥1 cause; consents ticked.
- **Readiness explainer:** 5 short cards on duties, liability, time and what boards look for. It's optional for experienced trustees and nudged for first-timers.
- **Discoverability:** *off* by default. When on, the candidate can appear anonymously in charities' suggested lists. When off, the candidate can only start contact themselves.

## 4. The engine

Matching is **event-driven and immediate**: it runs the moment a role is published or edited, or a profile is confirmed or edited (see §4.4). A sweep every 5 minutes retries failed jobs, and a nightly full pass catches drift. There is no batch cadence.

### 4.1 Filter (hard rules)
A pairing is excluded if any of these apply:
- the candidate's hours/month are below the role's hours/month
- a declared conflict (same organisation, listed conflicts)
- the charity's cause is on the candidate's exclusion list
- the candidate lacks a skill the charity marked must-have
- the candidate already has an active match or appointment with that organisation
- either side is paused, hidden or flagged.

### 4.2 Score (deterministic, needs no AI)
`score = 50·gap_fit + 20·cause_affinity + 15·commitment_fit + 10·readiness ± 5·balancing` (each component scaled 0–1; weights live in config)

| Component | Definition |
|---|---|
| `gap_fit` | For each board skill weighted missing = 1.0 / thin = 0.5 / covered = 0.1, multiply by the candidate's level (senior 1.0 / professional 0.8 / working 0.5). Sum, then normalise by the role's maximum possible score |
| `cause_affinity` | Charity cause against candidate causes, via a small cause-similarity table in config (exact = 1, related = 0.5, none = 0.1) |
| `commitment_fit` | 1 if the candidate's hours ≥ 1.5× the role's hours, scaling down to 0.6 at an exact fit |
| `readiness` | 1 if prior board experience, 1 if first-timer *and* read the explainer, 0.6 otherwise. **First-timers are never penalised for inexperience** |
| `balancing` | −1 if the candidate has ≥2 open cards out with them, +1 if the role has been open >60 days, otherwise 0. Spreads attention and lifts stale roles |

A charity's diversity preference adds +5 to qualifying candidates. It's shown openly on the role and in the "why", never hidden.

### 4.3 Rank + explain (Claude)
- Claude re-ranks the **top 10 per role** by score (and the top 10 per candidate) for nuance the rules miss.
- **Inputs are anonymised:** no names, employers or contact details. Skills, evidence quotes, causes and hours only.
- Output (structured, via tool use) for each pairing:
  - `rank`
  - `confidence` (high / medium / low)
  - `reasons[]`: up to 3, each with `claim` + `evidence_ref` pointing to a specific profile skill evidence or audit cell
  - `considerations[]`: e.g. tight time, possible conflict.
- **Grounding check (code, not AI):** every `evidence_ref` must resolve to a real record. Reasons that fail are dropped. A pairing with fewer than 2 grounded reasons, or `confidence = low`, is **not shown**. It isn't queued for review either.
- **Degraded mode:** if the AI is unavailable or over budget, show cards ranked by score with a template "why" built from the top-weighted gap skills. The service never stops.
- Both `score` and `ai_rank` are stored. A large divergence is logged for the monthly tuning review, not for blocking.

### 4.4 Real-time release
**Target: matches visible within 60 seconds of publishing (p95).**

```
role published / profile confirmed
   │
   ├─ sync  (<1s)  filter + score all counterparts  ──► provisional cards (template "why") shown at once
   │
   └─ async (~5–20s) Claude rank + explain top 10 ──► grounding check ──► cards upgraded in place (live via Supabase Realtime)
                                                    └─► instant alerts to matched candidates (throttled, below)
```

- **Charity, on publishing a role:** lands straight on "Suggested trustees", which fills live. A "Finding trustees…" state shows for a few seconds, then cards appear. If nobody matches yet: "We'll alert you the moment someone with these skills joins."
- **Candidate, on confirming a profile:** lands straight on their "Boards that need you" deck. This is the moment that converts curiosity into a first "Interested".
- **Existing candidates, when a new role matches them strongly** (top 5 for that role, confidence ≥ medium): an instant email, "A board needs your skills", with a deep link to the card. Optional SMS later.
- **Existing charities, when a new strongly matching candidate joins:** an instant email, "A new suggested trustee for your [role]".
- **Provisional cards:** the deterministic score and template "why" appear immediately. Claude's ranking and grounded reasons replace them within seconds. If the AI times out (20s) or is unavailable, the provisional card stays (degraded mode, §4.3). Weak provisional cards (below the score threshold) are never shown.
- **Implementation:** the publish/confirm server action runs filter + score inline and writes cards. The AI step runs after the response (Next.js `after()`), with a `match_jobs` row as a durable record. The 5-minute cron retries any job not marked done. Decks subscribe to card changes via Supabase Realtime.

**Alert throttling (immediacy without spam):**
| Rule | Value (config) |
|---|---|
| Instant alerts per recipient | max 1 per 24h. Further matches in that window are added to the next alert |
| Quiet hours | 21:00–08:00 queued, sent at 08:00 |
| Alert threshold | only top-5 rank *and* confidence ≥ medium. Lesser matches just appear in the deck |
| Recipient controls | Instant / Daily summary / Off, one tap from any email |

## 5. The card experience

### 5.1 Decks
- **Candidates:** "Boards that need you". The **top 5 open matches at any time**, updated live. A strong new match enters the deck (and triggers an alert) the moment its role is published. "Browse all open roles" is always available underneath.
- **Charities (per role):** "Suggested trustees". Shown **immediately on publishing**, then updated live as new discoverable candidates join. Ranked list, top 5 highlighted. "Share this shortlist with my board" creates a read-only link for fellow trustees, who can add 👍 or a comment.
- **Empty deck:** never a silent dead end — see §5.4 for what's actually shown instead of a generic "no matches".

### 5.2 Card actions
| Action | Effect |
|---|---|
| **Interested** | Records interest. Optional one-liner tied to the gap ("I can help with your treasury gap"). Notifies the other side if they haven't seen the card yet |
| **Not for me** | Optional reason chip: *time · cause · skills fit · timing · other*. Feeds tuning and the evidence pack. The card won't reappear |
| **Save** | Keeps it for later. It doesn't count as an open card for balancing |

Buttons are the primary interface. On mobile a swipe gesture is an optional shortcut, never the only way.

### 5.3 Mutual match → progressive disclosure

| Stage | Trigger | Candidate sees | Charity sees |
|---|---|---|---|
| **0 · Card** | Engine shows it | Charity name, cause, verified badge, skills gap, hours, meeting pattern, induction, "why you" | Skills + levels, causes, hours, prior board yes/no, "why this person". **No name, employer or photo** |
| **1 · Match = introduction** | Both sides Interested/Invite | **One introduction email to both** (like a personal intro from a friend): board contact's name, role, email | The same email: candidate's name, headline, email, LinkedIn link, "Signed in with LinkedIn" badge |
| **2 · Formal** | Off-platform | The charity's own process: CV, references, eligibility checks for managing officials, safeguarding checks where relevant | — |

**No in-app messaging (decided 8 Oct).** The platform's job ends at the introduction. People then talk by their own email, phone or a coffee. We never carry or store conversations. That removes:
- chat infrastructure, notifications and an email relay
- moderation of private conversations
- retention, subject-access and deletion duties over message content
- the risk of becoming the record of a safeguarding disclosure or a dispute.

**Informed consent at the button.** "Interested" and "Invite" both say: *"If they say yes too, we'll introduce you both by email and share your name, email and LinkedIn."* Saying yes is the consent to share contact details, so there's no separate "share contact details" step.

**The one-line note** on Interested/Invite (≤200 characters, plain text, reportable) is the only text one side sends the other before a match. It's stored with the interest and deleted with it.

The intro email suggests a next step ("most people start with a 30-minute coffee") and links to a "what to ask each other" guide. The platform doesn't book or arrange anything.

The platform introduces. **Due diligence stays with the charity**, and the UI says so plainly.

### 5.4 No-match feedback

A zero-card deck is indistinguishable from "broken" or "ignored" unless the system says why.
`src/lib/matching/no-match-feedback.ts` diagnoses the single most common blocking reason across
*currently open* roles (for a candidate) or registered candidates (for a role), and turns it into
a specific, honest message — every number in it is a real count or stat, never invented.

**Why this exists:** designing the pilot's deliberate "insufficient hours" and "no skills overlap"
test candidates (`planning/dummy-candidates/`) surfaced that the engine's hard filters and the
`gapMatches`-required gate (§4.1, §4.2) can silently produce zero cards for a perfectly real,
well-qualified person — and the existing design only had a generic "we'll let you know" message
for every case, with no way to tell someone *why*, let alone whether there's anything they could
usefully do about it.

**What it distinguishes, and the message for each:**
- **`insufficient_hours`** — states the lowest and median hours the open roles actually need (or,
  from a role's side, the most/median hours registered candidates actually have), so the person
  knows whether adjusting their stated availability would plausibly help.
- **`missing_must_have`** — names the specific must-have skill(s) most commonly missing, not a
  vague "skills gap".
- **`cause_excluded`** — names the excluded cause(s) actually blocking matches, in case the
  exclusion is stale.
- **`conflict`** / **`already_active_with_org`** — explains the block is a declared relationship,
  not a quality judgement.
- **`candidate_paused`** — distinct from a real empty result: your profile isn't being matched at all right now.
- **`no_skill_overlap`** (not a `FilterReason` — a second, independent gate) — every hard filter
  passed, but no open role's `board_skills` cell resolves against anything on the profile. The
  message is explicit that this isn't a judgement on the person's experience: cause affinity
  alone can never produce a card (§4.2's `gapFit` returns 0 with no `gapMatches` when there's no
  cell to match against), however well their stated causes align with a charity's mission. This
  is a real, known limitation worth deciding on deliberately rather than leaving implicit.

**Symmetry:** `diagnoseNoMatchForCandidate` and `diagnoseNoMatchForRole` share the same shape,
phrased from each side's perspective — a charity whose published role shows nobody suitable gets
the same quality of explanation as a candidate who sees no boards.

**Not yet built:** this is the pure diagnostic logic only, written and unit-tested
(`no-match-feedback.test.ts`) ahead of the `/join`/`/charity` UI that will actually call it —
those pages are still the "coming soon" stub as of this writing. Whoever builds that UI should
call `diagnoseNoMatchForCandidate`/`diagnoseNoMatchForRole` whenever the real ranked list comes
back empty, and render `.message` (or build custom UI from the structured fields) rather than a
hardcoded empty-state string.

## 6. Lifecycle and automation (no human gates)

```
shown ─► interested (one side) ─► introduced (both said yes → intro email) ─► met ─► outcome
  │            │                              │                                    ├─ appointed
  │            └─► expired (10 days,          └─► no_contact (day-7 "did you meet?"├─ not_proceeding (+reason)
  │                nudge at day 5)                = no → one nudge; day 21 → closed)
  └─► passed (+reason)
```

| Rule | Value (config) |
|---|---|
| Max open interests per candidate | 3 |
| Max open invites per role | 5 |
| Interest/invite expiry | 10 days, nudge on day 5. On expiry, capacity is freed and the next-ranked card appears immediately |
| Charity reply window note | The card shows "boards often meet monthly, replies may take up to 10 days" |
| Post-match follow-ups | Day 7: "Did you meet?" Day 30: "Outcome?" (one-tap answers) |
| Weekly recap (fallback only) | Monday 08:00: only unseen or saved cards and pending replies. Skipped if there's nothing new. Opt-out |

Matching and alerts are event-driven (§4.4). Timers (expiry, nudges, follow-ups, recap, job retry sweep) run on a scheduled job every 5 minutes (Supabase pg_cron or a hosted cron hitting an API route). Emails go via Resend.

## 7. Trust and safety (exception-based)

**The operator sees, asynchronously:**
- reports from either side (the item is hidden automatically until reviewed)
- possible conflicts detected by Claude
- roles tagged safeguarding-sensitive (children, vulnerable adults). They still go live, with a "DBS-type checks will apply" note
- charities awaiting verification
- abuse signals (e.g. a charity inviting the maximum every day while no matches progress).

**Nothing in the normal flow waits on the operator.** Report-hiding is the only automatic action, and it errs on the side of safety.

**Privacy and data protection:**
- anonymous until mutual match
- discoverability opt-in
- no protected characteristics extracted
- "delete my data" deletes everything
- UK/EU hosting
- the AI gets anonymised inputs only
- DPIA lite before go-live.

## 8. Learning loop
- Pass reasons, expiries, divergences between score and AI rank, and outcomes feed a **monthly tuning review** (operator, ~1 hr): adjust weights, cause table and taxonomy in config.
- **Funnel metrics** (also the G-Prize evidence): roles published → cards shown → interest rate (each side) → mutual match rate → contact shared → met → appointed. Plus pass-reason mix, time to first match, and the share of first-time trustees matched.

## 9. Data model additions
On top of the plan's core tables:
- `cards`: id, role_id, candidate_id, audience (candidate|charity), released_at, score, ai_rank, confidence, reasons jsonb, considerations jsonb, state
- `interests`: id, card_id, side, action (interested|pass|save), reason, note, created_at
- `matches`: id, role_id, candidate_id, stage (introduced|met|appointed|not_proceeding|no_contact), stage timestamps, intro_email_id
- *(no `messages` table: no in-app messaging by design)*
- `flags`: id, subject_type, subject_id, kind, status, created_at, resolved_by
- `config`: weights, caps, timers, cause table (or a versioned JSON file in the repo)

- `match_jobs`: id, trigger (role_published|profile_confirmed|edit|sweep), subject_id, status, attempts, created_at, done_at
- `alerts`: id, recipient, card_id, channel, status (queued|sent|merged), send_after

Remove `approved_by` from `matches`.

## 10. Open questions
1. ~~Full ranked list or top 5 only?~~ **Resolved 8 Oct: full ranked list, top 5 highlighted.** The six user-experience alignment checks were also agreed.
2. ~~Message thread in-app or email relay?~~ **Resolved 8 Oct: neither.** Mutual match triggers one introduction email to both, and the conversation happens off-platform.
3. Share-with-board link: no login, just a token that expires after 14 days?
4. Does the AGC want a say in verification criteria (e.g. AGC membership counts as verified)?
