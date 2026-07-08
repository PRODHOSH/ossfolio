import type { ContributorStats, Repo } from "@/types";
import { redis } from "./redis";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string
): Promise<T> {
  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 }, // fallback memory cache for 1 hour
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
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
  token: string
): Promise<GitHubContributor> {
  const cacheKey = `github:profile:${login.toLowerCase()}`;

  try {
    // 1. Check Redis Cache
    const cachedData = await redis.get<GitHubContributor>(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  } catch (err) {
    console.error("Redis read error gracefully bypassed:", err);
  }

  // 2. Cache Miss - Query live GraphQL API
  const data = await githubGraphQL<{ user: GitHubContributor }>(
    CONTRIBUTOR_QUERY,
    { login },
    token
  );

  if (data?.user) {
    try {
      // 3. Save response to Redis with 2 hours TTL (7200 seconds)
      await redis.set(cacheKey, data.user, { ex: 7200 });
    } catch (err) {
      console.error("Redis write error gracefully bypassed:", err);
    }
  }

  return data.user;
}

export function contributorToScoreInputs(
  c: GitHubContributor
): { stats: ContributorStats; repos: Repo[] } {
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
  return { stats, repos };
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
  from?: string
): Promise<ContributionCalendar | null> {
  const cacheKey = `github:calendar:${username.toLowerCase()}${from ? `:${from}` : ""}`;

  try {
    // 1. Try Cache-aside Strategy on Scraper endpoint
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
    const res = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "ossfolio (+https://ossfolio.qzz.io)",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const countById = new Map<string, number>();
    const tipRe = /<tool-tip[^>]*\bfor="(contribution-day-component-\d+-\d+)"[^>]*>([^<]*)<\/tool-tip>/g;
    let tip: RegExpExecArray | null;
    while ((tip = tipRe.exec(html)) !== null) {
      const id = tip[1];
      const label = tip[2].trim();
      const numMatch = label.match(/^([\d,]+)\s+contribution/);
      const count = numMatch ? parseInt(numMatch[1].replace(/,/g, ""), 10) : 0;
      countById.set(id, count);
    }

    const weekMap = new Map<number, { row: number; day: ContributionDay }[]>();
    const cellRe = /<td\b[^>]*class="ContributionCalendar-day"[^>]*>/g;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(html)) !== null) {
      const tag = cell[0];
      const dateMatch = tag.match(/data-date="([0-9-]+)"/);
      const idMatch = tag.match(/id="contribution-day-component-(\d+)-(\d+)"/);
      if (!dateMatch || !idMatch) continue;

      const row = parseInt(idMatch[1], 10);
      const col = parseInt(idMatch[2], 10);
      const id = `contribution-day-component-${row}-${col}`;
      const count = countById.get(id) ?? 0;

      if (!weekMap.has(col)) weekMap.set(col, []);
      weekMap.get(col)!.push({
  row,
  day: { date: dateMatch[1], count, color: colorForCount(count) },
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
      0
    );

    const result: ContributionCalendar = { weeks, totalContributions };

    try {
      // 2. Cache calendar results as well for 2 hours (7200s)
      await redis.set(cacheKey, result, { ex: 7200 });
    } catch (err) {
      console.error("Redis calendar write error gracefully bypassed:", err);
    }

    return result;
  } catch {
    return null;
  }
}