import { describe, it, expect } from 'vitest';
import {
  buildRadarData,
  normalizePair,
  sumRepoStars,
  isRadarEmpty,
  type RadarMetricInput,
} from '../radar-metrics';
import type { ContributorStats, Repo } from '@/types';

const stats = (over: Partial<ContributorStats> = {}): ContributorStats => ({
  totalCommits: 0,
  totalPRs: 0,
  totalIssues: 0,
  totalReviews: 0,
  totalContributions: 0,
  ...over,
});

const repo = (stars: number, name = 'r'): Repo =>
  ({
    name,
    description: null,
    stars,
    forks: 0,
    language: null,
    languageColor: null,
    url: '',
    topics: [],
  }) as Repo;

const user = (
  username: string,
  over: Partial<ContributorStats> = {},
  repos: Repo[] = [],
): RadarMetricInput => ({ username, stats: stats(over), repos });

describe('sumRepoStars', () => {
  it('sums stars across repositories', () => {
    expect(sumRepoStars([repo(10), repo(5), repo(1)])).toBe(16);
  });

  it('returns zero for an empty list', () => {
    expect(sumRepoStars([])).toBe(0);
  });

  it('tolerates a missing or malformed list', () => {
    expect(sumRepoStars(null)).toBe(0);
    expect(sumRepoStars(undefined)).toBe(0);
    expect(sumRepoStars({} as unknown as Repo[])).toBe(0);
  });

  it('ignores non-numeric and negative star counts', () => {
    const dirty = [
      repo(5),
      { ...repo(0), stars: undefined } as unknown as Repo,
      { ...repo(0), stars: -3 } as unknown as Repo,
      { ...repo(0), stars: Number.NaN } as unknown as Repo,
    ];
    expect(sumRepoStars(dirty)).toBe(5);
  });
});

describe('normalizePair', () => {
  it('gives the larger value the full scale', () => {
    expect(normalizePair(200, 100)).toEqual({ a: 100, b: 50 });
  });

  it('is symmetric', () => {
    expect(normalizePair(100, 200)).toEqual({ a: 50, b: 100 });
  });

  it('gives both full scale when equal', () => {
    expect(normalizePair(42, 42)).toEqual({ a: 100, b: 100 });
  });

  it('returns zero for both when neither has any, rather than NaN', () => {
    // Dividing by a zero maximum would produce NaN; treating "neither has any
    // reviews" as a full score on both sides would be misleading.
    expect(normalizePair(0, 0)).toEqual({ a: 0, b: 0 });
  });

  it('handles one side being zero', () => {
    expect(normalizePair(50, 0)).toEqual({ a: 100, b: 0 });
    expect(normalizePair(0, 50)).toEqual({ a: 0, b: 100 });
  });

  it('coerces negative and non-finite input to zero', () => {
    expect(normalizePair(-10, 10)).toEqual({ a: 0, b: 100 });
    expect(normalizePair(Number.NaN, 10)).toEqual({ a: 0, b: 100 });
    expect(normalizePair(Number.POSITIVE_INFINITY, 10)).toEqual({
      a: 0,
      b: 100,
    });
  });

  it('never exceeds 100', () => {
    for (const [a, b] of [
      [1, 999999],
      [999999, 1],
      [7, 7],
    ]) {
      const result = normalizePair(a, b);
      expect(result.a).toBeLessThanOrEqual(100);
      expect(result.b).toBeLessThanOrEqual(100);
      expect(result.a).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('buildRadarData', () => {
  const a = user(
    'alice',
    {
      totalCommits: 1000,
      totalPRs: 50,
      totalReviews: 200,
      totalIssues: 10,
    },
    [repo(500)],
  );

  const b = user(
    'bob',
    {
      totalCommits: 500,
      totalPRs: 100,
      totalReviews: 20,
      totalIssues: 40,
    },
    [repo(100), repo(150)],
  );

  it('returns the five axes the issue specifies, in order', () => {
    expect(buildRadarData(a, b).map((d) => d.metric)).toEqual([
      'Commits',
      'Pull Requests',
      'Code Reviews',
      'Issues Opened',
      'Repo Stars',
    ]);
  });

  it('normalises each axis independently', () => {
    const data = buildRadarData(a, b);
    // Alice leads commits 1000 v 500; Bob leads PRs 100 v 50.
    expect(data[0]).toMatchObject({ a: 100, b: 50 });
    expect(data[1]).toMatchObject({ a: 50, b: 100 });
  });

  it('preserves raw values for the tooltip', () => {
    const data = buildRadarData(a, b);
    expect(data[0]).toMatchObject({ aRaw: 1000, bRaw: 500 });
    expect(data[2]).toMatchObject({ aRaw: 200, bRaw: 20 });
  });

  it('derives the stars axis by summing repositories', () => {
    const stars = buildRadarData(a, b)[4];
    expect(stars).toMatchObject({ aRaw: 500, bRaw: 250 });
    expect(stars.a).toBe(100);
    expect(stars.b).toBe(50);
  });

  it('does not let a large axis flatten the others', () => {
    // The whole point of normalising: commits dwarf reviews numerically, but
    // the leader on each axis must still reach the outer edge.
    const spike = user('spike', { totalCommits: 100000, totalReviews: 5 });
    const even = user('even', { totalCommits: 1, totalReviews: 10 });
    const data = buildRadarData(spike, even);
    expect(data[0].a).toBe(100); // commits leader
    expect(data[2].b).toBe(100); // reviews leader, despite tiny raw numbers
  });

  it('keeps all five axes even when both contributors score zero on some', () => {
    const data = buildRadarData(user('x'), user('y'));
    expect(data).toHaveLength(5);
    expect(data.every((d) => d.a === 0 && d.b === 0)).toBe(true);
  });

  it('survives missing stats and repos without throwing', () => {
    const broken = {
      username: 'b',
      stats: undefined,
      repos: undefined,
    } as unknown as RadarMetricInput;
    expect(() => buildRadarData(broken, broken)).not.toThrow();
    expect(buildRadarData(broken, broken)).toHaveLength(5);
  });
});

describe('isRadarEmpty', () => {
  it('is true when every axis is zero for both', () => {
    expect(isRadarEmpty(buildRadarData(user('x'), user('y')))).toBe(true);
  });

  it('is false when any axis has data', () => {
    const data = buildRadarData(user('x', { totalCommits: 1 }), user('y'));
    expect(isRadarEmpty(data)).toBe(false);
  });
});
