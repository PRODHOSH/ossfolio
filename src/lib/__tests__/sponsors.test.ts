import { describe, it, expect } from 'vitest';
import { sanitizeFundingLinks, sanitizeSponsors } from '../sponsors';
import { evaluateAchievements } from '../achievements';

describe('sponsors module', () => {
  describe('sanitizeFundingLinks', () => {
    it('should validate and clean funding link inputs', () => {
      const raw = [
        {
          platform: 'GitHub Sponsors',
          url: 'https://github.com/sponsors/testuser',
        },
        { platform: 'Patreon', url: 'https://patreon.com/testuser' },
        { platform: 'InvalidPlatform', url: 'https://custom.com/donate' },
        { platform: 'Open Collective', url: 'not-a-valid-url' },
      ];

      const cleaned = sanitizeFundingLinks(raw);
      expect(cleaned).toHaveLength(3);
      expect(cleaned[0]).toEqual({
        platform: 'GitHub Sponsors',
        url: 'https://github.com/sponsors/testuser',
      });
      expect(cleaned[1]).toEqual({
        platform: 'Patreon',
        url: 'https://patreon.com/testuser',
      });
      expect(cleaned[2]).toEqual({
        platform: 'Custom',
        url: 'https://custom.com/donate',
      });
    });

    it('should return empty array for non-array inputs', () => {
      expect(sanitizeFundingLinks(null)).toEqual([]);
      expect(sanitizeFundingLinks('invalid')).toEqual([]);
    });
  });

  describe('sanitizeSponsors', () => {
    it('should sanitize sponsor items and filter out unnamed entries', () => {
      const raw = [
        { name: 'Acme Corp', tier: 'Gold Sponsor', url: 'https://acme.com' },
        { name: 'Jane Doe', logoUrl: 'https://example.com/logo.png' },
        { name: '', tier: 'Anonymous' },
      ];

      const cleaned = sanitizeSponsors(raw);
      expect(cleaned).toHaveLength(2);
      expect(cleaned[0].name).toBe('Acme Corp');
      expect(cleaned[0].tier).toBe('Gold Sponsor');
      expect(cleaned[1].name).toBe('Jane Doe');
      expect(cleaned[1].tier).toBe('Sponsor');
    });
  });

  describe('Sponsored Creator Achievement', () => {
    it('should unlock Sponsored Creator achievement when hasFunding is true', () => {
      const achievements = evaluateAchievements({
        stats: {
          totalCommits: 10,
          totalPRs: 5,
          totalIssues: 2,
          totalReviews: 1,
          totalContributions: 18,
        },
        longestStreak: 5,
        hasFunding: true,
      });

      const sponsoredAchievement = achievements.find(
        (a) => a.id === 'sponsored_creator',
      );
      expect(sponsoredAchievement).toBeDefined();
      expect(sponsoredAchievement?.unlocked).toBe(true);
      expect(sponsoredAchievement?.progress).toBe(1);
    });

    it('should lock Sponsored Creator achievement when hasFunding is false', () => {
      const achievements = evaluateAchievements({
        stats: {
          totalCommits: 10,
          totalPRs: 5,
          totalIssues: 2,
          totalReviews: 1,
          totalContributions: 18,
        },
        longestStreak: 5,
        hasFunding: false,
      });

      const sponsoredAchievement = achievements.find(
        (a) => a.id === 'sponsored_creator',
      );
      expect(sponsoredAchievement).toBeDefined();
      expect(sponsoredAchievement?.unlocked).toBe(false);
    });
  });
});
