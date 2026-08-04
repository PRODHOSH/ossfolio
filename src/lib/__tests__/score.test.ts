import { describe, it, expect } from "vitest";
import {
  calculateScore,
  getScoreBreakdown,
  getRepoStarMultiplier,
  getLabelMultiplier,
  getDiscussionMultiplier,
  calculateContributionImpact,
  SCORE_WEIGHTS,
  STAR_CAP,
} from "../score";
import type { ContributorStats, Repo, ContributionImpactContext } from "@/types";

describe("score", () => {
  const mockStats = {
    totalCommits: 10,
    totalPRs: 5,
    totalIssues: 2,
    totalReviews: 3,
  };

  describe("getScoreBreakdown", () => {
    it("should calculate correct breakdown without impact context", () => {
      const breakdown = getScoreBreakdown(mockStats, 500);

      expect(breakdown.commitsContribution).toBe(10 * SCORE_WEIGHTS.COMMIT);
      expect(breakdown.prsContribution).toBe(5 * SCORE_WEIGHTS.PR);
      expect(breakdown.issuesContribution).toBe(2 * SCORE_WEIGHTS.ISSUE);
      expect(breakdown.reviewsContribution).toBe(3 * SCORE_WEIGHTS.REVIEW);
      expect(breakdown.starsContribution).toBe(500 * SCORE_WEIGHTS.STAR);
      expect(breakdown.impactMultiplier).toBe(1.0);

      const expectedTotal =
        10 * SCORE_WEIGHTS.COMMIT +
        5 * SCORE_WEIGHTS.PR +
        2 * SCORE_WEIGHTS.ISSUE +
        3 * SCORE_WEIGHTS.REVIEW +
        500 * SCORE_WEIGHTS.STAR;

      expect(breakdown.total).toBe(Math.round(expectedTotal));
    });

    it("should cap stars correctly", () => {
      const breakdown = getScoreBreakdown(mockStats, 1500);
      expect(breakdown.starsContribution).toBe(STAR_CAP * SCORE_WEIGHTS.STAR);
    });
  });

  describe("qualitative impact multipliers", () => {
    it("should return correct repo star multipliers", () => {
      expect(getRepoStarMultiplier(5)).toBe(1.0);
      expect(getRepoStarMultiplier(50)).toBe(1.2);
      expect(getRepoStarMultiplier(500)).toBe(1.5);
      expect(getRepoStarMultiplier(5000)).toBe(2.0);
      expect(getRepoStarMultiplier(20000)).toBe(2.5);
    });

    it("should return correct label multipliers", () => {
      expect(getLabelMultiplier([])).toBe(1.0);
      expect(getLabelMultiplier(["critical", "security"])).toBe(2.0);
      expect(getLabelMultiplier(["bug", "high-priority"])).toBe(1.5);
      expect(getLabelMultiplier(["enhancement", "feature"])).toBe(1.2);
      expect(getLabelMultiplier(["documentation", "typo"])).toBe(0.8);
      // High multiplier overrides lower multiplier when multiple labels are present
      expect(getLabelMultiplier(["typo", "critical"])).toBe(2.0);
    });

    it("should return correct discussion multipliers", () => {
      expect(getDiscussionMultiplier(0)).toBe(1.0);
      expect(getDiscussionMultiplier(3)).toBe(1.1);
      expect(getDiscussionMultiplier(10)).toBe(1.25);
      expect(getDiscussionMultiplier(20)).toBe(1.4);
    });
  });

  describe("calculateContributionImpact", () => {
    it("should calculate higher multiplier for high-star repo PRs with critical bug fixes", () => {
      const impactContext: ContributionImpactContext = {
        prs: [
          {
            title: "Fix memory leak in core engine",
            repoName: "facebook/react",
            repoStars: 20000, // 2.5x
            labels: ["critical", "bug"], // 2.0x
            commentsCount: 15, // 1.4x
          },
        ],
        issues: [
          {
            title: "Security vulnerability in parser",
            repoName: "vercel/next.js",
            repoStars: 15000, // 2.5x
            labels: ["security"], // 2.0x
            commentsCount: 8, // 1.25x
          },
        ],
      };

      const impact = calculateContributionImpact(impactContext);
      expect(impact.impactMultiplier).toBeGreaterThan(1.5);
      expect(impact.highImpactPRsCount).toBe(1);
      expect(impact.criticalIssuesCount).toBe(1);
      expect(impact.averageRepoStars).toBe(17500);
    });
  });

  describe("calculateScore with impact", () => {
    it("should yield higher score for high impact contributions compared to baseline", () => {
      const repos = [{ stars: 500 } as Repo];
      const baselineScore = calculateScore(mockStats as ContributorStats, repos);

      const highImpactContext: ContributionImpactContext = {
        prs: [
          {
            repoStars: 5000,
            labels: ["critical", "bug"],
            commentsCount: 10,
          },
        ],
        issues: [
          {
            repoStars: 2000,
            labels: ["enhancement"],
            commentsCount: 5,
          },
        ],
      };

      const highImpactScore = calculateScore(
        mockStats as ContributorStats,
        repos,
        highImpactContext,
      );

      expect(highImpactScore).toBeGreaterThan(baselineScore);
    });
  });
});
