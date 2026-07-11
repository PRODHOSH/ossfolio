import type { ContributorStats, Org, Repo, TechEntry, MergedPR } from "@/types";
import { LANG_COLORS } from "@/lib/languages";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { githubGraphQL } from "./github";


/**
 * Live profile "extras" derived from the public (unauthenticated) GitHub REST
 * API, keyed by username. The base profile page already fetches the user object
 * and repo list; this module turns those plus a few extra REST calls into the
 * shapes the profile section components expect.
 *
 * What is genuinely live here:
 *   - stats.totalPRs / totalIssues / totalCommits  -> GitHub Search API
 *   - organizations                                -> /users/{login}/orgs
 *   - techStack                                    -> aggregated from repo languages
 *
 * What is NOT available from unauthenticated REST (and is handled elsewhere as a
 * fallback): the contribution heatmap and review counts. Reviews require the
 * authenticated GraphQL contributionsCollection, so totalReviews is reported as
 * 0 rather than guessed.
 */



/** Return the hex colour for a programming language name, or null if the language is not in the built-in map. */
export function languageColor(language: string | null): string | null {
  if (!language) return null;
  return LANG_COLORS[language] ?? "#9a9a9a";
}

interface GitHubRepoLike {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
}

/** Map raw REST repos into the `Repo` type the TopRepos component consumes. */
export function mapRepos(repos: GitHubRepoLike[]): Repo[] {
  return repos.map((r) => ({
    name: r.name,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language,
    languageColor: languageColor(r.language),
    url: r.html_url,
    topics: r.topics ?? [],
  }));
}

/** Aggregate repo primary languages into a sorted TechEntry[] (most repos first). */
export function deriveTechStack(repos: GitHubRepoLike[]): TechEntry[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([language, repoCount]) => ({ language, repoCount }))
    .sort((a, b) => b.repoCount - a.repoCount);
}

/** A single Search API count call. Returns 0 on any failure (rate limit, etc.). */
async function searchCount(query: string, accept?: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(
      `https://api.github.com/search/${query}&per_page=1`,
      {
        headers: {
          Accept: accept ?? "application/vnd.github.v3+json",
        },
        next: { revalidate: 3600 },
      },
      10_000
    );

    if (!res.ok) return 0;
    const json = await res.json();
    return typeof json.total_count === "number" ? json.total_count : 0;
  } catch {
    return 0;
  }
}

/**
 * Live contribution stats for a username via the Search API.
 *
 * totalReviews is intentionally 0: review counts are only available through the
 * authenticated GraphQL contributionsCollection, not unauthenticated REST.
 * totalContributions is left for the caller to fill from the (mock) heatmap.
 */
export async function fetchLiveStats(username: string): Promise<ContributorStats> {
  const u = encodeURIComponent(username);
  const [totalPRs, totalIssues, totalCommits] = await Promise.all([
    searchCount(`issues?q=author:${u}+type:pr`),
    searchCount(`issues?q=author:${u}+type:issue`),
    searchCount(
      `commits?q=author:${u}`,
      "application/vnd.github.cloak-preview+json"
    ),
  ]);
  return {
    totalCommits,
    totalPRs,
    totalIssues,
    totalReviews: 0,
    totalContributions: 0,
  };
}

interface GitHubOrgLike {
  login: string;
  avatar_url: string;
  description: string | null;
}

/** Fetch the user's public organizations and map to the `Org` type. */
export async function fetchOrganizations(username: string): Promise<Org[]> {
  try {
    const res = await fetchWithTimeout(
      `https://api.github.com/users/${encodeURIComponent(username)}/orgs`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 3600 },
      },
      10_000
    );

    if (!res.ok) return [];
    const orgs = (await res.json()) as GitHubOrgLike[];
    if (!Array.isArray(orgs)) return [];
    return orgs.map((o) => ({
      login: o.login,
      name: o.description,
      avatarUrl: o.avatar_url,
      url: `https://github.com/${o.login}`,
    }));
  } catch {
    return [];
  }
}

/** Fetch recent pull requests for a user in all states (merged, open, closed) */
export async function fetchMergedPRs(username: string, limit: number = 10): Promise<MergedPR[]> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (token) {
    const query = `
      query PRSearch($query: String!, $limit: Int!) {
        search(type: ISSUE, first: $limit, query: $query) {
          nodes {
            ... on PullRequest {
              title
              url
              state
              createdAt
              closedAt
              mergedAt
              repository {
                name
              }
            }
          }
        }
      }
    `;

    try {
      const data = await githubGraphQL<{
        search: {
          nodes: Array<{
            title: string;
            url: string;
            state: "OPEN" | "CLOSED" | "MERGED";
            createdAt: string;
            closedAt: string | null;
            mergedAt: string | null;
            repository: {
              name: string;
            };
          }>;
        };
      }>(
        query,
        {
          query: `author:${username} is:pr sort:updated-desc`,
          limit: limit * 3, // Fetch enough to cover open, closed, and merged
        },
        token
      );

      if (data?.search?.nodes) {
        return data.search.nodes.map((node) => {
          let state: "open" | "closed" | "merged" = "open";
          if (node.state === "MERGED") state = "merged";
          else if (node.state === "CLOSED") state = "closed";

          let date = node.createdAt;
          if (state === "merged") date = node.mergedAt || node.closedAt || node.createdAt;
          else if (state === "closed") date = node.closedAt || node.createdAt;

          return {
            title: node.title,
            url: node.url,
            repoName: node.repository.name,
            mergedAt: date,
            state,
          };
        });
      }
    } catch (err) {
      console.error("GraphQL PR search failed, falling back to REST:", err);
    }
  }

  // Fallback to REST Search API
  const u = encodeURIComponent(username);

  const fetchForQuery = async (q: string, state: "open" | "closed" | "merged"): Promise<MergedPR[]> => {
    const query = `search/issues?q=${q}&sort=updated&order=desc&per_page=${limit}`;
    try {
      const res = await fetchWithTimeout(
        `https://api.github.com/${query}`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
          next: { revalidate: 3600 },
        },
        10_000
      );
      if (!res.ok) return [];
      const json = await res.json();
      if (!Array.isArray(json.items)) return [];
      return json.items.map((item: any) => {
        let date = item.created_at;
        if (state === "merged" || state === "closed") {
          date = item.closed_at || item.created_at;
        }
        return {
          title: item.title,
          url: item.html_url,
          repoName: item.repository_url.split("/").slice(-1)[0],
          mergedAt: date,
          state,
        };
      });
    } catch {
      return [];
    }
  };

  try {
    const [merged, open, closed] = await Promise.all([
      fetchForQuery(`author:${u}+type:pr+is:merged`, "merged"),
      fetchForQuery(`author:${u}+type:pr+is:open`, "open"),
      fetchForQuery(`author:${u}+type:pr+is:closed+is:unmerged`, "closed"),
    ]);
    return [...merged, ...open, ...closed];
  } catch {
    return [];
  }
}

