-- Username-keyed snapshot of a profile's GitHub data, so the profile page can be
-- rendered from the database instead of six live GitHub calls.
--
-- Why a separate table rather than adding columns to `profiles`:
-- `profiles.id` is `uuid references auth.users(id)`, so a `profiles` row can only
-- exist for someone who has signed in to OSSfolio. Profile pages, however, render
-- for ANY GitHub username. A DB-first read therefore needs a store that can hold a
-- row for a user who has never logged in. This table is keyed on `username` with no
-- auth foreign key; `profiles` stays auth-bound and is not touched by this change
-- (no FK change, no RLS change on `profiles`).

create table if not exists public.profile_snapshots (
  username text primary key,
  snapshot jsonb,
  synced_at timestamptz,
  sync_started_at timestamptz not null default now(),
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

-- Supports finding stale snapshots for any future scheduled refresh.
create index if not exists idx_profile_snapshots_synced_at
  on public.profile_snapshots (synced_at);

alter table public.profile_snapshots enable row level security;

-- Profiles are public, so anyone may read a snapshot. This mirrors the existing
-- `organizations` policy (`for select using (true)`).
create policy "profile_snapshots_select" on public.profile_snapshots
  for select using (true);

-- No insert/update/delete policies are granted, deliberately. The only writer is
-- the background sync, which runs server-side with the service-role key and so
-- bypasses RLS. An anonymous client can therefore read a snapshot but can never
-- forge, poison, or delete one.
