import type {
  ContributorStats,
  Repo,
  ContributionImpactContext,
  PRImpactDetails,
  IssueImpactDetails,
  ImpactBreakdown,
} from '@/types';

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
  impactMultiplier: number;
  impactBonus: number;
  impactBreakdown: ImpactBreakdown;
}

/** Helper to prevent floating-point precision drift */
function roundPrecision(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

/** Calculates multiplier based on repo star count popularity */
export function getRepoStarMultiplier(stars: number): number {
  if (stars >= 10000) return 2.5;
  if (stars >= 1000) return 2.0;
  if (stars >= 100) return 1.5;
  if (stars >= 10) return 1.2;
  return 1.0;
}

/** Calculates multiplier based on label significance (bug, critical, enhancement, docs) */
export function getLabelMultiplier(labels: string[]): number {
  if (!labels || labels.length === 0) return 1.0;

  const normalized = labels.map((l) => l.toLowerCase());
  let maxMultiplier = 1.0;

  for (const label of normalized) {
    if (
      label.includes('critical') ||
      label.includes('security') ||
      label.includes('urgent')
    ) {
      maxMultiplier = Math.max(maxMultiplier, 2.0);
    } else if (
      label.includes('bug') ||
      label.includes('high-priority') ||
      label.includes('breaking')
    ) {
      maxMultiplier = Math.max(maxMultiplier, 1.5);
    } else if (label.includes('enhancement') || label.includes('feature')) {
      maxMultiplier = Math.max(maxMultiplier, 1.2);
    } else if (
      label.includes('documentation') ||
      label.includes('docs') ||
      label.includes('typo') ||
      label.includes('chore') ||
      label.includes('trivial')
    ) {
      // Lower impact multiplier for trivial changes if no higher label exists
      if (maxMultiplier === 1.0) {
        maxMultiplier = 0.8;
      }
    }
  }

  return maxMultiplier;
}

/** Calculates multiplier based on comment and discussion volume */
export function getDiscussionMultiplier(commentsCount: number): number {
  if (commentsCount >= 15) return 1.4;
  if (commentsCount >= 6) return 1.25;
  if (commentsCount >= 1) return 1.1;
  return 1.0;
}

export function calculatePRImpactMultiplier(item: PRImpactDetails): number {
  const starMult = getRepoStarMultiplier(item.repoStars || 0);
  const labelMult = getLabelMultiplier(item.labels || []);
  const discMult = getDiscussionMultiplier(item.commentsCount || 0);
  const raw = starMult * labelMult * discMult;
  return Math.min(Math.max(roundPrecision(raw), 0.5), 5.0);
}

export function calculateIssueImpactMultiplier(
  item: IssueImpactDetails,
): number {
  const starMult = getRepoStarMultiplier(item.repoStars || 0);
  const labelMult = getLabelMultiplier(item.labels || []);
  const discMult = getDiscussionMultiplier(item.commentsCount || 0);
  const raw = starMult * labelMult * discMult;
  return Math.min(Math.max(roundPrecision(raw), 0.5), 5.0);
}

export function calculateContributionImpact(
  impactContext?: ContributionImpactContext,
): ImpactBreakdown {
  const prs = impactContext?.prs || [];
  const issues = impactContext?.issues || [];

  let prMultiplier = 1.0;
  let highImpactPRsCount = 0;
  if (prs.length > 0) {
    const prMults = prs.map((pr) => {
      const mult = calculatePRImpactMultiplier(pr);
      if (mult >= 1.5) highImpactPRsCount++;
      return mult;
    });
    prMultiplier = roundPrecision(
      prMults.reduce((a, b) => a + b, 0) / prs.length,
    );
  }

  let issueMultiplier = 1.0;
  let criticalIssuesCount = 0;
  if (issues.length > 0) {
    const issueMults = issues.map((issue) => {
      const mult = calculateIssueImpactMultiplier(issue);
      const labelMult = getLabelMultiplier(issue.labels || []);
      if (labelMult >= 1.5) criticalIssuesCount++;
      return mult;
    });
    issueMultiplier = roundPrecision(
      issueMults.reduce((a, b) => a + b, 0) / issues.length,
    );
  }

  let overallImpactMultiplier = 1.0;
  if (prs.length > 0 && issues.length > 0) {
    overallImpactMultiplier = roundPrecision(
      prMultiplier * 0.6 + issueMultiplier * 0.4,
    );
  } else if (prs.length > 0) {
    overallImpactMultiplier = prMultiplier;
  } else if (issues.length > 0) {
    overallImpactMultiplier = issueMultiplier;
  }

  overallImpactMultiplier = Math.min(
    Math.max(overallImpactMultiplier, 0.5),
    3.0,
  );

  const totalRepoStarsSum =
    prs.reduce((sum, p) => sum + (p.repoStars || 0), 0) +
    issues.reduce((sum, i) => sum + (i.repoStars || 0), 0);
  const totalItemsCount = prs.length + issues.length;
  const averageRepoStars =
    totalItemsCount > 0 ? Math.round(totalRepoStarsSum / totalItemsCount) : 0;

  return {
    impactMultiplier: overallImpactMultiplier,
    prMultiplier,
    issueMultiplier,
    highImpactPRsCount,
    criticalIssuesCount,
    averageRepoStars,
    impactBonus: 0, // Populated in getScoreBreakdown
  };
}

export function getScoreBreakdown(
  stats: {
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    totalReviews: number;
  },
  totalStars: number,
  impactContext?: ContributionImpactContext,
): ScoreBreakdown {
  const impactBreakdown = calculateContributionImpact(impactContext);

  const commitsContribution = stats.totalCommits * SCORE_WEIGHTS.COMMIT;
  const prsContribution = roundPrecision(
    stats.totalPRs * SCORE_WEIGHTS.PR * impactBreakdown.prMultiplier,
  );
  const issuesContribution = roundPrecision(
    stats.totalIssues * SCORE_WEIGHTS.ISSUE * impactBreakdown.issueMultiplier,
  );
  const reviewsContribution = stats.totalReviews * SCORE_WEIGHTS.REVIEW;
  const starsContribution = Math.min(totalStars, STAR_CAP) * SCORE_WEIGHTS.STAR;

  const rawTotal =
    commitsContribution +
    prsContribution +
    issuesContribution +
    reviewsContribution +
    starsContribution;

  const totalWithoutImpact =
    commitsContribution +
    stats.totalPRs * SCORE_WEIGHTS.PR +
    stats.totalIssues * SCORE_WEIGHTS.ISSUE +
    reviewsContribution +
    starsContribution;

  const impactBonus = roundPrecision(rawTotal - totalWithoutImpact);
  impactBreakdown.impactBonus = impactBonus;

  const total = Math.round(roundPrecision(rawTotal));

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
    impactMultiplier: impactBreakdown.impactMultiplier,
    impactBonus,
    impactBreakdown,
  };
}

/** Calculates the contributor score from GitHub activity — commits, PRs, issues, reviews, capped stars, and qualitative impact. */
export function calculateScore(
  stats: ContributorStats,
  repos: Repo[],
  impactContext?: ContributionImpactContext,
): number {
  const totalStars = Array.isArray(repos)
    ? repos.reduce((sum, r) => sum + (r.stars || 0), 0)
    : 0;
  const breakdown = getScoreBreakdown(stats, totalStars, impactContext);
  return breakdown.total;
}
