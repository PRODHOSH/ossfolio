-- Migration: add_profile_endorsements
-- Creates endorsements table to allow signed-in users to endorse other contributors for skills.

create table if not exists public.endorsements (
  id uuid primary key default gen_random_uuid(),
  endorser_user_id uuid not null references auth.users(id) on delete cascade,
  endorsed_user_id uuid references auth.users(id) on delete cascade,
  endorsed_username text not null references public.profiles(username) on delete cascade,
  skill text not null,
  created_at timestamptz not null default now(),
  constraint endorsements_unique_user_skill unique (endorser_user_id, endorsed_username, skill)
);

alter table public.endorsements enable row level security;

-- Public read access: endorsement counts and lists are viewable by everyone
drop policy if exists "Endorsements are publicly viewable" on public.endorsements;
create policy "Endorsements are publicly viewable"
  on public.endorsements for select
  using (true);

-- Authenticated users can insert an endorsement for another user (not themselves)
drop policy if exists "Authenticated users can endorse skills" on public.endorsements;
create policy "Authenticated users can endorse skills"
  on public.endorsements for insert
  with check (auth.uid() = endorser_user_id);

-- Endorsers can delete/toggle off their own endorsement
drop policy if exists "Users can remove their own endorsements" on public.endorsements;
create policy "Users can remove their own endorsements"
  on public.endorsements for delete
  using (auth.uid() = endorser_user_id);

create index if not exists idx_endorsements_profile_skill
  on public.endorsements (endorsed_username, skill);

comment on table public.endorsements is
  'Skill endorsements awarded by signed-in users to other open-source contributors.';
