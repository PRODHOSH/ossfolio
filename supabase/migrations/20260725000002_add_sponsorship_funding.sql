-- Migration: add_sponsorship_funding
-- Adds funding_links and sponsors columns to public.profiles table.

alter table public.profiles
  add column if not exists funding_links jsonb not null default '[]'::jsonb,
  add column if not exists sponsors jsonb not null default '[]'::jsonb;

comment on column public.profiles.funding_links is
  'List of funding platform links (GitHub Sponsors, Patreon, Open Collective, etc.)';

comment on column public.profiles.sponsors is
  'List of active sponsors and backers displayed on the contributor profile';

-- Ensure public select policies allow reading funding_links and sponsors columns
-- Profiles table already has public SELECT enabled.
