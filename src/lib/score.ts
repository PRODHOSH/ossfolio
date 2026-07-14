import type { ContributorStats, Repo } from "@/types";

export const SCORE_WEIGHTS = {
  COMMIT: 1,
  PR: 3,
  ISSUE: 2,
  REVIEW: 2,
  STAR: 0.1,
} as const;

export const STAR_CAP = 1000;

export interface ScoreBreakdown {
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  stars: number;
  commitsContribution: number;
  prsContribution: number;
  issuesContribution: number;
  reviewsContribution: number;
  starsContribution: number;
  total: number;
}

export function getScoreBreakdown(
  stats: {
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    totalReviews: number;
  },
  totalStars: number
): ScoreBreakdown {
  const commitsContribution = stats.totalCommits * SCORE_WEIGHTS.COMMIT;
  const prsContribution = stats.totalPRs * SCORE_WEIGHTS.PR;
  const issuesContribution = stats.totalIssues * SCORE_WEIGHTS.ISSUE;
  const reviewsContribution = stats.totalReviews * SCORE_WEIGHTS.REVIEW;
  const starsContribution = Math.min(totalStars, STAR_CAP) * SCORE_WEIGHTS.STAR;

  const total = Math.round(
    commitsContribution +
    prsContribution +
    issuesContribution +
    reviewsContribution +
    starsContribution
  );

  return {
    commits: stats.totalCommits,
    prs: stats.totalPRs,
    issues: stats.totalIssues,
    reviews: stats.totalReviews,
    stars: totalStars,
    commitsContribution,
    prsContribution,
    issuesContribution,
    reviewsContribution,
    starsContribution,
    total,
  };
}

/** Calculates the contributor score from GitHub activity — commits, PRs, issues, reviews, and capped stars. */
export function calculateScore(stats: ContributorStats, repos: Repo[]): number {
  const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);
  const breakdown = getScoreBreakdown(stats, totalStars);
  return breakdown.total;
}


