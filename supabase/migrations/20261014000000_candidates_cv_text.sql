-- Stores the raw CV/personal-statement text a candidate pasted into /join, so testers
-- can compare what was actually submitted against what the engine extracted and
-- surfaced. Nullable: historical rows (seeded before this column existed) have none, and
-- it is demo/testing scaffolding, not a feature of the real product yet — see
-- planning/demo-scaffolding.md and the Privacy entry in
-- planning/responsible-design-decisions.md on why this is a genuinely new category of
-- stored personal data, not just a display change.

alter table public.candidates add column if not exists cv_text text;
