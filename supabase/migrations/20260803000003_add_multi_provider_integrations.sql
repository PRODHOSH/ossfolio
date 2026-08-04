-- Migration: add_multi_provider_integrations
-- Adds gitlab_username, bitbucket_username, and provider_stats JSONB columns to profiles table.

alter table public.profiles
  add column if not exists gitlab_username text,
  add column if not exists bitbucket_username text,
  add column if not exists provider_stats jsonb default '{}'::jsonb;

comment on column public.profiles.gitlab_username is
  'Linked GitLab username for multi-provider contribution aggregation.';

comment on column public.profiles.bitbucket_username is
  'Linked Bitbucket username for multi-provider contribution aggregation.';

comment on column public.profiles.provider_stats is
  'Per-platform contribution breakdown breakdown (GitHub, GitLab, Bitbucket).';
