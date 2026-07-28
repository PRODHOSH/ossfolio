-- Archive dormant profile snapshots.
--
-- `profile_snapshots` holds one row per username the site has ever rendered, and
-- it is not tied to auth.users — a row exists for anyone whose profile page was
-- opened once, including people who never signed up. The `snapshot` column holds
-- the raw GitHub payload: user object, every repository, merged pull requests,
-- organisations and a full contribution calendar. That is the large part.
--
-- Most of those rows are never looked at again. This adds a scheduled job that,
-- for snapshots untouched for 90 days and belonging to nobody with an account,
-- keeps a small numeric summary and drops the bulky JSON.
--
-- The row itself is kept, not deleted. `sync_started_at` on that row is the claim
-- marker that stops concurrent renders stampeding the GitHub API, and the username
-- is the primary key the sync path expects to find. Deleting the row would throw
-- both away to save a few bytes.
--
-- Clearing `snapshot` is safe against the read path. `src/app/[username]/page.tsx`
-- branches on `if (!stored?.snapshot)` and renders the syncing state, then
-- refreshes in the background — the same path a profile that was never synced
-- takes. So an archived profile that someone does visit again simply behaves like
-- a cold one, which after ninety unvisited days it effectively is.

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
