-- Migration to add profile_views table for profile analytics tracking
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    referrer TEXT NOT NULL DEFAULT 'Direct',
    country TEXT NOT NULL DEFAULT 'Unknown',
    city TEXT NOT NULL DEFAULT 'Unknown',
    ip_hash TEXT NOT NULL DEFAULT '',
    device_type TEXT NOT NULL DEFAULT 'desktop'
);

-- Performance indexes for querying views per profile over time
CREATE INDEX IF NOT EXISTS idx_profile_views_username_time 
    ON public.profile_views (username, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_ip_hash_window 
    ON public.profile_views (username, ip_hash, viewed_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for view tracking
CREATE POLICY "Allow public insert for profile views" 
    ON public.profile_views 
    FOR INSERT 
    WITH CHECK (true);

-- Allow profile owners to view analytics for their own username
CREATE POLICY "Allow profile owner select on profile views" 
    ON public.profile_views 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE lower(profiles.username) = lower(profile_views.username)
            AND profiles.id = auth.uid()
        )
    );
