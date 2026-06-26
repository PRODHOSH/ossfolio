-- Add badges column to profiles table for open source programs (issue #148)
-- Store badges as a JSONB array, default to an empty array '[]'::jsonb

alter table public.profiles
  add column if not exists badges jsonb not null default '[]'::jsonb;
