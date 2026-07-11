import type { ContributorStats, Repo } from "@/types";
import { calculateScore } from "@/lib/score";

/**
 * Heuristic anti-gaming check for the contributor score.
 *
 * The exploit this targets: commits are weighted directly in `calculateScore`
 * (SCORE_WEIGHTS.COMMIT), so an account that spams empty commits gains score
 * with no real contribution. Empty-commit spam has a distinctive shape — a very
 * large commit count paired with almost no collaborative activity (PRs, issues,
 * reviews) and no community validation (stars). Legitimate high-volume
 * contributors essentially always have proportional PRs/reviews, stars, or both.
 *
 * v1 is deliberately conservative: an account must clear *all* of the guards
 * below before it is flagged, so false positives stay rare. Thresholds are
 * exported constants so they can be tuned without touching the logic.
 *
 * Note: `ContributorStats` carries only aggregate totals (no time dimension), so
 * a literal commits-per-day velocity isn't computable here. This ratio signal
 * uses only data already fetched — no extra GitHub calls.
 */
export const ANOMALY_THRESHOLDS = {
  /** Accounts below this many commits are never flagged (protects small/new accounts). */
  MIN_COMMITS: 1000,
  /** Commits per collaborative contribution (PRs + issues + reviews) above which activity looks synthetic. */
  MAX_COMMIT_RATIO: 50,
  /** An account with at least this many total stars is treated as community-validated and never flagged. */
  CREDIBLE_STARS: 50,
} as const;

/** A flagged account's score is multiplied by this (a discount, not a zeroing — reversible and tunable). */
export const ANOMALY_SCORE_MULTIPLIER = 0.25;

export interface AnomalyResult {
  flagged: boolean;
  /** Human-readable justification, persisted to `profiles.flag_reason` for auditability. */
  reason: string | null;
  /** commits ÷ (PRs + issues + reviews); equals the commit count when there is no collaborative activity. */
  commitRatio: number;
}

/**
 * Applies the ratio heuristic to a contributor's aggregate stats.
 * Pure — no side effects, no network.
 */
export function detectAnomaly(
  stats: ContributorStats,
  totalStars: number
): AnomalyResult {
  const collaborative =
    stats.totalPRs + stats.totalIssues + stats.totalReviews;
  const commitRatio =
    collaborative > 0 ? stats.totalCommits / collaborative : stats.totalCommits;

  const notFlagged: AnomalyResult = { flagged: false, reason: null, commitRatio };

  // Guard 1 — too little volume to be worth flagging.
  if (stats.totalCommits < ANOMALY_THRESHOLDS.MIN_COMMITS) return notFlagged;

  // Guard 2 — community validation. Stars mean real projects people use.
  if (totalStars >= ANOMALY_THRESHOLDS.CREDIBLE_STARS) return notFlagged;

  // Guard 3 — the ratio itself must be implausible.
  if (commitRatio < ANOMALY_THRESHOLDS.MAX_COMMIT_RATIO) return notFlagged;

  return {
    flagged: true,
    reason:
      `Unusual commit ratio: ${stats.totalCommits.toLocaleString("en-US")} commits ` +
      `vs ${collaborative.toLocaleString("en-US")} PRs/issues/reviews ` +
      `(${Math.round(commitRatio)}:1) with ${totalStars} stars`,
    commitRatio,
  };
}

/** Returns the score after applying the flagged-account discount. */
export function applyAnomalyDiscount(
  score: number,
  anomaly: AnomalyResult
): number {
  if (!anomaly.flagged) return score;
  return Math.round(score * ANOMALY_SCORE_MULTIPLIER);
}

/**
 * Convenience wrapper for the sync path: computes the score, runs the heuristic,
 * and returns the (possibly discounted) score alongside the anomaly result so the
 * caller can persist both the score and the flag columns in one upsert.
 */
export function scoreWithAnomalyCheck(
  stats: ContributorStats,
  repos: Repo[]
): { score: number; rawScore: number; anomaly: AnomalyResult } {
  const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);
  const rawScore = calculateScore(stats, repos);
  const anomaly = detectAnomaly(stats, totalStars);
  return {
    score: applyAnomalyDiscount(rawScore, anomaly),
    rawScore,
    anomaly,
  };
}
