import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/** Fetch current view_count for a profile username */
export async function fetchProfileViewCount(username: string): Promise<number> {
  if (!username) return 0;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return 0;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('view_count')
      .eq('username', username.toLowerCase())
      .single();

    if (error || !data) return 0;
    return Number(data.view_count) || 0;
  } catch (err) {
    console.error('Error fetching view_count:', err);
    return 0;
  }
}

/** Atomically increment and return the view_count for a profile username */
export async function incrementProfileView(username: string): Promise<number> {
  if (!username) return 0;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) return 0;

  try {
    const client = serviceKey
      ? createClient(supabaseUrl, serviceKey)
      : supabase;

    // First attempt to call RPC function
    const { data, error } = await client.rpc('increment_profile_view_count', {
      target_username: username.toLowerCase(),
    });

    if (!error && typeof data === 'number') {
      return data;
    }

    // Fallback: direct update if RPC is not present
    const current = await fetchProfileViewCount(username);
    const newCount = current + 1;

    const { error: updateError } = await client
      .from('profiles')
      .update({ view_count: newCount })
      .eq('username', username.toLowerCase());

    if (updateError) {
      console.error('Fallback view_count update failed:', updateError.message);
      return current;
    }

    return newCount;
  } catch (err) {
    console.error('Failed to increment profile view:', err);
    return 0;
  }
}
