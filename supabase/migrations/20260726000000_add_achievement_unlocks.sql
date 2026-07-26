-- Migration to add achievement_unlocks table for gamified streaks & milestone celebrations
CREATE TABLE IF NOT EXISTS public.achievement_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT unique_user_achievement UNIQUE (username, achievement_id)
);

-- Performance index for retrieving unlocked milestones timeline per user
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user_time
    ON public.achievement_unlocks (username, unlocked_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.achievement_unlocks ENABLE ROW LEVEL SECURITY;

-- Allow public select for viewing user milestone timelines
CREATE POLICY "Allow public select for achievement unlocks"
    ON public.achievement_unlocks
    FOR SELECT
    USING (true);

-- Allow public insert for tracking unlocked achievements
CREATE POLICY "Allow public insert for achievement unlocks"
    ON public.achievement_unlocks
    FOR INSERT
    WITH CHECK (true);
