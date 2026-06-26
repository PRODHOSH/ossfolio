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
  score          integer not null default 0,
  total_commits  integer not null default 0,
  total_prs      integer not null default 0,
  total_issues   integer not null default 0,
  total_reviews  integer not null default 0,
  badges         jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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
