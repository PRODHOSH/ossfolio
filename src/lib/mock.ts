import type { HeatmapWeek } from '@/types';

/**
 * Heatmap fallback.
 *
 * GitHub's contribution calendar is only available through the authenticated
 * GraphQL API (see `contributionsCollection` in src/lib/github.ts). The public
 * profile page at /[username] uses the unauthenticated REST API, which does not
 * expose contribution counts. Until a token-backed path is wired up, we generate
 * a deterministic placeholder calendar so the heatmap section renders with a
 * realistic shape instead of being blank.
 *
 * Deterministic per-username (seeded) so the same profile always shows the same
 * placeholder rather than reshuffling on every request.
 */

const HEATMAP_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

function colorForCount(count: number): string {
  if (count === 0) return HEATMAP_COLORS[0];
  if (count < 3) return HEATMAP_COLORS[1];
  if (count < 6) return HEATMAP_COLORS[2];
  if (count < 9) return HEATMAP_COLORS[3];
  return HEATMAP_COLORS[4];
}

/**
 * Robust deterministic string hash (cyrb53) -> 32-bit int.
 * Significantly improves entropy over FNV-1a to prevent similar usernames
 * from generating nearly identical sequences.
 */
function seedFromString(str: string): number {
  let h1 = 0xdeadbeef ^ str.length,
    h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return h1 >>> 0;
}

/** Mulberry32 -- small seeded PRNG so the calendar is stable per username. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MockHeatmap {
  weeks: HeatmapWeek[];
  totalContributions: number;
}

/**
 * Builds 53 weeks of placeholder contribution data ending today, seeded by
 * username so it stays consistent across renders.
 */
export function generateMockHeatmap(username: string): MockHeatmap {
  const rand = mulberry32(seedFromString(username));
  const weeks: HeatmapWeek[] = [];
  let totalContributions = 0;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  // Walk back to the Sunday that starts the 53-week window using STRICT UTC math.
  // Using local getDay/getDate methods causes timezone drift when sliced into ISO strings.
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 7 * 52 - today.getUTCDay());

  const cursor = new Date(start);
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const dateKey = cursor.toISOString().slice(0, 10);

      // Don't generate counts for days in the future. Lexicographical comparison
      // of UTC strings ensures timezone-agnostic safety across boundaries.
      const isFuture = dateKey > todayKey;

      // Weekends quieter than weekdays, with occasional zero days (Strict UTC).
      const weekday = cursor.getUTCDay();
      const base = weekday === 0 || weekday === 6 ? 2 : 5;
      const roll = rand();
      let count = 0;
      if (!isFuture && roll > 0.35) {
        count = Math.floor(roll * base * 2);
      }
      totalContributions += count;
      days.push({
        date: dateKey,
        count,
        color: isFuture ? HEATMAP_COLORS[0] : colorForCount(count),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push({ days });
  }

  return { weeks, totalContributions };
}

/**
 * Contribution streaks derived from the heatmap calendar.
 * - current: consecutive days with >=1 contribution ending at the most recent
 *   (non-future) day.
 * - longest: the longest consecutive run of contributing days anywhere in the
 *   window.
 * Future-dated padding days (the seeded calendar fills the final partial week)
 * are excluded so they neither break nor pad a streak. YYYY-MM-DD strings sort
 * lexicographically, so string comparison against today is safe.
 *
 * `todayKey` is injectable (defaults to the current UTC date) so the value is
 * deterministic for tests and can be computed once on the server and reused,
 * avoiding any SSR/hydration drift across a UTC day boundary.
 */
export function computeStreaks(
  weeks: HeatmapWeek[],
  todayKey: string = new Date().toISOString().slice(0, 10),
): { current: number; longest: number } {
  const days = weeks.flatMap((w) => w.days).filter((d) => d.date <= todayKey);

  let longest = 0;
  let run = 0;
  for (const day of days) {
    if (day.count > 0) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current += 1;
    else break;
  }

  return { current, longest };
}
