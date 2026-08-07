-- Migration: add_api_keys
-- Creates the api_keys table that backs the public-API key management feature.
--
-- Design decisions:
--   • key_hash   — SHA-256 hex of the plaintext key. The plaintext is shown
--                  exactly once at creation and never stored. Lookup is fast
--                  because the hash is deterministic.
--   • key_prefix — First 12 chars of the plaintext key (e.g. "osk_Ab3Xy9Qr")
--                  stored so the Settings UI can identify keys without
--                  re-deriving anything from the hash.
--   • revoked_at — Soft-delete column. A non-null value means the key is
--                  rejected by the middleware even if the hash matches.
--   • last_used_at — Updated atomically by the validation RPC; lets users see
--                  when a key was last active.

-- ── 1. The table ─────────────────────────────────────────────────────────────

create table if not exists public.api_keys (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  name          text        not null check (char_length(name) between 1 and 64),
  key_hash      text        not null unique,
  key_prefix    text        not null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz           -- null = active; non-null = revoked
);

comment on table public.api_keys is
  'API keys issued to registered users for authenticated access to the v1 public REST API.';
comment on column public.api_keys.key_hash is
  'SHA-256 hex digest of the plaintext key. The plaintext is never stored.';
comment on column public.api_keys.key_prefix is
  'First 12 characters of the plaintext key, used for display (e.g. "osk_Ab3Xy9Qr").';
comment on column public.api_keys.revoked_at is
  'Non-null once the key has been revoked. The row is retained for audit purposes.';

-- ── 2. Indexes ───────────────────────────────────────────────────────────────

-- Fast lookup by hash on every authenticated API request.
create index if not exists idx_api_keys_key_hash
  on public.api_keys (key_hash);

-- Fast listing for the Settings page ("my keys").
create index if not exists idx_api_keys_user_id
  on public.api_keys (user_id);

-- ── 3. Row Level Security ────────────────────────────────────────────────────

alter table public.api_keys enable row level security;

-- Users can only read their own keys.
create policy "api_keys_select_own"
  on public.api_keys for select
  using (auth.uid() = user_id);

-- Users can soft-delete (revoke) their own keys.
-- The revoked_at column is the only field they may update; everything else is
-- immutable after creation. The check ensures no other column is touched.
create policy "api_keys_revoke_own"
  on public.api_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INSERT and hard DELETE are intentionally withheld from all client roles.
-- Key creation is done server-side with the service-role key (which bypasses RLS)
-- so the application, not the browser, controls the hash calculation.

-- ── 4. Validation RPC (used by the v1 middleware) ────────────────────────────
--
-- Called on every authenticated API request. Runs as security definer so it can
-- bypass RLS and update last_used_at atomically without exposing the key_hash
-- column to the calling role.

create or replace function public.validate_api_key(p_key_hash text)
returns table (
  key_id  uuid,
  user_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update public.api_keys
       set last_used_at = now()
     where key_hash   = p_key_hash
       and revoked_at is null
    returning id, api_keys.user_id;
end;
$$;

comment on function public.validate_api_key(text) is
  'Validates a hashed API key, updates last_used_at atomically, and returns the '
  'key id and owner user_id. Returns zero rows for invalid or revoked keys.';

-- The function reads and writes sensitive key material. Only the service-role key
-- and internal server functions should be able to call it.
revoke execute on function public.validate_api_key(text) from public, anon, authenticated;
grant  execute on function public.validate_api_key(text) to service_role;
