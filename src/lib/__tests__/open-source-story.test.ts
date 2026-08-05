import { describe, it, expect } from 'vitest';
import { generateOpenSourceStory, getTopLanguage } from '../open-source-story';
import type { ContributorStats, Repo } from '@/types';

const mockStats: ContributorStats = {
  totalCommits: 342,
  totalPRs: 48,
  totalIssues: 15,
  totalReviews: 24,
};

const mockRepos: Repo[] = [
  { name: 'react', language: 'TypeScript', stars: 100, forks: 20 },
  { name: 'next.js', language: 'TypeScript', stars: 80, forks: 15 },
  { name: 'python-cli', language: 'Python', stars: 10, forks: 2 },
];

describe('open-source-story generator', () => {
  it('determines the top language correctly', () => {
    const topLang = getTopLanguage(mockRepos);
    expect(topLang).toBe('TypeScript');
  });

  it('generates markdown story with user stats and score', () => {
    const story = generateOpenSourceStory(
      'octocat',
      mockStats,
      mockRepos,
      850,
      2026,
    );

    expect(story.username).toBe('octocat');
    expect(story.year).toBe(2026);
    expect(story.score).toBe(850);
    expect(story.totalCommits).toBe(342);
    expect(story.topLanguage).toBe('TypeScript');

    expect(story.markdown).toContain(
      '# 🚀 My 2026 Open Source Story — @octocat',
    );
    expect(story.markdown).toContain('342');
    expect(story.markdown).toContain('48');
    expect(story.markdown).toContain('TypeScript');

    expect(story.tweetText).toContain('342 commits');
    expect(story.tweetText).toContain('48 PRs');
  });
});
