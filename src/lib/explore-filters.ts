import { POPULAR_LANGUAGES } from "./languages";

/**
 * Filter parsing and URL construction for the Explore leaderboard.
 *
 * Explore is a server component, so its filters are plain links rather than
 * client state. That has two consequences this module exists to handle:
 *
 *  - every filter value arrives as an untrusted query string and has to be
 *    validated before it reaches a database query;
 *  - every filter link has to carry the *other* active filters with it, or
 *    picking a language would silently discard the current search and sort.
 *
 * Keeping both here means the rules can be unit tested without rendering a
 * page or touching Supabase.
 */

/** Minimum-score buckets offered alongside the language filter. */
export const SCORE_TIERS = [
  { label: "Any score", value: 0 },
  { label: "100+", value: 100 },
  { label: "500+", value: 500 },
  { label: "1000+", value: 1000 },
  { label: "2500+", value: 2500 },
] as const;

const VALID_SCORES = new Set<number>(SCORE_TIERS.map((tier) => tier.value));

/**
 * Validates a language from the query string.
 *
 * Only the offered options are accepted. The value reaches an array
 * containment predicate, so an allowlist is both the correct validation and
 * the simplest: anything not on the list could not match a row anyway.
 *
 * Matching is case-insensitive on the way in but always returns the canonical
 * capitalisation, because `profiles.top_languages` stores GitHub's casing and
 * the containment operator is case-sensitive — a bookmarked
 * `?lang=typescript` should still work.
 */
export const normalizeLanguage = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const match = POPULAR_LANGUAGES.find(
    (lang) => lang.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? null;
};

/**
 * Validates a minimum-score tier from the query string.
 *
 * Returns 0 for anything unrecognised, which reads as "no score filter" and
 * keeps an invalid URL showing the full leaderboard rather than an error.
 */
export const normalizeScoreTier = (raw: unknown): number => {
  if (typeof raw !== "string") return 0;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed)) return 0;
  return VALID_SCORES.has(parsed) ? parsed : 0;
};

export interface ExploreFilters {
  type: string;
  q: string;
  sortBy: string;
  lang: string | null;
  minScore: number;
  page: number;
}

/** A query object suitable for passing to next/link's `href`. */
export type ExploreQuery = Record<string, string>;

/**
 * Builds the query object for a filter link.
 *
 * Empty values are omitted so URLs stay readable and shareable — `?lang=Rust`
 * rather than `?type=users&q=&sortBy=score&lang=Rust&minScore=0&page=1`.
 *
 * Any change to a filter resets pagination. Staying on page 4 while narrowing
 * the result set to two pages would land the reader on an empty screen, which
 * looks like a broken filter rather than the end of the list.
 */
export const buildExploreQuery = (
  current: ExploreFilters,
  patch: Partial<ExploreFilters> = {},
): ExploreQuery => {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();

  // 1. Query Parameter Merging: Strictly filter out defaults and empty strings
  if (merged.type && merged.type !== "users") params.set("type", merged.type);
  if (merged.q && merged.q.trim() !== "") params.set("q", merged.q.trim());
  if (merged.sortBy && merged.sortBy !== "score") params.set("sortBy", merged.sortBy);
  if (merged.lang && merged.lang.trim() !== "") params.set("lang", merged.lang.trim());
  if (merged.minScore && merged.minScore > 0) params.set("minScore", String(merged.minScore));

  // Ensure stale pagination resets if other filter criteria actively changed
  const filterChanged = ["type", "q", "sortBy", "lang", "minScore"].some(
    (key) =>
      key in patch &&
      patch[key as keyof ExploreFilters] !== current[key as keyof ExploreFilters]
  );

  if (!filterChanged && merged.page > 1) {
    params.set("page", String(merged.page));
  }

  return Object.fromEntries(params.entries());
};

/** True when any filter beyond the default view is active. */
export const hasActiveFilters = (filters: ExploreFilters): boolean =>
  Boolean(filters.lang) || filters.minScore > 0 || Boolean(filters.q);

/**
 * Describes the active filters for the results heading, so a reader landing on
 * a shared URL can see what they are looking at without decoding the query
 * string.
 */
export const describeFilters = (filters: ExploreFilters): string => {
  // 2. Filter Description Parsing: Clean array-based filtering to prevent trailing separators
  return [
    filters.lang,
    filters.minScore > 0 ? `score ${filters.minScore}+` : null,
    filters.q ? `matching “${filters.q}”` : null,
  ]
    .filter(Boolean)
    .join(" • ");
};
