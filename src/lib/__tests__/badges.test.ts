import { describe, it, expect } from 'vitest';
import { AUTOMATED_BADGE_CRITERIA, awardBadges } from '../badges.config';
import type { BadgeItem } from '@/types';

describe('badges.config criteria evaluation', () => {
  const getCriterion = (id: string) =>
    AUTOMATED_BADGE_CRITERIA.find((c) => c.id === id)!;

  it("evaluates 'first_100_commits' correctly", () => {
    const criterion = getCriterion('first_100_commits');
    expect(
      criterion.evaluate({
        stats: {
          totalCommits: 50,
          totalPRs: 0,
          totalIssues: 0,
          totalReviews: 0,
        },
      }),
    ).toBe(false);
    expect(
      criterion.evaluate({
        stats: {
          totalCommits: 100,
          totalPRs: 0,
          totalIssues: 0,
          totalReviews: 0,
        },
      }),
    ).toBe(true);
  });

  it("evaluates 'century_prs' correctly", () => {
    const criterion = getCriterion('century_prs');
    expect(
      criterion.evaluate({
        stats: {
          totalCommits: 0,
          totalPRs: 99,
          totalIssues: 0,
          totalReviews: 0,
        },
      }),
    ).toBe(false);
    expect(
      criterion.evaluate({
        stats: {
          totalCommits: 0,
          totalPRs: 100,
          totalIssues: 0,
          totalReviews: 0,
        },
      }),
    ).toBe(true);
  });

  it("evaluates 'polyglot' correctly", () => {
    const criterion = getCriterion('polyglot');
    const inputs4Langs = {
      repos: [
        { language: 'TypeScript' },
        { language: 'JavaScript' },
        { language: 'Python' },
        { language: 'Go' },
      ],
    };
    const inputs5Langs = {
      repos: [
        { language: 'TypeScript' },
        { language: 'JavaScript' },
        { language: 'Python' },
        { language: 'Go' },
        { language: 'Rust' },
      ],
    };

    expect(criterion.evaluate(inputs4Langs)).toBe(false);
    expect(criterion.evaluate(inputs5Langs)).toBe(true);
  });

  it("evaluates 'bug_squasher' correctly", () => {
    const criterion = getCriterion('bug_squasher');
    expect(
      criterion.evaluate({
        stats: {
          totalIssues: 5,
          totalCommits: 0,
          totalPRs: 0,
          totalReviews: 0,
        },
      }),
    ).toBe(false);
    expect(
      criterion.evaluate({
        stats: {
          totalIssues: 10,
          totalCommits: 0,
          totalPRs: 0,
          totalReviews: 0,
        },
      }),
    ).toBe(true);
  });

  it("evaluates 'night_owl' correctly", () => {
    const criterion = getCriterion('night_owl');
    const dayPR = { prs: [{ mergedAt: '2026-05-15T14:30:00Z' }] };
    const nightPR = { prs: [{ mergedAt: '2026-05-15T02:15:00Z' }] };

    expect(criterion.evaluate(dayPR)).toBe(false);
    expect(criterion.evaluate(nightPR)).toBe(true);
  });

  it("evaluates 'star_magnet' correctly", () => {
    const criterion = getCriterion('star_magnet');
    expect(criterion.evaluate({ repos: [{ stars: 40 }, { stars: 50 }] })).toBe(
      false,
    );
    expect(criterion.evaluate({ repos: [{ stars: 50 }, { stars: 60 }] })).toBe(
      true,
    );
  });

  it("evaluates 'review_master' correctly", () => {
    const criterion = getCriterion('review_master');
    expect(
      criterion.evaluate({
        stats: {
          totalReviews: 40,
          totalCommits: 0,
          totalPRs: 0,
          totalIssues: 0,
        },
      }),
    ).toBe(false);
    expect(
      criterion.evaluate({
        stats: {
          totalReviews: 50,
          totalCommits: 0,
          totalPRs: 0,
          totalIssues: 0,
        },
      }),
    ).toBe(true);
  });
});

describe('awardBadges function', () => {
  it('awards new automated badges while preserving existing user program badges', () => {
    const existingBadges: BadgeItem[] = [{ program: 'GSSoC', years: [2025] }];

    const inputData = {
      stats: {
        totalCommits: 150,
        totalPRs: 120,
        totalIssues: 15,
        totalReviews: 60,
      },
      repos: [
        { language: 'TypeScript', stars: 60 },
        { language: 'Go', stars: 50 },
        { language: 'Rust', stars: 10 },
        { language: 'Python', stars: 5 },
        { language: 'C++', stars: 5 },
      ],
    };

    const awarded = awardBadges(existingBadges, inputData);

    const programNames = awarded.map((b) => b.program);
    expect(programNames).toContain('GSSoC');
    expect(programNames).toContain('First 100 Commits');
    expect(programNames).toContain('Century PRs');
    expect(programNames).toContain('Polyglot');
    expect(programNames).toContain('Star Magnet');
    expect(programNames).toContain('Review Master');
  });

  it('supports (userId, stats) signature', async () => {
    const userId = 'test-user-id';
    const stats = {
      totalCommits: 120,
      totalPRs: 5,
      totalIssues: 2,
      totalReviews: 0,
    };

    const awarded = await awardBadges(userId, stats);
    const programNames = awarded.map((b) => b.program);
    expect(programNames).toContain('First 100 Commits');
  });
});
