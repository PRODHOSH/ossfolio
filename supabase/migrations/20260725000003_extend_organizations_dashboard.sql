-- Migration: extend_organizations_dashboard
-- Extends public.organizations with dashboard metrics and claiming columns.

alter table public.organizations
  add column if not exists description text,
  add column if not exists website_url text,
  add column if not exists github_org text,
  add column if not exists claimed_by uuid references auth.users(id) on delete set null,
  add column if not exists claimed_at timestamptz,
  add column if not exists stats jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.organizations.claimed_by is
  'User ID of the verified organization owner on OSSfolio.';

comment on column public.organizations.stats is
  'Cached aggregate team metrics (total members, repos, stars, team score, top languages).';

-- RLS Policy allowing authenticated users to update claiming info on unclaimed organizations
create policy "Allow authenticated users to claim unclaimed organizations"
  on public.organizations
  for update
  to authenticated
  using (claimed_by is null)
  with check (auth.uid() = claimed_by);
