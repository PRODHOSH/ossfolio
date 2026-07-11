-- Migration: Add Most Improved sorting to the Leaderboard
-- 1. Add score_delta_30_days column to profiles table
alter table public.profiles
  add column if not exists score_delta_30_days integer not null default 0;

create index if not exists idx_profiles_score_delta_30_days_desc
  on public.profiles (score_delta_30_days desc nulls last);

-- 2. Create the profile_score_snapshots table
create table if not exists public.profile_score_snapshots (
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

-- 3. Create the take_score_snapshots function
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

-- 4. Drop and recreate public.search_profiles to support 30-day delta and improvement sort
drop function if exists public.search_profiles(text, text, integer, text, integer, integer);

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

-- Reapply required execute grants for public.search_profiles
grant execute on function public.search_profiles(text, text, integer, text, integer, integer) to public, anon, authenticated;

-- 5. Enable pg_cron extension
create extension if not exists pg_cron;

-- 6. Schedule the cron job to run daily at midnight
select cron.schedule(
  'daily-score-snapshot',
  '0 0 * * *',
  'select public.take_score_snapshots();'
);

-- 7. Run once immediately to seed today's snapshots and compute initial deltas
select public.take_score_snapshots();
