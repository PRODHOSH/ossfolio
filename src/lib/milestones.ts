import { supabase } from '@/lib/supabase';
import type { Achievement } from '@/lib/achievements';

export interface AchievementUnlockRecord {
  id?: string;
  username: string;
  achievement_id: string;
  unlocked_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fetch all recorded achievement unlocks for a user from Supabase.
 */
export async function fetchUserUnlockedMilestones(
  username: string,
): Promise<Record<string, string>> {
  if (!username) return {};

  try {
    const { data, error } = await supabase
      .from('achievement_unlocks')
      .select('achievement_id, unlocked_at')
      .eq('username', username.toLowerCase());

    if (error || !data) {
      return {};
    }

    const map: Record<string, string> = {};
    data.forEach((row) => {
      map[row.achievement_id] = row.unlocked_at;
    });
    return map;
  } catch (err) {
    console.error('Failed to fetch achievement unlocks:', err);
    return {};
  }
}

/**
 * Synchronize unlocked achievements for a profile into Supabase.
 * Records new unlocks with their timestamp.
 */
export async function syncUnlockedAchievements(
  username: string,
  achievements: Achievement[],
): Promise<Record<string, string>> {
  if (!username || achievements.length === 0) return {};

  const normalizedUsername = username.toLowerCase();
  const unlocked = achievements.filter((a) => a.unlocked);

  if (unlocked.length === 0) return {};

  try {
    const existing = await fetchUserUnlockedMilestones(normalizedUsername);
    const newUnlocks = unlocked.filter((a) => !existing[a.id]);

    if (newUnlocks.length > 0) {
      const recordsToInsert = newUnlocks.map((a) => ({
        username: normalizedUsername,
        achievement_id: a.id,
        unlocked_at: new Date().toISOString(),
        metadata: {
          name: a.name,
          target: a.target,
          current: a.current,
        },
      }));

      await supabase
        .from('achievement_unlocks')
        .upsert(recordsToInsert, { onConflict: 'username, achievement_id' });

      // Merge newly inserted timestamps into result
      newUnlocks.forEach((a) => {
        existing[a.id] = new Date().toISOString();
      });
    }

    return existing;
  } catch (err) {
    console.error('Failed to sync achievement unlocks:', err);
    return {};
  }
}
