-- Transactional advisory locking for concurrent profile snapshot synchronization and profile refreshing.
-- Uses `pg_try_advisory_xact_lock` with a 64-bit integer derived from the SHA-256 hash of the target username.
-- If a lock is already held by another transaction/worker for the same username, the function returns false
-- immediately, preventing duplicate concurrent outbound GitHub API calls.

create or replace function public.try_acquire_profile_refresh_lock(p_username text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_username text := lower(trim(p_username));
  v_lock_key bigint;
  v_acquired boolean;
begin
  if v_username is null or v_username = '' then
    return false;
  end if;

  -- Generate a signed 64-bit bigint lock key from the first 8 bytes of the SHA-256 digest of the username
  v_lock_key := ('x' || substring(encode(sha256(v_username::bytea), 'hex'), 1, 16))::bit(64)::bigint;

  -- Attempt non-blocking transaction advisory lock
  v_acquired := pg_try_advisory_xact_lock(v_lock_key);
  
  return v_acquired;
end;
$$;

comment on function public.try_acquire_profile_refresh_lock(text) is
  'Attempts to acquire a transaction-scoped PostgreSQL advisory lock (pg_try_advisory_xact_lock) for a target username SHA-256 bigint hash to prevent concurrent sync stampedes.';
