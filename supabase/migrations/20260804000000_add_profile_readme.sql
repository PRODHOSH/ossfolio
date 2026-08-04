-- Migration: add_profile_readme
-- Adds custom markdown readme column to public.profiles and grants user update permissions.

alter table public.profiles
  add column if not exists readme text;

grant update (readme) on public.profiles to authenticated;
grant insert (readme) on public.profiles to authenticated;

comment on column public.profiles.readme is
  'Custom user profile README rendered in Markdown.';
