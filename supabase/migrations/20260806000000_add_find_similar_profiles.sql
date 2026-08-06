-- Migration: add_find_similar_profiles
-- Creates a `security definer` RPC that returns up to 6 public profiles whose
-- top_languages or GitHub orgs overlap with the target user's profile, ranked
-- by a weighted similarity score.
--
-- Scoring weights:
--   +2 pts per shared top language  (from profiles.top_languages text[])
--   +3 pts per shared org slug      (from profile_snapshots.snapshot->'orgs')
--
-- The function enforces visibility = 'public' internally (it is security definer
-- so RLS on profiles is bypassed — the filter must live here, exactly as in
-- search_profiles). Only profiles with a positive similarity score are returned.
-- The caller (anon / authenticated) receives at most 6 rows.

create or replace function public.find_similar_profiles(p_username text)
returns table (
  username             text,
  name                 text,
  avatar_url           text,
  score                integer,
  top_languages        text[],
  shared_language_count integer,
  shared_org_count      integer,
  similarity_score      integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_languages text[];
  v_target_orgs      text[];
begin
  -- ── 1. Resolve the normalised username ───────────────────────────────────
  -- All callers normalise to lower-case before calling, but enforce it here
  -- so the function is robust even if a caller forgets.
  p_username := lower(p_username);

  -- ── 2. Fetch the target's top languages ──────────────────────────────────
  select p.top_languages
    into v_target_languages
    from public.profiles p
   where lower(p.username) = p_username
     and p.visibility = 'public';

  -- If the target is not a public registered user, return an empty result set.
  if not found then
    return;
  end if;

  -- Default to an empty array so the language overlap expression is safe.
  v_target_languages := coalesce(v_target_languages, '{}');

  -- ── 3. Fetch the target's org slugs from their latest snapshot ───────────
  -- The orgs array in the snapshot has the shape:
  --   [{"login": "...", "name": "...", "avatarUrl": "...", "url": "..."}, ...]
  -- We extract the "login" field as the canonical identifier.
  select coalesce(
    array(
      select lower(org_elem->>'login')
        from public.profile_snapshots ps,
             jsonb_array_elements(
               case
                 when jsonb_typeof(ps.snapshot->'orgs') = 'array'
                 then ps.snapshot->'orgs'
                 else '[]'::jsonb
               end
             ) as org_elem
       where ps.username = p_username
         and (org_elem->>'login') is not null
    ),
    '{}'::text[]
  ) into v_target_orgs;

  -- ── 4. Score and return the best-matching public profiles ─────────────────
  return query
    select
      p.username,
      p.name,
      p.avatar_url,
      p.score,
      p.top_languages,

      -- Shared-language count: number of elements common to both arrays.
      -- `array_length(...) - array_length(... \ ...)` is the standard PG trick
      -- for set intersection cardinality without an unnest join.
      coalesce(
        (
          select count(*)::integer
            from unnest(p.top_languages) as lang
           where lang = any(v_target_languages)
        ),
        0
      ) as shared_language_count,

      -- Shared-org count: extract this profile's org slugs from its snapshot
      -- and count how many appear in v_target_orgs.
      coalesce(
        (
          select count(*)::integer
            from jsonb_array_elements(
                   case
                     when jsonb_typeof(ps_cand.snapshot->'orgs') = 'array'
                     then ps_cand.snapshot->'orgs'
                     else '[]'::jsonb
                   end
                 ) as cand_org
           where lower(cand_org->>'login') = any(v_target_orgs)
        ),
        0
      ) as shared_org_count,

      -- Weighted similarity score
      (
        coalesce(
          (
            select count(*)::integer
              from unnest(p.top_languages) as lang
             where lang = any(v_target_languages)
          ),
          0
        ) * 2
        +
        coalesce(
          (
            select count(*)::integer
              from jsonb_array_elements(
                     case
                       when jsonb_typeof(ps_cand.snapshot->'orgs') = 'array'
                       then ps_cand.snapshot->'orgs'
                       else '[]'::jsonb
                     end
                   ) as cand_org
             where lower(cand_org->>'login') = any(v_target_orgs)
          ),
          0
        ) * 3
      ) as similarity_score

    from public.profiles p
    -- Outer join so profiles without a snapshot still appear (language-only match).
    left join public.profile_snapshots ps_cand
           on ps_cand.username = lower(p.username)

    where
      -- Never return the target themselves.
      lower(p.username) <> p_username
      -- Only surface public profiles (enforced manually — security definer
      -- bypasses RLS, so this must live here just as in search_profiles).
      and p.visibility = 'public'

    having
      -- Filter out zero-overlap profiles after scoring.
      (
        coalesce(
          (
            select count(*)::integer
              from unnest(p.top_languages) as lang
             where lang = any(v_target_languages)
          ),
          0
        ) * 2
        +
        coalesce(
          (
            select count(*)::integer
              from jsonb_array_elements(
                     case
                       when jsonb_typeof(ps_cand.snapshot->'orgs') = 'array'
                       then ps_cand.snapshot->'orgs'
                       else '[]'::jsonb
                     end
                   ) as cand_org
             where lower(cand_org->>'login') = any(v_target_orgs)
          ),
          0
        ) * 3
      ) > 0

    group by
      p.username, p.name, p.avatar_url, p.score, p.top_languages,
      ps_cand.snapshot

    order by similarity_score desc, p.score desc
    limit 6;
end;
$$;

comment on function public.find_similar_profiles(text) is
  'Returns up to 6 public profiles similar to p_username, ranked by shared '
  'top_languages (+2 pts each) and shared GitHub orgs (+3 pts each). '
  'Only public profiles with at least one overlap are returned.';

-- Grant execute to client roles (matches the pattern in
-- increment_profile_view_count). The function already enforces
-- visibility = ''public'' internally, so anon access is safe.
grant execute on function public.find_similar_profiles(text)
  to anon, authenticated, service_role;
