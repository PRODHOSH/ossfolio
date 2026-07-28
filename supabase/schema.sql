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

-- ============================================================
-- DORMANT SNAPSHOT ARCHIVE
-- Summarise and drop the JSON payload of unclaimed profile snapshots that have
-- gone untouched for 90 days. The profile_snapshots row itself is kept: it holds
-- the sync claim marker, and the read path treats a null payload as a cold
-- profile and re-syncs on the next visit.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. The compact archive
-- ---------------------------------------------------------------------------

create table if not exists public.profile_snapshot_archive (
  username text primary key,
  archived_at timestamptz not null default now(),
  -- The `synced_at` the snapshot carried when it was archived, so the summary can
  -- be read as "this is what the account looked like on this date".
  last_synced_at timestamptz,
  followers integer,
  public_repos integer,
  repo_count integer,
  total_stars bigint,
  total_commits integer,
  total_prs integer,
  total_issues integer,
  total_reviews integer,
  total_contributions integer,
  merged_pr_count integer,
  org_count integer,
  -- `profile_snapshots` enforces the same invariant. Without it the archive could
  -- hold "Octocat" and "octocat" as separate rows and neither would join back.
  constraint profile_snapshot_archive_username_lowercase
    check (username = lower(username))
);

comment on table public.profile_snapshot_archive is
  'Small numeric summary of a profile snapshot whose bulky JSON payload has been dropped after a period of dormancy.';
comment on column public.profile_snapshot_archive.last_synced_at is
  'Value of profile_snapshots.synced_at at the moment of archiving, so the summary has a meaningful date attached.';
comment on column public.profile_snapshot_archive.total_stars is
  'Sum of stargazers across the stored repositories. bigint because this is a sum, not a per-repository count.';

create index if not exists idx_profile_snapshot_archive_archived_at
  on public.profile_snapshot_archive (archived_at);

alter table public.profile_snapshot_archive enable row level security;

-- Readable by anyone, matching profile_snapshots: these are public profiles and
-- the summary is strictly less information than the payload it replaces.
create policy "profile_snapshot_archive_select"
  on public.profile_snapshot_archive
  for select using (true);

-- No insert/update/delete policies, deliberately, exactly as on profile_snapshots.
-- The only writer is the scheduled job below, which runs as the function owner and
-- bypasses RLS. An anonymous client can read a summary but never forge one.

-- ---------------------------------------------------------------------------
-- 2. Helper: tolerant integer extraction
-- ---------------------------------------------------------------------------

-- Snapshots are written by the application from GitHub's API, so these fields are
-- numeric in practice. "In practice" is not good enough for an unattended job: one
-- malformed row would abort the whole nightly run and it would keep aborting. This
-- yields NULL for anything non-numeric instead of raising.
create or replace function public.safe_jsonb_int(p_value text)
returns integer
language sql
immutable
as $$
  select case when p_value ~ '^-?[0-9]+$' then p_value::integer end;
$$;

comment on function public.safe_jsonb_int(text) is
  'Parse a JSON text value as an integer, returning NULL rather than raising when it is not one.';

-- ---------------------------------------------------------------------------
-- 3. The archival routine
-- ---------------------------------------------------------------------------

create or replace function public.archive_dormant_profile_snapshots(
  p_retention_days integer default 90
)
returns integer
language plpgsql
security definer
-- Pinned so the function cannot be redirected by a caller's search_path.
set search_path = public
as $$
declare
  v_cutoff timestamptz;
  v_archived integer := 0;
begin
  if p_retention_days is null or p_retention_days < 1 then
    raise exception 'p_retention_days must be a positive integer, got %',
      p_retention_days;
  end if;

  v_cutoff := now() - make_interval(days => p_retention_days);

  -- One statement on purpose. The archive insert and the payload clearing see the
  -- same set of rows, so a snapshot cannot be cleared without its summary having
  -- been written, and a sync landing mid-run cannot cause the two to disagree.
  with dormant as (
    select
      ps.username,
      ps.synced_at,
      ps.snapshot -> 'user' as gh_user,
      ps.snapshot -> 'liveStats' as live_stats,
      case
        when jsonb_typeof(ps.snapshot -> 'repos') = 'array'
        then ps.snapshot -> 'repos'
        else '[]'::jsonb
      end as repos,
      case
        when jsonb_typeof(ps.snapshot -> 'mergedPRs') = 'array'
        then ps.snapshot -> 'mergedPRs'
        else '[]'::jsonb
      end as merged_prs,
      case
        when jsonb_typeof(ps.snapshot -> 'orgs') = 'array'
        then ps.snapshot -> 'orgs'
        else '[]'::jsonb
      end as orgs
    from public.profile_snapshots ps
    where ps.snapshot is not null
      and ps.synced_at is not null
      and ps.synced_at < v_cutoff
      -- Only unclaimed usernames. Somebody who signed up owns their data, and
      -- silently degrading a registered account's profile is not this job's call.
      and not exists (
        select 1
        from public.profiles p
        where lower(p.username) = ps.username
      )
  ),
  archived as (
    insert into public.profile_snapshot_archive as a (
      username,
      archived_at,
      last_synced_at,
      followers,
      public_repos,
      repo_count,
      total_stars,
      total_commits,
      total_prs,
      total_issues,
      total_reviews,
      total_contributions,
      merged_pr_count,
      org_count
    )
    select
      d.username,
      now(),
      d.synced_at,
      public.safe_jsonb_int(d.gh_user ->> 'followers'),
      public.safe_jsonb_int(d.gh_user ->> 'public_repos'),
      jsonb_array_length(d.repos),
      (
        select coalesce(sum(public.safe_jsonb_int(r ->> 'stargazers_count')), 0)
        from jsonb_array_elements(d.repos) as r
      ),
      public.safe_jsonb_int(d.live_stats ->> 'totalCommits'),
      public.safe_jsonb_int(d.live_stats ->> 'totalPRs'),
      public.safe_jsonb_int(d.live_stats ->> 'totalIssues'),
      public.safe_jsonb_int(d.live_stats ->> 'totalReviews'),
      public.safe_jsonb_int(d.live_stats ->> 'totalContributions'),
      jsonb_array_length(d.merged_prs),
      jsonb_array_length(d.orgs)
    from dormant d
    -- A username can be archived, revived by a visit, then fall dormant again.
    -- The newest summary wins rather than the insert failing.
    on conflict (username) do update set
      archived_at = excluded.archived_at,
      last_synced_at = excluded.last_synced_at,
      followers = excluded.followers,
      public_repos = excluded.public_repos,
      repo_count = excluded.repo_count,
      total_stars = excluded.total_stars,
      total_commits = excluded.total_commits,
      total_prs = excluded.total_prs,
      total_issues = excluded.total_issues,
      total_reviews = excluded.total_reviews,
      total_contributions = excluded.total_contributions,
      merged_pr_count = excluded.merged_pr_count,
      org_count = excluded.org_count
    returning a.username
  )
  update public.profile_snapshots ps
     set snapshot = null
   where ps.username in (select username from archived);

  get diagnostics v_archived = row_count;
  return v_archived;
end;
$$;

comment on function public.archive_dormant_profile_snapshots(integer) is
  'Summarise and drop the JSON payload of unclaimed profile snapshots untouched for p_retention_days. Returns how many rows were archived.';

-- The function is the scheduled job's entry point and writes with the owner's
-- rights; it is not something an anonymous or signed-in client should be able to
-- invoke. Postgres grants EXECUTE to PUBLIC by default, so revoke it.
revoke execute on function public.archive_dormant_profile_snapshots(integer)
  from public;

-- Supabase's `anon` and `authenticated` roles may also hold an explicit grant.
-- Guarded by a role-existence check so this migration still applies against a
-- plain Postgres instance, where those roles do not exist.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.archive_dormant_profile_snapshots(integer) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke execute on function public.archive_dormant_profile_snapshots(integer) from authenticated';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Schedule
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

-- 03:00 UTC, an hour clear of the midnight score-snapshot job so the two do not
-- contend. Unscheduled first so re-running this migration cannot stack duplicates.
select cron.unschedule('archive-dormant-profile-snapshots')
where exists (
  select 1 from cron.job where jobname = 'archive-dormant-profile-snapshots'
);

select cron.schedule(
  'archive-dormant-profile-snapshots',
  '0 3 * * *',
  'select public.archive_dormant_profile_snapshots();'
);
