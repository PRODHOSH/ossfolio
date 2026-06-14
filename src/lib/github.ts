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
