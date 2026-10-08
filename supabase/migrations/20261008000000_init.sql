-- Trustee Match: initial schema
-- Design: docs/matching-design.md. Server code writes engine-owned tables (cards, matches,
-- jobs, alerts) with the service role; RLS below governs what signed-in users can read/write.

create extension if not exists pgcrypto;

-- ── People and organisations ────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  kind text not null check (kind in ('candidate', 'board_contact', 'operator')),
  display_name text,
  created_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registry_number text,
  verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.org_members (
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (organisation_id, user_id)
);

create table public.candidates (
  id uuid primary key references public.profiles (id) on delete cascade,
  headline text,
  hours_per_month int not null default 0 check (hours_per_month >= 0),
  prior_board_experience boolean not null default false,
  read_guide boolean not null default false,
  discoverable boolean not null default false,          -- opt-in (design §3.2)
  causes text[] not null default '{}',
  cause_exclusions text[] not null default '{}',
  conflicts uuid[] not null default '{}',               -- organisation ids
  preference_tags text[] not null default '{}',
  linkedin_url text,
  linkedin_verified boolean not null default false,     -- signed in with LinkedIn OIDC
  paused boolean not null default false,
  confirmed_at timestamptz,                             -- profile goes live when confirmed
  consent_profile_processing boolean not null default false,
  consent_share_on_match boolean not null default false,
  alert_mode text not null default 'instant' check (alert_mode in ('instant', 'daily', 'off')),
  last_alert_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_skills (
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  skill text not null,
  level text not null check (level in ('working', 'professional', 'senior')),
  evidence text not null,
  primary key (candidate_id, skill)
);

-- ── Roles ───────────────────────────────────────────────────────────────────

create table public.board_skill_audits (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  cells jsonb not null,                                 -- [{skill, coverage, note?}]
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  audit_id uuid references public.board_skill_audits (id),
  title text not null,
  purpose text,
  brief text,
  cause text not null,
  hours_per_month int not null check (hours_per_month > 0),
  meeting_pattern text not null,
  induction text not null,
  board_skills jsonb not null,                          -- snapshot of audit cells at publish
  must_have_skills text[] not null default '{}',
  diversity_preference text,
  status text not null default 'draft' check (status in ('draft', 'published', 'paused', 'filled', 'closed')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index roles_published_idx on public.roles (status) where status = 'published';

-- ── Matching ────────────────────────────────────────────────────────────────

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  score numeric(5, 1) not null,
  ai_rank int,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  reasons jsonb not null default '[]',
  considerations jsonb not null default '[]',
  source text not null check (source in ('rules', 'ai')),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, candidate_id)
);
create index cards_candidate_idx on public.cards (candidate_id) where not hidden;

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  side text not null check (side in ('candidate', 'charity')),
  action text not null check (action in ('interested', 'pass', 'save')),
  reason text check (reason in ('time', 'cause', 'skills_fit', 'timing', 'other')),
  note text check (char_length(note) <= 200),
  status text not null default 'open' check (status in ('open', 'matched', 'expired', 'withdrawn', 'closed')),
  acted_by uuid not null references public.profiles (id),
  nudged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (card_id, side)
);
create index interests_open_idx on public.interests (status, created_at) where status = 'open';

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  stage text not null default 'introduced'
    check (stage in ('introduced', 'met', 'appointed', 'not_proceeding', 'no_contact')),
  introduced_at timestamptz not null default now(),
  intro_email_id text,
  did_you_meet_sent_at timestamptz,
  no_contact_nudged_at timestamptz,
  outcome_asked_at timestamptz,
  met_at timestamptz,
  outcome_at timestamptz,
  outcome_reason text,
  unique (role_id, candidate_id)
);

-- ── Automation ──────────────────────────────────────────────────────────────

create table public.match_jobs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null check (trigger in ('role_published', 'profile_confirmed', 'edit', 'sweep')),
  subject_type text not null check (subject_type in ('role', 'candidate')),
  subject_id uuid not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index match_jobs_pending_idx on public.match_jobs (status, created_at) where status in ('queued', 'running', 'failed');

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid references public.cards (id) on delete cascade,
  kind text not null,                                   -- new_match, invite_received, nudge, did_you_meet, ...
  channel text not null default 'email',
  status text not null default 'queued' check (status in ('queued', 'sent', 'merged', 'cancelled')),
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_due_idx on public.alerts (send_after) where status = 'queued';

-- ── Trust & safety, sharing, evidence ───────────────────────────────────────

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('role', 'candidate', 'organisation', 'interest', 'match')),
  subject_id uuid not null,
  kind text not null check (kind in ('report', 'conflict', 'safeguarding', 'verification', 'abuse_signal')),
  details text,
  reported_by uuid references public.profiles (id),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz
);

create table public.share_links (
  token text primary key default translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_'),
  role_id uuid not null references public.roles (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);

create table public.share_reactions (
  id uuid primary key default gen_random_uuid(),
  token text not null references public.share_links (token) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  reaction text check (reaction in ('thumbs_up')),
  comment text check (char_length(comment) <= 300),
  created_at timestamptz not null default now()
);

create table public.events (
  id bigint generated always as identity primary key,
  type text not null,                                   -- card_shown, interested, passed, matched, met, appointed, ...
  subject_type text,
  subject_id uuid,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where organisation_id = org and user_id = auth.uid());
$$;

create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and kind = 'operator');
$$;

-- Anonymised candidate cards for a charity: skills, causes, hours and the "why" only.
-- No name, employer, contact or LinkedIn until a mutual match (design §5.3).
create or replace function public.charity_cards(p_role uuid)
returns table (
  card_id uuid, score numeric, ai_rank int, confidence text, reasons jsonb, considerations jsonb,
  hours_per_month int, prior_board_experience boolean, read_guide boolean, causes text[], skills jsonb
)
language sql stable security definer set search_path = public as $$
  select c.id, c.score, c.ai_rank, c.confidence, c.reasons, c.considerations,
         cd.hours_per_month, cd.prior_board_experience, cd.read_guide, cd.causes,
         coalesce((select jsonb_agg(jsonb_build_object('skill', s.skill, 'level', s.level, 'evidence', s.evidence))
                   from candidate_skills s where s.candidate_id = cd.id), '[]'::jsonb)
  from cards c
  join roles r on r.id = c.role_id
  join candidates cd on cd.id = c.candidate_id
  where c.role_id = p_role
    and not c.hidden
    and cd.discoverable and not cd.paused and cd.confirmed_at is not null
    and is_org_member(r.organisation_id)
  order by coalesce(c.ai_rank, 999), c.score desc;
$$;

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.org_members enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.board_skill_audits enable row level security;
alter table public.roles enable row level security;
alter table public.cards enable row level security;
alter table public.interests enable row level security;
alter table public.matches enable row level security;
alter table public.match_jobs enable row level security;
alter table public.alerts enable row level security;
alter table public.flags enable row level security;
alter table public.share_links enable row level security;
alter table public.share_reactions enable row level security;
alter table public.events enable row level security;

-- profiles: own row
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_operator());
create policy profiles_self_write on public.profiles for update using (id = auth.uid());
create policy profiles_self_insert on public.profiles for insert with check (id = auth.uid() and kind <> 'operator');

-- organisations: public name/verified badge (charities are advertising); members edit
create policy orgs_read on public.organisations for select using (true);
create policy orgs_member_update on public.organisations for update using (public.is_org_member(id));
create policy members_read on public.org_members for select using (user_id = auth.uid() or public.is_operator());

-- candidates: only the candidate (charities use charity_cards())
create policy candidates_self on public.candidates for all using (id = auth.uid()) with check (id = auth.uid());
create policy candidate_skills_self on public.candidate_skills for all
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

-- audits and roles: members manage; published roles are public ("browse all open roles")
create policy audits_member on public.board_skill_audits for all
  using (public.is_org_member(organisation_id)) with check (public.is_org_member(organisation_id));
create policy roles_public_read on public.roles for select
  using (status = 'published' or public.is_org_member(organisation_id) or public.is_operator());
create policy roles_member_write on public.roles for insert with check (public.is_org_member(organisation_id));
create policy roles_member_update on public.roles for update using (public.is_org_member(organisation_id));

-- cards: candidates see their own visible cards; charities go through charity_cards()
create policy cards_candidate_read on public.cards for select using (candidate_id = auth.uid() and not hidden);

-- interests: each side acts for itself
create policy interests_candidate on public.interests for all
  using (candidate_id = auth.uid() and side = 'candidate')
  with check (candidate_id = auth.uid() and side = 'candidate' and acted_by = auth.uid());
create policy interests_charity on public.interests for all
  using (side = 'charity' and exists (select 1 from roles r where r.id = role_id and public.is_org_member(r.organisation_id)))
  with check (side = 'charity' and acted_by = auth.uid()
              and exists (select 1 from roles r where r.id = role_id and public.is_org_member(r.organisation_id)));

-- matches: both participants can read
create policy matches_participants on public.matches for select using (
  candidate_id = auth.uid()
  or exists (select 1 from roles r where r.id = role_id and public.is_org_member(r.organisation_id))
);

-- flags: anyone signed in can report; operators read
create policy flags_report on public.flags for insert with check (auth.uid() is not null and reported_by = auth.uid());
create policy flags_operator on public.flags for select using (public.is_operator());

-- share links: the creating member manages them; token holders read via server route
create policy share_links_member on public.share_links for all
  using (exists (select 1 from roles r where r.id = role_id and public.is_org_member(r.organisation_id)))
  with check (created_by = auth.uid());

-- match_jobs, alerts, share_reactions, events: service role only (no policies = no access)
