import { describe, it, expect } from 'vitest';
import { generateBadgeSvg, exportProfileData } from '../profile-export';
import type { ContributorStats } from '@/types';

const mockStats: ContributorStats = {
  totalCommits: 100,
  totalPRs: 20,
  totalIssues: 10,
  totalReviews: 5,
  totalContributions: 135,
};

describe('profile-export module', () => {
  describe('generateBadgeSvg', () => {
    it('should generate a score badge SVG string by default', async () => {
      const svg = await generateBadgeSvg(
        'testuser',
        { type: 'score', theme: 'dark' },
        mockStats,
      );

      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('OSSfolio Score');
      expect(svg).toContain('#0d1117');
      expect(svg).toContain('</svg>');
    });

    it('should generate stats banner badge SVG for type=stats and theme=neon', async () => {
      const svg = await generateBadgeSvg(
        'testuser',
        { type: 'stats', theme: 'neon' },
        mockStats,
      );

      expect(svg).toContain('@testuser');
      expect(svg).toContain('OSSfolio Contributor Profile');
      expect(svg).toContain('#090d16');
      expect(svg).toContain('#3ecf8e');
    });

    it('should generate heatmap SVG for type=heatmap and theme=light', async () => {
      const svg = await generateBadgeSvg(
        'testuser',
        { type: 'heatmap', theme: 'light' },
        mockStats,
      );

      expect(svg).toContain('@testuser');
      expect(svg).toContain('Activity');
      expect(svg).toContain('#ffffff');
    });
  });

  describe('exportProfileData', () => {
    it('should return valid JSON string payload when format is json', async () => {
      const { content, mimeType, filename } = await exportProfileData(
        'testuser',
        'json',
        mockStats,
      );

      expect(mimeType).toContain('application/json');
      expect(filename).toBe('testuser-ossfolio-contributions.json');

      const parsed = JSON.parse(content);
      expect(parsed.username).toBe('testuser');
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('score');
    });

    it('should return formatted CSV content when format is csv', async () => {
      const { content, mimeType, filename } = await exportProfileData(
        'testuser',
        'csv',
        mockStats,
      );

      expect(mimeType).toContain('text/csv');
      expect(filename).toBe('testuser-ossfolio-contributions.csv');
      expect(content).toContain('Metric,Value');
      expect(content).toContain('Username,testuser');
      expect(content).toContain('Contributor Score,');
      expect(content).toContain('PR Title,Repository,Merged At,URL');
    });
  });
});
