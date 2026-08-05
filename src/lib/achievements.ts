import type { ContributorStats } from '@/types';

/**
 * Achievements — automatically earned milestones, derived from a profile's GitHub stats.
 *
 * Distinct from the existing `badges` on a profile, which are self-declared programme
 * badges (GSoC, GSSoC, …) that a user picks in the badge modal. These are computed, not
 * chosen: you either hit the number or you haven't.
 *
 * Two decisions worth spelling out.
 *
 * 1. **Locked achievements are returned too, with their progress.** The issue asks for
 *    "milestones to strive for" — a milestone you cannot see is not something you can
 *    strive for. Filtering to only the unlocked ones would turn this into a trophy
 *    cabinet rather than a goal list, so `evaluateAchievements` always returns every
 *    definition and lets the UI dim the ones that aren't earned yet.
 *
 * 2. **Every metric here is exact, and free.** Each reads a value the profile page has
 *    already fetched and passed down, so the whole system costs zero additional GitHub
 *    calls and zero additional database queries.
 *
 * On the issue's "Night Owl" example (late-night commits): that one is not currently
 * computable. GitHub's contributions calendar is per-day (`date` + `count`) and
 * `ContributorStats` carries no timestamps, so nothing in the data model knows what
 * *hour* a commit landed. Getting that would mean walking every commit in every repo for
 * its author date — hundreds of API calls per profile view, which runs directly against
 * the caching and rate-limit work elsewhere in the codebase. It's left out deliberately
 * rather than faked; see the PR for the trade-off.
 */

export interface Achievement {
  id: string;
  name: string;
  /** What earning it actually means, in plain words. */
  tagline: string;
  unlocked: boolean;
  /** How far along the user is — already clamped to `target`. */
  current: number;
  target: number;
  /** 0–1, for the progress bar. */
  progress: number;
  category: 'streak' | 'contributions' | 'community' | 'funding';
  icon: string;
  unlockedAt?: string;
}

/** Everything an achievement can be measured against. All of it is already on the page. */
export interface AchievementInput {
  stats: ContributorStats;
  longestStreak: number;
  currentStreak?: number;
  hasFunding?: boolean;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  tagline: string;
  target: number;
  category: 'streak' | 'contributions' | 'community' | 'funding';
  icon: string;
  measure: (input: AchievementInput) => number;
}

/**
 * The registry of gamified streaks & milestones.
 */
export const DEFINITIONS: readonly AchievementDefinition[] = [
  {
    id: 'daily_grind',
    name: 'Daily Grind',
    tagline: 'A 7-day active contribution streak',
    target: 7,
    category: 'streak',
    icon: '🔥',
    measure: ({ longestStreak = 0, currentStreak = 0 }) =>
      Math.max(longestStreak, currentStreak),
  },
  {
    id: 'marathon',
    name: 'Marathon',
    tagline: 'A 30-day contribution streak',
    target: 30,
    category: 'streak',
    icon: '⚡',
    measure: ({ longestStreak = 0, currentStreak = 0 }) =>
      Math.max(longestStreak, currentStreak),
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    tagline: 'A 100-day contribution streak',
    target: 100,
    category: 'streak',
    icon: '🛡️',
    measure: ({ longestStreak = 0, currentStreak = 0 }) =>
      Math.max(longestStreak, currentStreak),
  },
  {
    id: 'first_step',
    name: 'First Step',
    tagline: 'First merged pull request in open source',
    target: 1,
    category: 'contributions',
    icon: '🌱',
    measure: ({ stats }) => stats?.totalPRs ?? 0,
  },
  {
    id: 'century',
    name: 'Century',
    tagline: '100 merged pull requests',
    target: 100,
    category: 'contributions',
    icon: '🏆',
    measure: ({ stats }) => stats?.totalPRs ?? 0,
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    tagline: '50 code reviews for other people',
    target: 50,
    category: 'community',
    icon: '👀',
    measure: ({ stats }) => stats?.totalReviews ?? 0,
  },
  {
    id: 'bug_hunter',
    name: 'Bug Hunter',
    tagline: '10 closed issues or contributions',
    target: 10,
    category: 'contributions',
    icon: '🎯',
    measure: ({ stats }) => stats?.totalIssues ?? 0,
  },
  {
    id: 'sponsored_creator',
    name: 'Sponsored Creator',
    tagline: 'Configured sponsorship and open-source funding options',
    target: 1,
    category: 'funding',
    icon: '💖',
    measure: ({ hasFunding }) => (hasFunding ? 1 : 0),
  },
];

/**
 * Evaluate every achievement against a profile's stats.
 *
 * Pure and deterministic: same stats in, same achievements out. Returns them in a stable
 * order so cards never reshuffle between renders.
 */
export function evaluateAchievements(input: AchievementInput): Achievement[] {
  return DEFINITIONS.map((def) => {
    const raw = def.measure(input);

    // A stat can arrive missing or malformed — a degraded snapshot, a GitHub hiccup. Fall
    // back to 0 rather than rendering "NaN / 100" or a negative progress bar.
    const measured = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;

    // Clamp so an over-achiever reads "100 / 100", not "412 / 100".
    const current = Math.min(measured, def.target);

    // Explicitly bound the progress ratio to [0, 1] for UI safety
    const progress =
      def.target > 0 ? Math.max(0, Math.min(1, current / def.target)) : 0;

    return {
      id: def.id,
      name: def.name,
      tagline: def.tagline,
      target: def.target,
      current,
      unlocked: measured >= def.target,
      progress,
      category: def.category,
      icon: def.icon,
    };
  });
}

/** How many of the achievements a profile has earned. */
export function countUnlocked(achievements: Achievement[]): number {
  return achievements.filter((a) => a.unlocked).length;
}
