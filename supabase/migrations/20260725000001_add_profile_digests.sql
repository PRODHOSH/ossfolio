-- Migration: add_profile_digests
-- Caches generated weekly/monthly contribution digests for OSSfolio users.

create table if not exists public.profile_digests (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  period text not null check (period in ('weekly', 'monthly')),
  digest_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_digests_username_period_key unique (username, period)
);

comment on table public.profile_digests is
  'Cached contribution digest snapshots (weekly and monthly) for OSSfolio profiles.';

-- Create index on username and period for quick lookup
create index if not exists idx_profile_digests_username_period
  on public.profile_digests (username, period);

-- Enable RLS (Read accessible by public/anon, writes by service-role or authenticated functions)
alter table public.profile_digests enable row level security;

create policy "Allow public read access to profile digests"
  on public.profile_digests
  for select
  using (true);
