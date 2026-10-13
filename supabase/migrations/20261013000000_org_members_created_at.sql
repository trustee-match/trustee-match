-- Adds a timestamp to org_members so a charity's revealed contact (getCharityContact,
-- src/lib/jobs/interest.ts) can be chosen deterministically — the earliest-added member,
-- i.e. whoever first published a role for that organisation — rather than an arbitrary
-- row order. No schema change otherwise needed: the existing profiles/org_members tables
-- already model "a named person with an email, linked to an organisation."

alter table public.org_members add column if not exists created_at timestamptz not null default now();
