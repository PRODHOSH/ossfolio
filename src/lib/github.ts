import type { ContributorStats, Repo } from "@/types";

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
    next: { revalidate: 3600 }, // cache for 1 hour
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

/** Fetch a contributor's full GitHub profile and contributions via the GraphQL API using a bearer token. */
export async function fetchContributorProfile(
  login: string,
  token: string
): Promise<GitHubContributor> {
  const data = await githubGraphQL<{ user: GitHubContributor }>(
    CONTRIBUTOR_QUERY,
    { login },
    token
  );
  return data.user;
}

/**
 * Convert a GraphQL `GitHubContributor` into the `{ stats, repos }` inputs that
 * `calculateScore` expects. Unlike the unauthenticated REST pipeline, the
 * authenticated GraphQL `contributionsCollection` exposes review counts, so the
 * resulting score reflects every signal in the formula (commits, PRs, issues,
 * reviews, stars). Pure and side-effect free so it can be unit-tested directly.
 */
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
  }));
  return { stats, repos };
}

/* -------------------------------------------------------------------------- */
/* Public contribution calendar (no token required)                           */
/* -------------------------------------------------------------------------- */

/**
 * The GraphQL `contributionsCollection` above is the richest source of
 * contribution data, but it requires an authenticated bearer token — which the
 * public profile pages do not have. GitHub also serves the same calendar as an
 * HTML fragment at `https://github.com/users/<login>/contributions`, with no
 * authentication. Each day is a `<td class="ContributionCalendar-day">` carrying
 * `data-date` and an `id` of the form `contribution-day-component-<row>-<col>`
 * (row = day of week 0–6, col = week index), and the exact count lives in a
 * matching `<tool-tip for="…">N contributions on <date>.</tool-tip>`.
 *
 * This module parses that fragment into the same `HeatmapWeek[]` shape the
 * `generateMockHeatmap` placeholder produced, so the profile page can drop in
 * real data without any component changes.
 */

// GitHub's five contribution intensity buckets (matches the mock generator).
const HEATMAP_COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

/** Map a raw contribution count to GitHub's five-step heatmap colour scale. */
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

/**
 * Fetch and parse a user's real contribution calendar from GitHub's public
 * (unauthenticated) HTML endpoint. Returns weeks ordered oldest → newest, each
 * with seven days ordered Sunday → Saturday, plus the year's total. Returns
 * `null` if the request fails or the markup cannot be parsed, so callers can
 * fall back gracefully without crashing the page.
 */
export async function fetchContributionCalendar(
  username: string,
  from?: string
): Promise<ContributionCalendar | null> {
  try {
    let url = `https://github.com/users/${encodeURIComponent(username)}/contributions`;
    if (from) {
      url += `?from=${encodeURIComponent(from)}`;
    }
    const res = await fetch(
      url,
      {
        headers: {
          // GitHub returns the calendar fragment for a normal browser Accept.
          Accept: "text/html",
          "User-Agent": "ossfolio (+https://ossfolio.qzz.io)",
        },
        next: { revalidate: 3600 }, // cache for 1 hour, like the other GitHub calls
      }
    );
    if (!res.ok) return null;

    const html = await res.text();

    // Step 1: build a map of cell id → exact contribution count from the
    // accessible tool-tip labels. "No contributions" labels stay at 0.
    const countById = new Map<string, number>();
    const tipRe =
      /<tool-tip[^>]*\bfor="(contribution-day-component-\d+-\d+)"[^>]*>([^<]*)<\/tool-tip>/g;
    let tip: RegExpExecArray | null;
    while ((tip = tipRe.exec(html)) !== null) {
      const id = tip[1];
      const label = tip[2].trim();
      const numMatch = label.match(/^([\d,]+)\s+contribution/);
      const count = numMatch ? parseInt(numMatch[1].replace(/,/g, ""), 10) : 0;
      countById.set(id, count);
    }

    // Step 2: walk every day cell, grouping by week column (the second number
    // in the id) and ordering days within a week by row (day of week).
    const weekMap = new Map<number, { row: number; day: ContributionDay }[]>();
    const cellRe = /<td\b[^>]*class="ContributionCalendar-day"[^>]*>/g;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(html)) !== null) {
      const tag = cell[0];
      const dateMatch = tag.match(/data-date="([0-9-]+)"/);
      const idMatch = tag.match(
        /id="contribution-day-component-(\d+)-(\d+)"/
      );
      if (!dateMatch || !idMatch) continue;

      const row = parseInt(idMatch[1], 10); // day of week (0–6)
      const col = parseInt(idMatch[2], 10); // week index
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

    return { weeks, totalContributions };
  } catch {
    return null;
  }
}
