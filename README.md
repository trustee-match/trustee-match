# Trustee Match

Matching skilled islanders with Bailiwick of Guernsey charity boards that need them.
It's a G-Prize 2026 entry: free, open source (MIT), and built to be handed over.

> The mechanics of a dating app, the manners of a board appointment.

- **Charities** run a 10-minute board skills audit. Matching is on the board's *gap*, not the role title.
- **Candidates** build a profile from LinkedIn ("Save to PDF") or a CV, then see boards that need them within a minute.
- **Both sides opt in.** Candidates stay anonymous until both say yes, then one introduction email goes to both. There's no in-app messaging and no human gatekeeper.

Docs: [matching design](docs/matching-design.md)

## Run it

Requires Node 24 LTS.

```bash
npm install
npm run dev        # http://localhost:3001/profiles works with no services configured (runs on 3001, not 3000, to sit alongside other local projects)
npm test           # matching engine, timers, grounding
npm run typecheck
npm run build
```

To run the full service, copy `.env.example` to `.env.local` and fill in Supabase, Anthropic and Resend. Then apply the schema in `supabase/migrations/` (Supabase SQL editor or `supabase db push`).

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
