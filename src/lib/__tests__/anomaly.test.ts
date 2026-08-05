import { describe, it, expect } from 'vitest';
import {
  detectAnomaly,
  applyAnomalyDiscount,
  scoreWithAnomalyCheck,
  ANOMALY_THRESHOLDS,
  ANOMALY_SCORE_MULTIPLIER,
  type AnomalyResult,
} from '@/lib/anomaly';
import type { ContributorStats, Repo } from '@/types';

// Helper fixture factories
const createStats = (
  overrides: Partial<ContributorStats> = {},
): ContributorStats => ({
  totalCommits: 500,
  totalPRs: 20,
  totalIssues: 10,
  totalReviews: 15,
  totalContributions: 545,
  ...overrides,
});

const createRepo = (stars: number, name = 'test-repo'): Repo =>
  ({
    name,
    description: 'Sample repo',
    stars,
    forks: 5,
    language: 'TypeScript',
    languageColor: '#3178c6',
    url: `https://github.com/user/${name}`,
    topics: ['typescript'],
  }) as Repo;

describe('ANOMALY_THRESHOLDS and Constants', () => {
  it('defines expected threshold constants', () => {
    expect(ANOMALY_THRESHOLDS.MIN_COMMITS).toBe(1000);
    expect(ANOMALY_THRESHOLDS.MAX_COMMIT_RATIO).toBe(50);
    expect(ANOMALY_THRESHOLDS.CREDIBLE_STARS).toBe(50);
    expect(ANOMALY_SCORE_MULTIPLIER).toBe(0.25);
  });
});

describe('detectAnomaly', () => {
  it('does not flag standard balanced open-source contributors', () => {
    const stats = createStats({
      totalCommits: 800,
      totalPRs: 50,
      totalIssues: 20,
      totalReviews: 30,
    });
    const result = detectAnomaly(stats, 15);

    expect(result.flagged).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.commitRatio).toBe(800 / (50 + 20 + 30)); // 8
  });

  it('does not flag accounts with commit volume below MIN_COMMITS threshold (Guard 1)', () => {
    const stats = createStats({
      totalCommits: 999, // < 1000
      totalPRs: 0,
      totalIssues: 0,
      totalReviews: 0,
    });
    const result = detectAnomaly(stats, 0);

    expect(result.flagged).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.commitRatio).toBe(999);
  });

  it('does not flag high-commit accounts with community validation via stars (Guard 2)', () => {
    const stats = createStats({
      totalCommits: 5000,
      totalPRs: 2,
      totalIssues: 0,
      totalReviews: 0,
    });
    // Has 50 stars >= CREDIBLE_STARS
    const result = detectAnomaly(stats, 50);

    expect(result.flagged).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.commitRatio).toBe(2500);
  });

  it('does not flag accounts with commit ratio below MAX_COMMIT_RATIO threshold (Guard 3)', () => {
    const stats = createStats({
      totalCommits: 2000,
      totalPRs: 30,
      totalIssues: 10,
      totalReviews: 10, // collaborative = 50, ratio = 40 < 50
    });
    const result = detectAnomaly(stats, 10);

    expect(result.flagged).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.commitRatio).toBe(40);
  });

  it('flags artificially manipulated accounts with high commits, low collaboration, and low stars', () => {
    const stats = createStats({
      totalCommits: 3000,
      totalPRs: 2,
      totalIssues: 1,
      totalReviews: 0, // collaborative = 3, ratio = 1000
    });
    const result = detectAnomaly(stats, 5); // stars = 5 < 50

    expect(result.flagged).toBe(true);
    expect(result.commitRatio).toBe(1000);
    expect(result.reason).toContain(
      'Unusual commit ratio: 3,000 commits vs 3 PRs/issues/reviews (1000:1) with 5 stars',
    );
  });

  it('flags high-volume empty-commit spam accounts with zero collaborative activity', () => {
    const stats = createStats({
      totalCommits: 1500,
      totalPRs: 0,
      totalIssues: 0,
      totalReviews: 0, // collaborative = 0 -> ratio = commits = 1500
    });
    const result = detectAnomaly(stats, 0);

    expect(result.flagged).toBe(true);
    expect(result.commitRatio).toBe(1500);
    expect(result.reason).toContain(
      '1,500 commits vs 0 PRs/issues/reviews (1500:1) with 0 stars',
    );
  });

  it('handles prolific review & PR specialists accurately without false positives', () => {
    const stats = createStats({
      totalCommits: 1200,
      totalPRs: 400,
      totalIssues: 100,
      totalReviews: 500, // collaborative = 1000 -> ratio = 1.2
    });
    const result = detectAnomaly(stats, 25);

    expect(result.flagged).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.commitRatio).toBe(1.2);
  });

  describe('boundary threshold cases', () => {
    it('flags at exact boundary MIN_COMMITS when ratio is high and stars are low', () => {
      const stats = createStats({
        totalCommits: 1000, // exact MIN_COMMITS
        totalPRs: 1,
        totalIssues: 0,
        totalReviews: 0, // collaborative = 1 -> ratio = 1000
      });
      const result = detectAnomaly(stats, 49); // < 50 stars

      expect(result.flagged).toBe(true);
    });

    it('clears flag at exact CREDIBLE_STARS boundary', () => {
      const stats = createStats({
        totalCommits: 2000,
        totalPRs: 1,
        totalIssues: 0,
        totalReviews: 0,
      });
      const resultAt49 = detectAnomaly(stats, 49);
      const resultAt50 = detectAnomaly(stats, 50);

      expect(resultAt49.flagged).toBe(true);
      expect(resultAt50.flagged).toBe(false);
    });

    it('clears flag when ratio is just below MAX_COMMIT_RATIO boundary', () => {
      const stats = createStats({
        totalCommits: 2450,
        totalPRs: 50,
        totalIssues: 0,
        totalReviews: 0, // ratio = 49 < 50
      });
      const result = detectAnomaly(stats, 10);

      expect(result.flagged).toBe(false);
      expect(result.commitRatio).toBe(49);
    });
  });
});

describe('applyAnomalyDiscount', () => {
  it('returns raw score untouched if not flagged', () => {
    const unflagged: AnomalyResult = {
      flagged: false,
      reason: null,
      commitRatio: 10,
    };
    expect(applyAnomalyDiscount(500, unflagged)).toBe(500);
    expect(applyAnomalyDiscount(0, unflagged)).toBe(0);
  });

  it('applies 0.25 multiplier discount (rounded) when flagged', () => {
    const flagged: AnomalyResult = {
      flagged: true,
      reason: 'High ratio',
      commitRatio: 200,
    };
    expect(applyAnomalyDiscount(1000, flagged)).toBe(250);
    expect(applyAnomalyDiscount(73, flagged)).toBe(Math.round(73 * 0.25)); // 18
    expect(applyAnomalyDiscount(0, flagged)).toBe(0);
  });
});

describe('scoreWithAnomalyCheck', () => {
  it('returns full raw score for legitimate contributors', () => {
    const stats = createStats({
      totalCommits: 200,
      totalPRs: 10,
      totalIssues: 5,
      totalReviews: 5,
    });
    const repos = [createRepo(20), createRepo(15)];

    const { score, rawScore, anomaly } = scoreWithAnomalyCheck(stats, repos);

    expect(anomaly.flagged).toBe(false);
    expect(score).toBe(rawScore);
    expect(score).toBeGreaterThan(0);
  });

  it('discounts score for accounts flagged for commit-spam anomaly', () => {
    const stats = createStats({
      totalCommits: 4000,
      totalPRs: 1,
      totalIssues: 0,
      totalReviews: 0,
    });
    const repos = [createRepo(5)]; // 5 total stars < 50

    const { score, rawScore, anomaly } = scoreWithAnomalyCheck(stats, repos);

    expect(anomaly.flagged).toBe(true);
    expect(anomaly.reason).not.toBeNull();
    expect(score).toBe(Math.round(rawScore * ANOMALY_SCORE_MULTIPLIER));
    expect(score).toBeLessThan(rawScore);
  });
});
