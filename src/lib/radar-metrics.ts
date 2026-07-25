import type { ContributorStats, Repo } from "@/types";

/**
 * Normalisation for the contributor comparison radar chart.
 *
 * A radar plots every axis on one shared scale, so raw contribution counts do
 * not work: commits routinely run into the thousands while code reviews sit in
 * the dozens, and the polygon collapses into a spike on the commit axis with
 * everything else pinned near the origin. That hides exactly the archetype
 * differences the chart exists to show.
 *
 * Each axis is therefore scaled against the larger of the two contributors'
 * values on that axis, so the leader on any metric reaches the outer edge and
 * the other is drawn in proportion. Raw values are carried alongside so the
 * tooltip can report real numbers rather than percentages.
 */

export interface RadarMetricInput {
  username: string;
  stats: ContributorStats;
  repos: Repo[];
}

export interface RadarAxis {
  /** Axis label shown on the chart. */
  metric: string;
  /** Normalised 0-100 value for contributor A. */
  a: number;
  /** Normalised 0-100 value for contributor B. */
  b: number;
  /** Unscaled value for contributor A, for the tooltip. */
  aRaw: number;
  /** Unscaled value for contributor B, for the tooltip. */
  bRaw: number;
}

/**
 * Sums stargazers across a contributor's repositories.
 *
 * Note this is not a contributor's total stars. The compare page fetches the
 * six highest-starred repositories from a page of 100, so this is "stars across
 * top repositories". Both contributors are measured the same way, which keeps
 * the comparison fair, but the absolute figure is a floor rather than a total.
 */
export const sumRepoStars = (repos: Repo[] | null | undefined): number => {
  if (!Array.isArray(repos)) return 0;
  return repos.reduce((total, repo) => {
    const stars = typeof repo?.stars === "number" && Number.isFinite(repo.stars)
      ? repo.stars
      : 0;
    return total + Math.max(0, stars);
  }, 0);
};

/** Guards against negatives and non-finite values arriving from the API. */
const safeCount = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

/**
 * Scales a pair of values against their own maximum.
 *
 * When both are zero the axis is drawn at zero for both rather than at the
 * outer edge — dividing by a zero maximum would otherwise produce NaN, and
 * treating "neither contributor has any reviews" as a full score on both sides
 * would be actively misleading.
 */
export const normalizePair = (a: number, b: number): { a: number; b: number } => {
  const safeA = safeCount(a);
  const safeB = safeCount(b);
  const max = Math.max(safeA, safeB);
  if (max === 0) return { a: 0, b: 0 };
  return {
    a: Math.round((safeA / max) * 100),
    b: Math.round((safeB / max) * 100),
  };
};

/** The five axes, in the order the issue specifies. */
const AXES: Array<{ metric: string; read: (_input: RadarMetricInput) => number }> = [
  { metric: "Commits", read: (i) => safeCount(i.stats?.totalCommits) },
  { metric: "Pull Requests", read: (i) => safeCount(i.stats?.totalPRs) },
  { metric: "Code Reviews", read: (i) => safeCount(i.stats?.totalReviews) },
  { metric: "Issues Opened", read: (i) => safeCount(i.stats?.totalIssues) },
  { metric: "Repo Stars", read: (i) => sumRepoStars(i.repos) },
];

/**
 * Builds the radar dataset for two contributors.
 *
 * Always returns all five axes, including ones where both contributors score
 * zero — dropping empty axes would change the polygon's shape between profile
 * pairs and make comparisons across pages incoherent.
 */
export const buildRadarData = (
  userA: RadarMetricInput,
  userB: RadarMetricInput,
): RadarAxis[] =>
  AXES.map(({ metric, read }) => {
    const aRaw = read(userA);
    const bRaw = read(userB);
    const { a, b } = normalizePair(aRaw, bRaw);
    return { metric, a, b, aRaw, bRaw };
  });

/**
 * True when every axis is zero for both contributors, meaning the chart would
 * render an empty polygon and is better replaced with a message.
 */
export const isRadarEmpty = (data: RadarAxis[]): boolean =>
  data.every((axis) => axis.aRaw === 0 && axis.bRaw === 0);
