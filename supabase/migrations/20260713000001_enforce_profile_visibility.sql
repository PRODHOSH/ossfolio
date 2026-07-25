-- Profile visibility: make the setting actually do something.
--
-- `visibility` has existed since 20260627000002 and /settings has been writing it, but nothing
-- read it. A user who chose "unlisted" was still ranked on Explore and still returned by
-- /api/discover — the control saved, reported success, and changed nothing. This migration and the
-- accompanying app changes close that.
--
-- Semantics, stated once so the three enforcement points below can be checked against them:
--
--   public    listed on Explore and /api/discover; page renders.
--   unlisted  absent from every listing; the page still renders for anyone with the direct link.
--   private   absent from every listing; the page 404s.

-- ---------------------------------------------------------------------------------------------
-- 1. Allow 'private'.
--
-- The original CHECK permitted only ('public', 'unlisted'), so the third state the settings UI is
-- meant to offer was rejected by the database. Re-stating the constraint rather than adding a
-- second one keeps a single source of truth for the allowed values.
-- ---------------------------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_visibility_check;

-- `not valid` so adding the constraint does not take a full table scan under a lock that blocks
-- writes to `profiles` for its duration. That scan buys nothing here: the new constraint is a strict
-- superset of the old one (it only adds 'private'), so every existing row already satisfies it by
-- construction. The validate below then confirms that without holding writes.
alter table public.profiles
  add constraint profiles_visibility_check
  check (visibility in ('public', 'unlisted', 'private')) not valid;

alter table public.profiles
  validate constraint profiles_visibility_check;

-- ---------------------------------------------------------------------------------------------
-- 2. Exclude non-public profiles from search_profiles.
--
-- This is the one that matters most, and it cannot be fixed in the API route. `search_profiles` is
-- `security definer`, so it executes with the definer's privileges and Row Level Security does not
-- apply to the rows it reads. Any policy added to `profiles` would be bypassed here — the filter
-- has to live inside the function.
--
-- Re-declared in full (rather than patched) because `create or replace function` requires the
-- complete definition; this is the 20260710000000 version with a single added predicate, and
-- nothing else about it changes.
-- ---------------------------------------------------------------------------------------------
create or replace function public.search_profiles(
  query text default '',
  lang text default '',
  min_score integer default 0,
  sort_by text default 'score',
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  username text,
  name text,
  avatar_url text,
  bio text,
  score integer,
  total_prs integer,
  total_commits integer,
  total_issues integer,
  followers integer,
  top_languages text[],
  score_delta_30_days integer
)
language plpgsql security definer set search_path = public
as $$
begin
  return query
    select
      p.username,
      p.name,
      p.avatar_url,
      p.bio,
      p.score,
      p.total_prs,
      p.total_commits,
      p.total_issues,
      p.followers,
      p.top_languages,
      p.score_delta_30_days
    from public.profiles p
    where
      (query = '' or p.search_text @@ plainto_tsquery('english', query))
      and (lang = '' or p.top_languages @> array[lang])
      and p.score >= min_score
      -- The only change from the previous definition. Discover is a listing, so it shows public
      -- profiles and nothing else: `unlisted` opted out of being found, `private` opted out
      -- entirely.
      and p.visibility = 'public'
    order by
      case when sort_by = 'score' then p.score else 0 end desc,
      case when sort_by = 'contributions' then (p.total_prs + p.total_commits + p.total_issues) else 0 end desc,
      case when sort_by = 'followers' then p.followers else 0 end desc,
      case when sort_by = 'improvement' then p.score_delta_30_days else 0 end desc,
      p.username asc
    limit least(page_size, 100)
    offset least(page_offset, 1000);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. A note on why RLS is deliberately *not* used to hide private rows.
--
-- The obvious move is a policy like `using (visibility <> 'private' or auth.uid() = id)`. It is
-- the wrong one here, and quietly so.
--
-- ossfolio renders /[username] for *any* GitHub account, whether or not it has ever signed in — a
-- missing `profiles` row is the normal case, not an error (see [username]/page.tsx, which fetches
-- the row with `.maybeSingle()` and carries on when it is null). If RLS hid private rows, the page
-- could not distinguish "this profile is private" from "this person never signed up", so instead
-- of returning 404 it would fall back to rendering the public GitHub data — and the privacy
-- setting would look like it worked while doing nothing. That is the exact failure this migration
-- exists to fix, so reintroducing it via RLS would be a poor trade.
--
-- Enforcement therefore lives where the distinction is visible: the app reads `visibility` and
-- returns notFound() for `private`. The listing paths are closed above and in explore/page.tsx.
-- ---------------------------------------------------------------------------------------------
