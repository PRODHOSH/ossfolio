import { describe, it, expect } from 'vitest';
import {
  getPeriodDateRange,
  generateDigestRssXml,
  type ContributionDigestData,
} from '../digest';

describe('digest module', () => {
  describe('getPeriodDateRange', () => {
    it('should calculate correct start and end date for weekly period', () => {
      const refDate = new Date('2026-07-25T12:00:00Z');
      const { startDate, endDate } = getPeriodDateRange('weekly', refDate);

      expect(endDate.toISOString()).toBe('2026-07-25T12:00:00.000Z');
      expect(startDate.toISOString()).toBe('2026-07-18T12:00:00.000Z');
    });

    it('should calculate correct start and end date for monthly period', () => {
      const refDate = new Date('2026-07-25T12:00:00Z');
      const { startDate, endDate } = getPeriodDateRange('monthly', refDate);

      expect(endDate.toISOString()).toBe('2026-07-25T12:00:00.000Z');
      expect(startDate.toISOString()).toBe('2026-06-25T12:00:00.000Z');
    });
  });

  describe('generateDigestRssXml', () => {
    it('should produce a valid RSS 2.0 XML string containing user activities', () => {
      const sampleDigest: ContributionDigestData = {
        username: 'testuser',
        avatarUrl: 'https://github.com/testuser.png',
        name: 'Test User',
        score: 85,
        period: 'weekly',
        startDate: '2026-07-18T00:00:00Z',
        endDate: '2026-07-25T00:00:00Z',
        stats: {
          prsMerged: 5,
          issuesResolved: 3,
          reposStarred: 10,
          achievementsEarned: 2,
          totalContributionsPeriod: 44,
          topLanguages: ['TypeScript', 'Rust'],
        },
        activities: [
          {
            id: 'pr-1',
            type: 'pr_merged',
            title: 'Merged PR: Fix critical authentication bug',
            repoName: 'testuser/core',
            url: 'https://github.com/testuser/core/pull/1',
            timestamp: '2026-07-20T10:00:00Z',
            badge: 'Pull Request',
          },
        ],
        topContributions: [
          {
            title: 'Fix critical authentication bug',
            repoName: 'testuser/core',
            url: 'https://github.com/testuser/core/pull/1',
          },
        ],
        achievements: [
          {
            name: 'PR Machine',
            description: 'Merged 5 PRs this week',
            icon: 'award',
          },
        ],
        generatedAt: '2026-07-25T12:00:00Z',
      };

      const xml = generateDigestRssXml('testuser', sampleDigest);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8" ?>');
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain('Contribution Digest - Test User (WEEKLY)');
      expect(xml).toContain('Merged PR: Fix critical authentication bug');
      expect(xml).toContain('https://github.com/testuser/core/pull/1');
      expect(xml).toContain('</rss>');
    });
  });
});
