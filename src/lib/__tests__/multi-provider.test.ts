import { describe, it, expect } from "vitest";
import { fetchGitLabStats } from "../providers/gitlab";
import { fetchBitbucketStats } from "../providers/bitbucket";
import { aggregateMultiPlatformStats } from "../providers/aggregator";
import type { ContributorStats, Repo } from "@/types";

describe("Multi-Provider Data Integration Engine", () => {
  it("handles empty or missing usernames gracefully", async () => {
    const gitlab = await fetchGitLabStats("");
    expect(gitlab.stats.totalCommits).toBe(0);
    expect(gitlab.repos).toEqual([]);

    const bitbucket = await fetchBitbucketStats("");
    expect(bitbucket.stats.totalCommits).toBe(0);
    expect(bitbucket.repos).toEqual([]);
  });

  it("aggregates stats cleanly across GitHub, GitLab, and Bitbucket", () => {
    const githubData = {
      stats: { totalCommits: 300, totalPRs: 40, totalIssues: 10, totalReviews: 20, totalContributions: 480 },
      repos: [{ name: "gh-repo", description: "GitHub Repo", stars: 10, forks: 2, language: "TypeScript", languageColor: "#3178c6", url: "https://github.com/gh-repo", topics: [] }],
    };

    const gitlabData = {
      stats: { totalCommits: 120, totalPRs: 15, totalIssues: 5, totalReviews: 8, totalContributions: 191 },
      repos: [{ name: "gl-repo", description: "GitLab Repo", stars: 5, forks: 1, language: "Go", languageColor: "#fc6d26", url: "https://gitlab.com/gl-repo", topics: [] }],
    };

    const bitbucketData = {
      stats: { totalCommits: 45, totalPRs: 5, totalIssues: 2, totalReviews: 3, totalContributions: 70 },
      repos: [{ name: "bb-repo", description: "Bitbucket Repo", stars: 0, forks: 0, language: "Python", languageColor: "#205081", url: "https://bitbucket.org/bb-repo", topics: [] }],
    };

    const result = aggregateMultiPlatformStats(githubData, gitlabData, bitbucketData);

    expect(result.combinedStats.totalCommits).toBe(465); // 300 + 120 + 45
    expect(result.combinedStats.totalPRs).toBe(60); // 40 + 15 + 5
    expect(result.combinedStats.totalIssues).toBe(17); // 10 + 5 + 2
    expect(result.combinedStats.totalReviews).toBe(31); // 20 + 8 + 3
    expect(result.combinedRepos.length).toBe(3);

    expect(result.providerStats.github?.commits).toBe(300);
    expect(result.providerStats.gitlab?.commits).toBe(120);
    expect(result.providerStats.bitbucket?.commits).toBe(45);
  });
});
