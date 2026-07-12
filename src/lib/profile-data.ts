import type { ContributorStats, Org, Repo, TechEntry, MergedPR } from "@/types";
import { LANG_COLORS } from "@/lib/languages";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

/**
 * GitHub answers a rate limit with 403/429 and a "rate limit" message. Raise it as
 * an error so callers that persist results can decline to cache a degraded response.
 */
async function throwIfRateLimited(res: Response): Promise<void> {
  if (res.status !== 403 && res.status !== 429) return;
  try {
    const err = await res.clone().json();
    if (typeof err?.message === "string" && err.message.toLowerCase().includes("rate limit")) {
      throw new Error("RateLimit");
    }
  } catch (e) {
    if (e instanceof Error && e.message === "RateLimit") throw e;
  }
}


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

export interface GitHubRepoLike {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
}

/**
 * A raw GitHub repo as the REST API returns it, carrying every field this app reads.
 * A superset of `GitHubRepoLike` (what mapRepos/deriveTechStack need) and of the shape
 * ProfileView renders, so one snapshot payload satisfies all three consumers without casts.
 */
export interface GitHubRepoPayload extends GitHubRepoLike {
  id: number;
  pushed_at?: string;
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
        cache: "no-store",
      },
      10_000
    );

    if (!res.ok) {
      await throwIfRateLimited(res);
      return [];
    }
    const orgs = (await res.json()) as GitHubOrgLike[];
    if (!Array.isArray(orgs)) return [];
    return orgs.map((o) => ({
      login: o.login,
      name: o.description,
      avatarUrl: o.avatar_url,
      url: `https://github.com/${o.login}`,
    }));
  } catch (e) {
    // A rate limit must not be flattened into "this user has none" — the result is
    // persisted now, so that would cache an empty list as fresh for a full hour.
    if (e instanceof Error && e.message === "RateLimit") throw e;
    return [];
  }
}

/** Fetch recent merged pull requests for a user */
export async function fetchMergedPRs(username: string, limit: number = 10): Promise<MergedPR[]> {
  const query = `search/issues?q=author:${encodeURIComponent(username)}+type:pr+is:merged&sort=updated&order=desc&per_page=${limit}`;
  try {
    const res = await fetchWithTimeout(
      `https://api.github.com/${query}`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        cache: "no-store",
      },
      10_000
    );

    if (!res.ok) {
      await throwIfRateLimited(res);
      return [];
    }
    const json = await res.json();
    if (!Array.isArray(json.items)) return [];
    return json.items.map((item: any) => ({
      title: item.title,
      url: item.html_url,
      repoName: item.repository_url.split('/').slice(-1)[0],
      mergedAt: item.closed_at,
    }));
  } catch (e) {
    // A rate limit must not be flattened into "this user has none" — the result is
    // persisted now, so that would cache an empty list as fresh for a full hour.
    if (e instanceof Error && e.message === "RateLimit") throw e;
    return [];
  }
}

/**
 * The GitHub user object. Previously defined inside the profile page; lifted here
 * so the background snapshot sync can fetch exactly what the page renders, rather
 * than a second, drifting copy of the same request.
 */
export interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  blog: string | null;
  location: string | null;
  twitter_username: string | null;
}

export async function fetchGitHubUser(username: string): Promise<GitHubUser | null> {
  const res = await fetchWithTimeout(
    `https://api.github.com/users/${username}`,
    {
      headers: { Accept: "application/vnd.github.v3+json" },
      // The snapshot TTL in the DB is now the single source of freshness. A second,
      // independent Next Data Cache in front of it would let a "stale" sync be served
      // an hour-old response, so it is deliberately disabled here.
      cache: "no-store",
    },
    10_000
  );
  if (!res.ok) {
    try {
      const err = await res.json();
      if (err.message && err.message.toLowerCase().includes("rate limit")) {
        throw new Error("RateLimit");
      }
    } catch (e) {
      if (e instanceof Error && e.message === "RateLimit") throw e;
    }
    return null;
  }

  return res.json() as Promise<GitHubUser>;
}

export async function fetchGitHubRepos(username: string): Promise<GitHubRepoPayload[]> {
  const res = await fetchWithTimeout(
    `https://api.github.com/users/${username}/repos?sort=stars&per_page=100&type=owner`,
    {
      headers: { Accept: "application/vnd.github.mercy-preview+json" },
      cache: "no-store",
    },
    10_000
  );
  if (!res.ok) {
    // Previously this swallowed every non-OK response into an empty list. That was
    // survivable when the page re-fetched on each render, but the result is now
    // persisted, so a rate-limited response would cache an empty repo list as
    // "fresh" for an hour. Surface it instead, so the sync declines to store it.
    await throwIfRateLimited(res);
    return [];
  }
  // Untyped JSON from the API boundary — assert the shape once, here, rather than
  // leaking `any` into every consumer.
  const repos = (await res.json()) as (GitHubRepoPayload & { fork: boolean })[];
  return repos.filter((r) => !r.fork).slice(0, 6);
}
