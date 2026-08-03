import type { ContributorStats, Repo, CoContributor, ContributionImpactContext } from "@/types";
import { redis } from "./redis";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/fetch-with-timeout";
import { GitHubRateLimitError } from "@/lib/errors";
import { GITHUB_API_BASE } from './constants';

const GITHUB_GRAPHQL_URL = `${GITHUB_API_BASE}/graphql`;

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(
        GITHUB_GRAPHQL_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
          next: { revalidate: 3600 },
        },
        10_000,
      );

      if (!res.ok) {
        if (res.status === 403) {
          const isRateLimit =
            res.headers.get("x-ratelimit-remaining") === "0" ||
            res.headers.has("retry-after");
          if (isRateLimit) {
            throw new GitHubRateLimitError();
          }
        }
        // 429 or 5xx — retryable
        if (res.status === 429 || res.status >= 500) {
          lastError = new Error(`GitHub API error: ${res.status}`);
          if (attempt < RETRY_CONFIG.maxRetries) {
            const delay = Math.min(
              RETRY_CONFIG.baseDelayMs * 2 ** attempt,
              RETRY_CONFIG.maxDelayMs,
            );
            await sleep(delay);
            continue;
          }
        }
        throw new Error(`GitHub API error: ${res.status}`);
      }

      const json = await res.json();
      if (json.errors?.length) {
        const firstErr = json.errors[0];
        
        // 1. GraphQL Error Interception: Catch structured AND string-based rate limits
        if (firstErr.type === "RATE_LIMITED" || /rate limit/i.test(firstErr.message)) {
          throw new GitHubRateLimitError(firstErr.message);
        }
        
        lastError = new Error(firstErr.message);
        // Some GitHub errors are retryable (e.g. secondary rate limit)
        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = Math.min(
            RETRY_CONFIG.baseDelayMs * 2 ** attempt,
            RETRY_CONFIG.maxDelayMs,
          );
          await sleep(delay);
          continue;
        }
        throw lastError;
      }
      return json.data as T;
    } catch (err) {
      if (err instanceof FetchTimeoutError) {
        lastError = err;
        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = Math.min(
            RETRY_CONFIG.baseDelayMs * 2 ** attempt,
            RETRY_CONFIG.maxDelayMs,
          );
          await sleep(delay);
          continue;
        }
      }
      throw err;
    }
  }

  throw lastError ?? new Error("GitHub API request failed after retries");
}

export const CONTRIBUTOR_QUERY = `
  query ContributorProfile($login: String!) {
    user(login: $login) {
      login
      name
      bio
      avatarUrl
      url
      websiteUrl
      twitterUsername
      location
      followers { totalCount }
      following { totalCount }
      pinnedItems(first: 6, types: REPOSITORY) {
        nodes {
          ... on Repository {
            name
            description
            stargazerCount
            forkCount
            primaryLanguage { name color }
            url
          }
        }
      }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: { field: STARGAZERS, direction: DESC }) {
        totalCount
        nodes {
          name
          description
          stargazerCount
          forkCount
          primaryLanguage { name color }
          url
        }
      }
      pullRequests(first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          title
          comments { totalCount }
          labels(first: 5) {
            nodes { name }
          }
          repository {
            name
            stargazerCount
          }
        }
      }
      issues(first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          title
          comments { totalCount }
          labels(first: 5) {
            nodes { name }
          }
          repository {
            name
            stargazerCount
          }
        }
      }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              color
            }
          }
        }
      }
      organizations(first: 20) {
        nodes {
          login
          name
          avatarUrl
          url
        }
      }
    }
  }
`;

export interface GitHubContributor {
  login: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  url: string;
  websiteUrl: string | null;
  twitterUsername: string | null;
  location: string | null;
  followers: { totalCount: number };
  following: { totalCount: number };
  pinnedItems: {
    nodes: {
      name: string;
      description: string | null;
      stargazerCount: number;
      forkCount: number;
      primaryLanguage: { name: string; color: string } | null;
      url: string;
    }[];
  };
  repositories: {
    totalCount: number;
    nodes: {
      name: string;
      description: string | null;
      stargazerCount: number;
      forkCount: number;
      primaryLanguage: { name: string; color: string } | null;
      url: string;
    }[];
  };
  pullRequests?: {
    nodes: {
      title: string;
      comments?: { totalCount: number };
      labels?: { nodes: { name: string }[] };
      repository?: { name: string; stargazerCount: number };
    }[];
  };
  issues?: {
    nodes: {
      title: string;
      comments?: { totalCount: number };
      labels?: { nodes: { name: string }[] };
      repository?: { name: string; stargazerCount: number };
    }[];
  };
  contributionsCollection: {
    totalCommitContributions: number;
    totalPullRequestContributions: number;
    totalIssueContributions: number;
    totalPullRequestReviewContributions: number;
    contributionCalendar: {
      totalContributions: number;
      weeks: {
        contributionDays: {
          contributionCount: number;
          date: string;
          color: string;
        }[];
      }[];
    };
  };
  organizations: {
    nodes: {
      login: string;
      name: string | null;
      avatarUrl: string;
      url: string;
    }[];
  };
}

/** Fetch a contributor's full GitHub profile and contributions via the GraphQL API, caching results in Redis for 2 hours. */
export async function fetchContributorProfile(
  login: string,
  token: string,
): Promise<GitHubContributor> {
  const cacheKey = `github:profile:${login.toLowerCase()}`;

  try {
    const cachedData = await redis.get<GitHubContributor>(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  } catch (err) {
    console.error("Redis read error gracefully bypassed:", err);
  }

  const data = await githubGraphQL<{ user: GitHubContributor }>(
    CONTRIBUTOR_QUERY,
    { login },
    token,
  );

  if (data?.user) {
    try {
      await redis.set(cacheKey, data.user, { ex: 7200 });
    } catch (err) {
      console.error("Redis write error gracefully bypassed:", err);
    }
  }

  return data.user;
}

export function contributorToScoreInputs(c: GitHubContributor): {
  stats: ContributorStats;
  repos: Repo[];
  impactContext: ContributionImpactContext;
} {
  const cc = c.contributionsCollection;
  const stats: ContributorStats = {
    totalCommits: cc.totalCommitContributions,
    totalPRs: cc.totalPullRequestContributions,
    totalIssues: cc.totalIssueContributions,
    totalReviews: cc.totalPullRequestReviewContributions,
    totalContributions: cc.contributionCalendar.totalContributions,
  };
  const repos: Repo[] = c.repositories.nodes.map((n) => ({
    name: n.name,
    description: n.description,
    stars: n.stargazerCount,
    forks: n.forkCount,
    language: n.primaryLanguage?.name ?? null,
    languageColor: n.primaryLanguage?.color ?? null,
    url: n.url,
    topics: [],
  }));

  const prs =
    c.pullRequests?.nodes?.map((pr) => ({
      title: pr.title,
      repoName: pr.repository?.name,
      repoStars: pr.repository?.stargazerCount ?? 0,
      labels: pr.labels?.nodes?.map((l) => l.name) ?? [],
      commentsCount: pr.comments?.totalCount ?? 0,
    })) ?? [];

  const issues =
    c.issues?.nodes?.map((iss) => ({
      title: iss.title,
      repoName: iss.repository?.name,
      repoStars: iss.repository?.stargazerCount ?? 0,
      labels: iss.labels?.nodes?.map((l) => l.name) ?? [],
      commentsCount: iss.comments?.totalCount ?? 0,
    })) ?? [];

  const impactContext: ContributionImpactContext = { prs, issues };

  return { stats, repos, impactContext };
}


/* -------------------------------------------------------------------------- */
/* Public contribution calendar (no token required)                           */
/* -------------------------------------------------------------------------- */

const HEATMAP_COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

function colorForCount(count: number): string {
  if (count === 0) return HEATMAP_COLORS[0];
  if (count < 3) return HEATMAP_COLORS[1];
  if (count < 6) return HEATMAP_COLORS[2];
  if (count < 9) return HEATMAP_COLORS[3];
  return HEATMAP_COLORS[4];
}

export interface ContributionDay {
  date: string;
  count: number;
  color: string;
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export interface ContributionCalendar {
  weeks: ContributionWeek[];
  totalContributions: number;
}

export async function fetchContributionCalendar(
  username: string,
  from?: string,
): Promise<ContributionCalendar | null> {
  const cacheKey = `github:calendar:${username.toLowerCase()}${from ? `:${from}` : ""}`;

  try {
    const cachedCalendar = await redis.get<ContributionCalendar>(cacheKey);
    if (cachedCalendar) return cachedCalendar;
  } catch (err) {
    console.error("Redis calendar read error gracefully bypassed:", err);
  }

  try {
    let url = `https://github.com/users/${encodeURIComponent(username)}/contributions`;
    if (from) {
      url += `?from=${encodeURIComponent(from)}`;
    }
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: "text/html",
          "User-Agent": "ossfolio (+https://ossfolio.qzz.io)",
        },
        next: { revalidate: 3600 },
      },
      10_000,
    );

    if (!res.ok) return null;

    const html = await res.text();
    const countById = new Map<string, number>();
    
    // 2. Scraper Regex Parsing: Robust tooltip matching independent of specific ID structures
    const tipRe = /<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/gi;
    let tip: RegExpExecArray | null;
    while ((tip = tipRe.exec(html)) !== null) {
      const id = tip[1];
      const label = tip[2].trim();
      const numMatch = label.match(/^([\d,]+)\s+contribution/i);
      const count = numMatch ? parseInt(numMatch[1].replace(/,/g, ""), 10) : 0;
      countById.set(id, count);
    }

    const weekMap = new Map<number, { row: number; day: ContributionDay }[]>();
    
    // Robust cell parsing: Matches ANY table data cell that has a data-date attribute 
    // instead of relying on a fragile CSS class name
    const cellRe = /<td\b[^>]*data-date="([0-9-]+)"[^>]*>/gi;
    let cell: RegExpExecArray | null;
    
    while ((cell = cellRe.exec(html)) !== null) {
      const tag = cell[0];
      const dateMatch = tag.match(/data-date="([0-9-]+)"/);
      const idMatch = tag.match(/id="([^"]+)"/);
      
      if (!dateMatch || !idMatch) continue;

      const date = dateMatch[1];
      const id = idMatch[1];
      const count = countById.get(id) ?? 0;

      // Extract row/col safely, fallback to epoch calculation if id shifts
      const coordMatch = id.match(/-(\d+)-(\d+)$/);
      const row = coordMatch ? parseInt(coordMatch[1], 10) : new Date(date).getUTCDay();
      const col = coordMatch 
        ? parseInt(coordMatch[2], 10) 
        : Math.floor(new Date(date).getTime() / (7 * 24 * 3600 * 1000));

      if (!weekMap.has(col)) weekMap.set(col, []);
      weekMap.get(col)!.push({
        row,
        day: { date, count, color: colorForCount(count) },
      });
    }

    if (weekMap.size === 0) return null;

    const weeks: ContributionWeek[] = [...weekMap.keys()]
      .sort((a, b) => a - b)
      .map((col) => ({
        days: weekMap
          .get(col)!
          .sort((a, b) => a.row - b.row)
          .map((entry) => entry.day),
      }));

    const totalContributions = weeks.reduce(
      (sum, week) => sum + week.days.reduce((s, d) => s + d.count, 0),
      0,
    );

    const result: ContributionCalendar = { weeks, totalContributions };

    try {
      await redis.set(cacheKey, result, { ex: 7200 });
    } catch (err) {
      console.error("Redis calendar write error gracefully bypassed:", err);
    }

    return result;
  } catch {
    return null;
  }
}

export const CO_CONTRIBUTORS_QUERY = `
  query CoContributors($login: String!) {
    user(login: $login) {
      pullRequests(first: 20, states: MERGED, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          repository {
            nameWithOwner
            name
            collaborators(first: 5) {
              nodes {
                login
                name
                avatarUrl
              }
            }
          }
        }
      }
    }
  }
`;

/** Fetch co-contributors for a user from recent merged PRs and top repositories. */
export async function fetchCoContributors(
  login: string,
  token: string,
): Promise<CoContributor[]> {
  const cacheKey = `github:cocontributors:${login.toLowerCase()}`;

  try {
    const cached = await redis.get<CoContributor[]>(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.error("Redis co-contributors read bypassed:", err);
  }

  try {
    const data = await githubGraphQL<{
      user: {
        pullRequests: {
          nodes: Array<{
            repository: {
              nameWithOwner: string;
              name: string;
              collaborators?: {
                nodes: Array<{
                  login: string;
                  name: string | null;
                  avatarUrl: string;
                }>;
              };
            };
          }>;
        };
      };
    }>(CO_CONTRIBUTORS_QUERY, { login }, token);

    const prNodes = data?.user?.pullRequests?.nodes || [];
    const coMap = new Map<string, CoContributor>();

    for (const pr of prNodes) {
      const repoName = pr.repository?.name;
      const collabs = pr.repository?.collaborators?.nodes || [];
      for (const col of collabs) {
        if (col.login.toLowerCase() === login.toLowerCase()) continue;
        const existing = coMap.get(col.login) || {
          login: col.login,
          name: col.name,
          avatarUrl: col.avatarUrl,
          repoName,
          contributionsCount: 0,
        };
        existing.contributionsCount = (existing.contributionsCount || 0) + 1;
        coMap.set(col.login, existing);
      }
    }

    const result = Array.from(coMap.values()).slice(0, 12);

    try {
      await redis.set(cacheKey, result, { ex: 7200 });
    } catch (err) {
      console.error("Redis co-contributors write bypassed:", err);
    }

    return result;
  } catch (err) {
    console.error(`Failed to fetch co-contributors for ${login}:`, err);
    return [];
  }
}
