import type { ContributorStats, Repo } from "@/types";

/** Calculates the contributor score from GitHub activity — commits, PRs, issues, reviews, and capped stars. */
export function calculateScore(stats: ContributorStats, repos: Repo[]): number {
  const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);
  const score =
    stats.totalCommits * 1 + // Commits are the baseline unit of contribution (weight: 1)
    stats.totalPRs * 3 + // PRs require more effort than commits — they involve review, discussion, and cross-team collaboration (weight: 3)
    stats.totalIssues * 2 + // Issues drive meaningful project improvements and bug fixes, worth more than raw commits (weight: 2)
    stats.totalReviews * 2 + // Code reviews are high-value contributions that improve quality for the whole team (weight: 2)
    Math.min(totalStars, 1000) * 0.1; // Stars reflect project impact but are capped at 1000 to prevent one viral repo from dominating the score (weight: 0.1, cap: 1000)
  return Math.round(score);
}
