-- AGC feedback round 1 (planning/feedback/agc1.md), triaged in
-- planning/feedback/agc1-response-draft.md:
--  - candidates.motivation: Kirstin's "add a question about what people feel passionate
--    about rather than focus on skills alone" (issue #17). A direct question asked of
--    the candidate, not AI-inferred from their CV like `causes` is.
--  - roles.volunteer_gg_url: deep-link a role back to its volunteer.gg listing where one
--    exists (issue #16), to read as a layer on top of volunteer.gg rather than a
--    competing listing. Both nullable: optional, and no historical row has either.

alter table public.candidates add column if not exists motivation text;
alter table public.roles add column if not exists volunteer_gg_url text;
