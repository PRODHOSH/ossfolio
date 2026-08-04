import type { ContributorStats, Repo } from "@/types";

export interface ProviderBreakdown {
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  totalContributions: number;
}

export interface MultiProviderResult {
  combinedStats: ContributorStats;
  combinedRepos: Repo[];
  providerStats: {
    github?: ProviderBreakdown;
    gitlab?: ProviderBreakdown;
    bitbucket?: ProviderBreakdown;
  };
}

export function aggregateMultiPlatformStats(
  github: { stats: ContributorStats; repos: Repo[] },
  gitlab?: { stats: ContributorStats; repos: Repo[] },
  bitbucket?: { stats: ContributorStats; repos: Repo[] },
): MultiProviderResult {
  const ghStats = github.stats || { totalCommits: 0, totalPRs: 0, totalIssues: 0, totalReviews: 0, totalContributions: 0 };
  const glStats = gitlab?.stats || { totalCommits: 0, totalPRs: 0, totalIssues: 0, totalReviews: 0, totalContributions: 0 };
  const bbStats = bitbucket?.stats || { totalCommits: 0, totalPRs: 0, totalIssues: 0, totalReviews: 0, totalContributions: 0 };

  const totalCommits = ghStats.totalCommits + glStats.totalCommits + bbStats.totalCommits;
  const totalPRs = ghStats.totalPRs + glStats.totalPRs + bbStats.totalPRs;
  const totalIssues = ghStats.totalIssues + glStats.totalIssues + bbStats.totalIssues;
  const totalReviews = ghStats.totalReviews + glStats.totalReviews + bbStats.totalReviews;
  const totalContributions = totalCommits + totalPRs * 3 + totalIssues * 2 + totalReviews * 2;

  const combinedStats: ContributorStats = {
    totalCommits,
    totalPRs,
    totalIssues,
    totalReviews,
    totalContributions,
  };

  const combinedRepos = [
    ...(github.repos || []),
    ...(gitlab?.repos || []),
    ...(bitbucket?.repos || []),
  ];

  return {
    combinedStats,
    combinedRepos,
    providerStats: {
      github: {
        commits: ghStats.totalCommits,
        prs: ghStats.totalPRs,
        issues: ghStats.totalIssues,
        reviews: ghStats.totalReviews,
        totalContributions: ghStats.totalContributions || (ghStats.totalCommits + ghStats.totalPRs * 3 + ghStats.totalIssues * 2 + ghStats.totalReviews * 2),
      },

      ...(gitlab && glStats.totalCommits > 0
        ? {
            gitlab: {
              commits: glStats.totalCommits,
              prs: glStats.totalPRs,
              issues: glStats.totalIssues,
              reviews: glStats.totalReviews,
              totalContributions: glStats.totalContributions,
            },
          }
        : {}),

      ...(bitbucket && bbStats.totalCommits > 0
        ? {
            bitbucket: {
              commits: bbStats.totalCommits,
              prs: bbStats.totalPRs,
              issues: bbStats.totalIssues,
              reviews: bbStats.totalReviews,
              totalContributions: bbStats.totalContributions,
            },
          }
        : {}),
    },
  };
}
