import type { ContributorStats, Repo } from '@/types';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0';
const TIMEOUT_MS = 6000;

export async function fetchBitbucketStats(
  username: string,
  token?: string,
): Promise<{ stats: ContributorStats; repos: Repo[] }> {
  if (!username) {
    return {
      stats: {
        totalCommits: 0,
        totalPRs: 0,
        totalIssues: 0,
        totalReviews: 0,
        totalContributions: 0,
      },
      repos: [],
    };
  }

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Fetch user public repositories from Bitbucket API
    const reposRes = await fetchWithTimeout(
      `${BITBUCKET_API_BASE}/repositories/${encodeURIComponent(username)}?pagelen=10`,
      { headers, cache: 'no-store' },
      TIMEOUT_MS,
    );

    if (!reposRes.ok) {
      throw new Error(`Bitbucket repos API returned status ${reposRes.status}`);
    }

    const reposData = await reposRes.json();
    const rawValues = Array.isArray(reposData?.values) ? reposData.values : [];

    const repos: Repo[] = rawValues.map((r: any) => ({
      name: r.full_name || r.name,
      description: r.description || null,
      stars: 0,
      forks: 0,
      language: r.language || 'Bitbucket',
      languageColor: '#205081',
      url: r.links?.html?.href || `https://bitbucket.org/${username}`,
      topics: [],
    }));

    // Aggregate estimated stats
    const totalRepos = repos.length;
    const totalCommits = totalRepos * 14;
    const totalPRs = Math.round(totalRepos * 2.5);
    const totalIssues = Math.round(totalRepos * 1.2);
    const totalReviews = Math.round(totalPRs * 0.3);
    const totalContributions =
      totalCommits + totalPRs * 3 + totalIssues * 2 + totalReviews * 2;

    return {
      stats: {
        totalCommits,
        totalPRs,
        totalIssues,
        totalReviews,
        totalContributions,
      },
      repos,
    };
  } catch (err) {
    console.warn(`[Bitbucket] Could not fetch stats for @${username}:`, err);
    return {
      stats: {
        totalCommits: 0,
        totalPRs: 0,
        totalIssues: 0,
        totalReviews: 0,
        totalContributions: 0,
      },
      repos: [],
    };
  }
}
