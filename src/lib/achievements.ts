import type { ContributorStats } from "@/types";

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
}

/** Everything an achievement can be measured against. All of it is already on the page. */
export interface AchievementInput {
  stats: ContributorStats;
  longestStreak: number;
}

interface AchievementDefinition {
  id: string;
  name: string;
  tagline: string;
  target: number;
  measure: (input: AchievementInput) => number;
}

/**
 * The registry. Starting with three, as the issue asks.
 *
 * They're deliberately spread across three different kinds of contribution rather than
 * three sizes of the same one — volume, consistency, and helping other people — so the
 * set rewards more than just shipping a lot of code.
 *
 * Adding a fourth is a five-line entry here; nothing else needs to change.
 */
const DEFINITIONS: readonly AchievementDefinition[] = [
  {
    id: "century",
    name: "Century",
    tagline: "100 merged pull requests",
    target: 100,
    measure: ({ stats }) => stats.totalPRs,
  },
  {
    id: "marathon",
    name: "Marathon",
    tagline: "A 30-day contribution streak",
    target: 30,
    measure: ({ longestStreak }) => longestStreak,
  },
  {
    id: "reviewer",
    name: "Reviewer",
    tagline: "50 code reviews for other people",
    target: 50,
    measure: ({ stats }) => stats.totalReviews,
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

    return {
      id: def.id,
      name: def.name,
      tagline: def.tagline,
      target: def.target,
      current,
      unlocked: measured >= def.target,
      progress: def.target > 0 ? current / def.target : 0,
    };
  });
}

/** How many of the achievements a profile has earned. */
export function countUnlocked(achievements: Achievement[]): number {
  return achievements.filter((a) => a.unlocked).length;
}
