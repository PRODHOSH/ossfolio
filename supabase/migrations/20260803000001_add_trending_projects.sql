-- Migration: add_trending_projects
-- Creates trending_projects table to cache high-activity and trending open-source projects for Explore page.

create table if not exists public.trending_projects (
  id uuid primary key default gen_random_uuid(),
  repo_name text not null unique,
  description text,
  stars integer not null default 0,
  forks integer not null default 0,
  language text,
  url text not null,
  contributors_count integer not null default 0,
  recent_activity_score numeric not null default 0.0,
  topics text[] not null default '{}',
  seeking_contributors boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.trending_projects enable row level security;

-- Drop policy if already exists to ensure idempotency
drop policy if exists "Trending projects are publicly viewable" on public.trending_projects;

create policy "Trending projects are publicly viewable"
  on public.trending_projects for select
  using (true);

create index if not exists idx_trending_projects_score
  on public.trending_projects (recent_activity_score desc, stars desc);

comment on table public.trending_projects is
  'Cached trending repositories and high-activity open-source projects highlighted on Explore page.';
