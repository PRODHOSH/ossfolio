-- Migration: add_profile_view_counter_rpc
-- Creates PL/pgSQL function to atomically increment view_count on public.profiles for a given username.

create or replace function public.increment_profile_view_count(target_username text)
returns integer
language plpgsql
security definer
as $$
declare
  new_count integer;
begin
  update public.profiles
  set view_count = coalesce(view_count, 0) + 1
  where lower(username) = lower(target_username)
  returning view_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.increment_profile_view_count(text) to anon, authenticated, service_role;

comment on function public.increment_profile_view_count(text) is
  'Atomically increments and returns the total view_count for a target profile username.';
