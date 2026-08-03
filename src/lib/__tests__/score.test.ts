import { describe, it, expect } from "vitest";
import { calculateScore, getScoreBreakdown, SCORE_WEIGHTS, STAR_CAP } from "../score";
import type { ContributorStats, Repo } from "@/types";

describe("score", () => {
  const mockStats = {
    totalCommits: 10,
    totalPRs: 5,
    totalIssues: 2,
    totalReviews: 3,
  };

  describe("getScoreBreakdown", () => {
    it("should calculate correct breakdown", () => {
      const breakdown = getScoreBreakdown(mockStats, 500);

      expect(breakdown.commitsContribution).toBe(10 * SCORE_WEIGHTS.COMMIT);
      expect(breakdown.prsContribution).toBe(5 * SCORE_WEIGHTS.PR);
      expect(breakdown.issuesContribution).toBe(2 * SCORE_WEIGHTS.ISSUE);
      expect(breakdown.reviewsContribution).toBe(3 * SCORE_WEIGHTS.REVIEW);
      expect(breakdown.starsContribution).toBe(500 * SCORE_WEIGHTS.STAR);
      
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

  describe("calculateScore", () => {
    it("should calculate the total score correctly from stats and repos", () => {
      const repos = [
        { stars: 200 } as Repo,
        { stars: 300 } as Repo,
      ];
      
      const score = calculateScore(mockStats as ContributorStats, repos);
      const breakdown = getScoreBreakdown(mockStats, 500);
      
      expect(score).toBe(breakdown.total);
    });
  });
});
