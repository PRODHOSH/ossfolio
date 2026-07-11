-- Create index on score and username for optimized leaderboard and discover pagination
CREATE INDEX IF NOT EXISTS idx_profiles_score_username ON public.profiles(score DESC, username ASC);

-- Create index on organization logins to speed up member retrieval
CREATE INDEX IF NOT EXISTS idx_organizations_login ON public.organizations(login);

-- Add index for profiles metadata columns
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);
