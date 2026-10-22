# Trustee Match

Matching skilled islanders with Bailiwick of Guernsey charity boards that need them.
It's a G-Prize 2026 entry, built to be handed over — the **software** is free and
open source (MIT, see `LICENSE`). Content, copy and branding aren't under the same
licence and haven't had a separate decision made about them yet; don't assume they're
reusable just because the code is.

> The mechanics of a dating app, the manners of a board appointment.

- **Charities** run a 10-minute board skills audit. Matching is on the board's *gap*, not the role title.
- **Candidates** build a profile from LinkedIn ("Save to PDF") or a CV, then see boards that need them within a minute.
- **Both sides opt in.** Candidates stay anonymous until both say yes, then one introduction email goes to both. There's no in-app messaging and no human gatekeeper.
- Everyone signs in with a real account (Supabase email magic-link) — there's no password, and no profile or role can be written or viewed by anyone other than the person it belongs to.

Docs: [matching design](docs/matching-design.md)

## How it's built

Next.js (App Router, Cache Components) on [Netlify](https://netlify.com), with
[Supabase](https://supabase.com) for Postgres, auth and row-level security, Claude for
CV/LinkedIn-PDF parsing and AI-ranked match explanations, and [Resend](https://resend.com)
for email. None of these are load-bearing choices that can't be swapped — see
`src/lib/ai/` and `src/lib/email/send.ts` for where each one plugs in, and
"Degrades, never stops" below for what happens if the AI or email provider is absent
or down.

## Run it

Requires Node 24 LTS.

```bash
npm install
npm run dev        # http://localhost:3001/profiles works with no services configured (runs on 3001, not 3000, to sit alongside other local projects)
npm test           # matching engine, timers, grounding
npm run typecheck
npm run build
```

To run the full service — real sign-in, AI extraction/ranking, real email — copy
`.env.example` to `.env.local` and fill in Supabase, Anthropic and Resend. Then apply the
schema in `supabase/migrations/` against that Supabase project (Supabase SQL editor, or
`supabase db push --db-url "<pooler connection string>"` — see that file's own comments
for why `--db-url` rather than a bare `supabase db push`). Without any of this filled in,
the app still runs — see "Degrades, never stops" below.

## Deploying it

There's no CI/CD auto-deploy wired up — `.github/workflows/ci.yml` runs lint/typecheck/
test/build on every push and PR, but doesn't deploy anything. Shipping to Netlify is a
manual `netlify deploy --prod` (or whatever your own host's equivalent is). If you're
forking this to run your own instance: you'll want your own Supabase project (push the
same migrations), your own Resend-verified sending domain for both Supabase Auth's SMTP
settings and `RESEND_API_KEY`, and — if you want real email at all — Supabase's dashboard
custom-SMTP step, since its own default sender is rate-limited to a couple of messages an
hour and only delivers to your own project's team members.

## Layout

| Path | What |
|---|---|
| `config/` | Skills taxonomy, cause table, matching weights/caps/timers. **Tune here, not in code.** |
| `src/lib/matching/` | Pure, tested engine: filter → score → template "why" → grounding → alert throttling → lifecycle timers |
| `src/lib/ai/` | Claude: CV/LinkedIn-PDF → profile draft; re-rank + evidence-cited explanations. Returns `null` on any failure, and the service carries on rules-only |
| `src/lib/jobs/` | Event-driven matching: rules cards written inline on publish/confirm, AI upgrade via `after()`, retries via `match_jobs` |
| `src/app/api/cron/` | 5-minute timer: job retries, nudges, expiry, follow-ups, alert dispatch |
| `supabase/migrations/` | Schema + row-level security. Charities see candidates only through `charity_cards()` (anonymised) |
| `data/demo/` | Synthetic charities and people for the demo and tests |
| `data/candidates-private/` | Real CVs for testing. **Git-ignored, never commit** |

## Principles baked into the code

- **Evidence or silence.** AI reasons must cite a real skill, board cell, cause or role field. Code drops any that don't resolve, and hides matches with fewer than two.
- **Degrades, never stops.** No API key or an AI outage leaves rules-only cards and template explanations.
- **No protected characteristics.** The extraction prompt forbids recording them, and the schema has nowhere to put them.
- **Nothing waits on a person.** Caps, expiry, nudges and follow-ups are timers. Operators handle flags only.

## Scheduling

Point a 5-minute cron at `GET /api/cron` with `Authorization: Bearer $CRON_SECRET` (Supabase `pg_cron` + `pg_net`, or your host's cron).
