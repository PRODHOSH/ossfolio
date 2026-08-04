-- Migration: add_contribution_impact_analysis
-- Adds impact_multiplier and impact_details columns to public.profiles table.

alter table public.profiles
  add column if not exists impact_multiplier numeric not null default 1.0,
  add column if not exists impact_details jsonb not null default '{}'::jsonb;

comment on column public.profiles.impact_multiplier is
  'Qualitative multiplier calculated from repo popularity, labels, and issue/PR discussions';

comment on column public.profiles.impact_details is
  'Cached breakdown of contribution impact metrics (PR/issue stats, label counts, high impact counts)';
