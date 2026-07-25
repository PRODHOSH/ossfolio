-- OSSfolio — Master Schema
-- Run this entire file in your Supabase SQL editor to set up the database.
-- Dashboard → SQL Editor → New query → paste → Run

-- ============================================================
-- PROFILES
-- One row per user. Extended from Supabase auth.users.
-- Populated automatically via trigger on signup.
-- ============================================================

create table public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  username   text not null unique,
  name       text,
  avatar_url text,
  github_url text,
  bio            text,
  followers      integer not null default 0,
  top_languages  text[] not null default '{}',
  score          integer not null default 0,
  total_commits  integer not null default 0,
  total_prs      integer not null default 0,
  total_issues   integer not null default 0,
  total_reviews  integer not null default 0,
  score_delta_30_days integer not null default 0,
  badges         jsonb not null default '[]'::jsonb,
  headline       text,
  pinned_repos   text[] not null default '{}',
  custom_links   jsonb not null default '[]'::jsonb,
  visibility     text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  search_text    tsvector generated always as (
    to_tsvector('english',
      coalesce(username, '') || ' ' ||
      coalesce(name, '') || ' ' ||
      coalesce(bio, '') || ' ' ||
      array_to_string(top_languages, ' ')
    )
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  view_count integer not null default 0,
  last_refreshed_at timestamptz
);

alter table public.profiles enable row level security;

create policy "Profiles are publicly viewable"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Runs after a new row is inserted into auth.users.
-- Pulls name, avatar_url, and user_name from raw_user_meta_data
-- (populated by GitHub OAuth or the signUp options.data field).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, name, avatar_url, github_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'html_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ORGANIZATIONS
-- Teams/orgs and their membership. Referenced by the organizations
-- index below, so it must exist before that index is created.
-- ============================================================

create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  avatar_url text,
  score      integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at       timestamptz not null default timezone('utc'::text, now()),
  unique (organization_id, user_id)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "Allow public read access to organizations"
  on public.organizations for select using (true);

create policy "Allow public read access to organization members"
  on public.organization_members for select using (true);

-- ============================================================
-- SEARCH INDEXES
-- ============================================================

create index if not exists idx_profiles_search_text
  on public.profiles using gin (search_text);

create index if not exists idx_profiles_top_languages
  on public.profiles using gin (top_languages);

create index if not exists idx_profiles_score_desc
  on public.profiles (score desc nulls last);

create index if not exists idx_profiles_score_username
  on public.profiles(score desc, username asc);

-- Speed up the Explore org listing, which orders by score desc then slug asc.
-- (The original index referenced organizations(login), but there is no `login`
-- column -- that is a GitHub API field, not a DB column -- so it failed on a fresh
-- database. The real columns are id, name, slug, avatar_url, score, created_at.)
create index if not exists idx_organizations_score_slug
  on public.organizations(score desc, slug asc);

create index if not exists idx_profiles_updated_at
  on public.profiles(updated_at desc);

-- ============================================================
-- SEARCH FUNCTION
-- Full-text search with language filter, score threshold, and sorting.
-- ============================================================

create or replace function public.search_profiles(
  query text default '',
  lang text default '',
  min_score integer default 0,
  sort_by text default 'score',
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  username text,
  name text,
  avatar_url text,
  bio text,
  score integer,
  total_prs integer,
  total_commits integer,
  total_issues integer,
  followers integer,
  top_languages text[],
  score_delta_30_days integer
)
language plpgsql security definer set search_path = public
as $$
begin
  return query
    select
      p.username,
      p.name,
      p.avatar_url,
      p.bio,
      p.score,
      p.total_prs,
      p.total_commits,
      p.total_issues,
      p.followers,
      p.top_languages,
      p.score_delta_30_days
    from public.profiles p
    where
      (query = '' or p.search_text @@ plainto_tsquery('english', query))
      and (lang = '' or p.top_languages @> array[lang])
      and p.score >= min_score
      -- Discover is a listing: 'unlisted' opted out of being found, 'private' opted out entirely.
      -- This filter lives inside the function on purpose — search_profiles is `security definer`,
      -- so RLS does not apply to the rows it reads and a policy on `profiles` would be bypassed.
      and p.visibility = 'public'
    order by
      case when sort_by = 'score' then p.score else 0 end desc,
      case when sort_by = 'contributions' then (p.total_prs + p.total_commits + p.total_issues) else 0 end desc,
      case when sort_by = 'followers' then p.followers else 0 end desc,
      case when sort_by = 'improvement' then p.score_delta_30_days else 0 end desc,
      p.username asc
    limit least(page_size, 100)
    offset least(page_offset, 1000);
end;
$$;

-- ============================================================
-- SCORE SNAPSHOTS & TRENDS (MOST IMPROVED)
-- ============================================================

create table public.profile_score_snapshots (
  id            bigint generated always as identity primary key,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  score         integer not null,
  snapshot_date date not null default current_date,
  constraint profile_score_snapshots_profile_date_idx unique (profile_id, snapshot_date)
);

alter table public.profile_score_snapshots enable row level security;

-- Drop public selectable policy so rows are not publicly selectable
drop policy if exists "Snapshots are publicly viewable" on public.profile_score_snapshots;

create index if not exists idx_profile_score_snapshots_date on public.profile_score_snapshots(snapshot_date);

create or replace function public.take_score_snapshots()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Insert/update today's snapshot for all profiles
  insert into public.profile_score_snapshots (profile_id, score, snapshot_date)
  select id, score, current_date
  from public.profiles
  on conflict (profile_id, snapshot_date) do update
  set score = excluded.score;

  -- 2. Update the score_delta_30_days column for all profiles
  with historic_scores as (
    select distinct on (profile_id)
      profile_id,
      score as historic_score
    from public.profile_score_snapshots
    where snapshot_date <= current_date - 30
    order by profile_id, snapshot_date desc
  ),
  earliest_scores as (
    select distinct on (profile_id)
      profile_id,
      score as earliest_score
    from public.profile_score_snapshots
    order by profile_id, snapshot_date asc
  )
  update public.profiles p
  set score_delta_30_days = greatest(0, p.score - coalesce(sub.historic_score, sub.earliest_score, p.score))
  from (
    select 
      p_sub.id,
      h.historic_score,
      e.earliest_score
    from public.profiles p_sub
    left join historic_scores h on h.profile_id = p_sub.id
    left join earliest_scores e on e.profile_id = p_sub.id
  ) sub
  where p.id = sub.id;
end;
$$;

-- Revoke EXECUTE on the take_score_snapshots function from public roles, allowing only internal roles
revoke execute on function public.take_score_snapshots() from public, anon, authenticated;
grant execute on function public.take_score_snapshots() to postgres, service_role;

-- Enable pg_cron
create extension if not exists pg_cron;

-- Schedule the snapshot function to run daily at midnight
select cron.schedule(
  'daily-score-snapshot',
  '0 0 * * *',
  'select public.take_score_snapshots();'
);

-- Run once to initialize
select public.take_score_snapshots();

-- ============================================================
-- PROFILE SNAPSHOTS
-- Cached GitHub payload per username, so profile pages render from the DB.
-- Not tied to auth.users, so it works for users who have never signed in.
-- ============================================================

create table if not exists public.profile_snapshots (
  username         text primary key,
  snapshot         jsonb,
  synced_at        timestamptz,
  sync_started_at  timestamptz not null default now(),
  -- Every reader and writer normalizes with `.toLowerCase()`, but `text` collates
  -- case-sensitively, so nothing stops a future caller inserting "Octocat" alongside
  -- "octocat" — two rows for one account, with split caches that never converge.
  -- Enforce the invariant here rather than trusting every call site to remember it.
  constraint profile_snapshots_username_lowercase check (username = lower(username))
);

comment on table public.profile_snapshots is
  'Cached GitHub payload per username, so profile pages render from the DB. Not tied to auth.users, so it works for users who have never signed in.';
comment on column public.profile_snapshots.snapshot is
  'The GitHub payload the profile page renders from. NULL while the very first sync is still in flight.';
comment on column public.profile_snapshots.synced_at is
  'When the snapshot last landed. NULL until the first successful sync.';
comment on column public.profile_snapshots.sync_started_at is
  'Claim marker. A background sync only proceeds if this is older than the lock window, so repeated loads of a cold profile cannot stampede the GitHub API.';

create index if not exists idx_profile_snapshots_synced_at
  on public.profile_snapshots (synced_at);

alter table public.profile_snapshots enable row level security;

-- Snapshots are what the public profile page renders from, so they are publicly
-- selectable — matching the `organizations` policy (`for select using (true)`).
create policy "profile_snapshots_select" on public.profile_snapshots
  for select using (true);
-- No insert/update/delete policies are granted, deliberately. The only writer is
-- the background sync, which runs server-side with the service-role key and so
-- bypasses RLS entirely.

-- ============================================================
-- SCHEDULER LOCKS
-- Exclusive locks for edge-function cron jobs. Each row guards one schedule.
-- ============================================================

create table if not exists public.scheduler_locks (
  key        text primary key,
  locked_at  timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);

comment on table public.scheduler_locks is
  'Exclusive locks for edge-function cron jobs. Each row guards one schedule.';

-- The only writer is the scheduled-refresh edge function, which connects with the
-- service-role key and so bypasses RLS entirely. No policy is needed — and adding a
-- permissive one (using/with check true, no TO clause) would default to PUBLIC and
-- expose the locks to every client role, including anon. RLS on with zero policies
-- denies all client roles by default, which is exactly what we want here.
alter table public.scheduler_locks enable row level security;
