import type { ContributorStats, BadgeItem } from "@/types";

export interface AutomatedBadgeInput {
  stats?: ContributorStats | {
    totalCommits?: number;
    totalPRs?: number;
    totalIssues?: number;
    totalReviews?: number;
    totalContributions?: number;
  };
  repos?: Array<{
    stars?: number;
    language?: string | null;
  }>;
  topLanguages?: string[];
  prs?: Array<{
    mergedAt?: string;
    createdAt?: string;
    labels?: string[];
  }>;
  issues?: Array<{
    labels?: string[];
  }>;
}

export interface AutomatedBadgeCriterion {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "commits" | "prs" | "languages" | "bugs" | "time" | "stars" | "reviews";
  evaluate: (input: AutomatedBadgeInput) => boolean;
}

export const AUTOMATED_BADGE_CRITERIA: readonly AutomatedBadgeCriterion[] = [
  {
    id: "first_100_commits",
    name: "First 100 Commits",
    description: "Reached 100 total commits in open source",
    icon: "💻",
    category: "commits",
    evaluate: ({ stats }) => (stats?.totalCommits ?? 0) >= 100,
  },
  {
    id: "century_prs",
    name: "Century PRs",
    description: "Merged 100 pull requests",
    icon: "🚀",
    category: "prs",
    evaluate: ({ stats }) => (stats?.totalPRs ?? 0) >= 100,
  },
  {
    id: "polyglot",
    name: "Polyglot",
    description: "Contributed code across 5+ distinct programming languages",
    icon: "🌐",
    category: "languages",
    evaluate: ({ repos = [], topLanguages = [] }) => {
      const langs = new Set<string>();
      repos.forEach((r) => {
        if (r?.language) langs.add(r.language.trim().toLowerCase());
      });
      topLanguages.forEach((l) => {
        if (l) langs.add(l.trim().toLowerCase());
      });
      return langs.size >= 5;
    },
  },
  {
    id: "bug_squasher",
    name: "Bug Squasher",
    description: "Closed or resolved 10+ bug issues and pull requests",
    icon: "🐛",
    category: "bugs",
    evaluate: ({ stats, issues = [], prs = [] }) => {
      const bugItemsCount =
        issues.filter((i) =>
          i?.labels?.some((l) => l.toLowerCase().includes("bug")),
        ).length +
        prs.filter((p) =>
          p?.labels?.some((l) => l.toLowerCase().includes("bug")),
        ).length;
      return (stats?.totalIssues ?? 0) >= 10 || bugItemsCount >= 10;
    },
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Merged a pull request between 12 AM and 4 AM UTC",
    icon: "🦉",
    category: "time",
    evaluate: ({ prs = [] }) => {
      return prs.some((pr) => {
        const dateStr = pr?.mergedAt || pr?.createdAt;
        if (!dateStr) return false;
        try {
          const hour = new Date(dateStr).getUTCHours();
          return hour >= 0 && hour < 4;
        } catch {
          return false;
        }
      });
    },
  },
  {
    id: "star_magnet",
    name: "Star Magnet",
    description: "Earned 100+ total repository stars",
    icon: "⭐",
    category: "stars",
    evaluate: ({ repos = [] }) => {
      const starsSum = repos.reduce((sum, r) => sum + (r?.stars || 0), 0);
      return starsSum >= 100;
    },
  },
  {
    id: "review_master",
    name: "Review Master",
    description: "Completed 50+ pull request code reviews",
    icon: "👀",
    category: "reviews",
    evaluate: ({ stats }) => (stats?.totalReviews ?? 0) >= 50,
  },
];

/**
 * Server-side evaluation function: evaluates user stats against automated badge criteria
 * and merges earned automated badges into the existing badge list.
 */
export function awardBadges(
  existingBadges: BadgeItem[] = [],
  input: AutomatedBadgeInput,
): BadgeItem[] {
  const currentYear = new Date().getFullYear();
  const automatedBadgeNames = new Set(
    AUTOMATED_BADGE_CRITERIA.map((b) => b.name),
  );

  // Preserve user-selected program badges (e.g., GSoC, GSSoC, Hacktoberfest)
  const userBadges = existingBadges.filter(
    (b) => !automatedBadgeNames.has(b.program),
  );

  const earnedAutomatedBadges: BadgeItem[] = [];

  AUTOMATED_BADGE_CRITERIA.forEach((criterion) => {
    if (criterion.evaluate(input)) {
      const existing = existingBadges.find((b) => b.program === criterion.name);
      const years =
        existing?.years && Array.isArray(existing.years) && existing.years.length > 0
          ? existing.years
          : [currentYear];

      earnedAutomatedBadges.push({
        program: criterion.name,
        years,
      });
    }
  });

  return [...userBadges, ...earnedAutomatedBadges];
}
