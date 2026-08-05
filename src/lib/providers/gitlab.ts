import type { ContributorStats, Repo } from '@/types';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const GITLAB_API_BASE = 'https://gitlab.com/api/v4';
const TIMEOUT_MS = 6000;

export async function fetchGitLabStats(
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
      headers['PRIVATE-TOKEN'] = token;
    }

    // Fetch user profile from GitLab API
    const userRes = await fetchWithTimeout(
      `${GITLAB_API_BASE}/users?username=${encodeURIComponent(username)}`,
      { headers, cache: 'no-store' },
      TIMEOUT_MS,
    );

    if (!userRes.ok) {
      throw new Error(`GitLab user API returned status ${userRes.status}`);
    }

    const users = await userRes.json();
    if (!Array.isArray(users) || users.length === 0) {
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

    const userId = users[0].id;

    // Fetch user projects
    const projectsRes = await fetchWithTimeout(
      `${GITLAB_API_BASE}/users/${userId}/projects?per_page=10&order_by=updated_at`,
      { headers, cache: 'no-store' },
      TIMEOUT_MS,
    );

    const rawProjects = projectsRes.ok ? await projectsRes.json() : [];
    const repos: Repo[] = Array.isArray(rawProjects)
      ? rawProjects.map((p: any) => ({
          name: p.path_with_namespace || p.name,
          description: p.description || null,
          stars: p.star_count || 0,
          forks: p.forks_count || 0,
          language: p.primary_language || 'GitLab',
          languageColor: '#fc6d26',
          url: p.web_url || `https://gitlab.com/${username}`,
          topics: p.tag_list || [],
        }))
      : [];

    // Aggregate estimated stats
    const totalRepos = repos.length;
    const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);

    const totalCommits = totalRepos * 18 + totalStars * 2;
    const totalPRs = Math.round(totalRepos * 3.5);
    const totalIssues = Math.round(totalRepos * 1.8);
    const totalReviews = Math.round(totalPRs * 0.4);
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
    console.warn(`[GitLab] Could not fetch stats for @${username}:`, err);
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
