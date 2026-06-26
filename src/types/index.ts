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
