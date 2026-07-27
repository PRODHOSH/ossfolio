export interface ContributorProfile {
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  githubUrl: string;
  websiteUrl: string | null;
  twitterUsername: string | null;
  location: string | null;
  followers: number;
  following: number;
  score: number;
  stats: ContributorStats;
  topRepos: Repo[];
  organizations: Org[];
  heatmap: HeatmapWeek[];
  techStack: TechEntry[];
}

export interface ContributorStats {
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalReviews: number;
  totalContributions: number;
}

export interface Repo {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  languageColor: string | null;
  url: string;
  topics: string[];
}

export interface Org {
  login: string;
  name: string | null;
  avatarUrl: string;
  url: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
  color: string;
}

export interface HeatmapWeek {
  days: HeatmapDay[];
}

export interface TechEntry {
  language: string;
  repoCount: number;
}

export interface BadgeItem {
  program: string;
  years: number[];
}

/** AI-generated guidance based on the public data shown on a profile. */
export interface DeveloperInsights {
  overallAssessment: string;
  strengths: string[];
  areasForImprovement: string[];
  recruiterPerspective: string;
  careerRecommendations: string[];
  openSourceSuggestions: string[];
  resumeRecommendations: string[];
}

/** The bounded, public profile summary accepted by the Developer Insights API. */
export interface DeveloperInsightsProfile {
  username: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  score: number;
  stats: ContributorStats;
  techStack: TechEntry[];
  organizations: string[];
  repositories: Array<{
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    topics: string[];
  }>;
}

/** Represents a pull request and its status */
export interface MergedPR {
  title: string;
  url: string;
  repoName: string;
  mergedAt: string;
  state?: "open" | "closed" | "merged";
  createdAt?: string;
}
