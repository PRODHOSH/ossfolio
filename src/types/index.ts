export interface FundingLink {
  platform: "GitHub Sponsors" | "Patreon" | "Open Collective" | "Buy Me a Coffee" | "Custom";
  url: string;
}

export interface SponsorItem {
  id?: string;
  name: string;
  tier?: string;
  logoUrl?: string;
  url?: string;
}

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
  fundingLinks?: FundingLink[];
  sponsors?: SponsorItem[];
  contributionState?: "active" | "inactive" | "hiatus";
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

export interface GistItem {
  id: string;
  description: string | null;
  url: string;
  filesCount: number;
  commentsCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  primaryFile?: {
    filename: string;
    language: string | null;
    size: number;
  };
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

export interface CoContributor {
  login: string;
  name?: string | null;
  avatarUrl?: string;
  repoName?: string;
  contributionsCount?: number;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: "contributor" | "repo" | "org" | "collaborator";
  avatarUrl?: string;
  url?: string;
  val: number;
  color: string;
  details?: string;
  statsText?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkEdge {
  source: string | NetworkNode;
  target: string | NetworkNode;
  weight: number;
  label?: string;
}

export interface ImpactNetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}
