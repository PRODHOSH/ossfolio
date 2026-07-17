-- Create index on score and username for optimized leaderboard and discover pagination
CREATE INDEX IF NOT EXISTS idx_profiles_score_username ON public.profiles(score DESC, username ASC);

-- Speed up the Explore org listing, which orders by score desc then slug asc.
-- (The original index referenced organizations(login), but there is no `login`
-- column -- that is a field on the GitHub API org object, not this table. The
-- table's columns are id, name, slug, avatar_url, score, created_at, so the old
-- index failed to create on a fresh database.)
CREATE INDEX IF NOT EXISTS idx_organizations_score_slug ON public.organizations(score DESC, slug ASC);

-- Add index for profiles metadata columns
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);
