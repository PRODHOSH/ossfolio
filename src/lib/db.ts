// Data-access layer for Supabase queries.
//
// This module centralizes the Supabase `.from(...)` / `.rpc(...)` reads and the shared-client
// writes that were previously inline in route handlers and components, so the UI consumes named,
// typed functions instead of building queries in place (issue #406).
//
// It uses the shared anon client (`supabase`) for public reads and the two shared-client writes,
// matching the existing convention (e.g. `lib/profile-snapshot.ts`). Queries that run *as the
// authenticated
// user* (a per-request client carrying the user's JWT, in the settings and profile-sync routes) are
// intentionally left in place: moving them here would require passing the client in, which is out of
// scope for this change.
//
// Fail-closed semantics are preserved verbatim: every function that reads a `visibility`-gated row
// returns the `{ data, error }` pair (or a typed result that carries the error) so callers can keep
// treating a database error as "unknown / deny", exactly as before. The Supabase client resolves
// failed queries as `{ data: null, error }` rather than throwing, so callers must inspect `error` —
// these functions do not swallow it.

import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

/** A row read from `profiles`, keyed by whatever columns the caller selected. */
export type ProfileRow = Record<string, unknown>;

/** Standard shape mirroring Supabase's `{ data, error }` so callers keep their fail-closed checks. */
export interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Fetch a single profile row by username, selecting the given columns.
 *
 * Returns the raw `{ data, error }` from Supabase so callers keep fail-closed behavior: on `error`
 * they must treat visibility as unknown and deny, rather than reading `data` (which is `null` on a
 * database failure — indistinguishable from "no such profile").
 *
 * @param username  the profile username (callers already normalize casing where needed)
 * @param columns   a Postgrest column selection string, e.g. "id, score, visibility"
 */
export async function getProfileByUsername(
  username: string,
  columns: string,
): Promise<QueryResult<ProfileRow>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(columns)
    .eq('username', username)
    .maybeSingle();
  return { data: (data as unknown as ProfileRow) ?? null, error };
}

/**
 * Fetch a single *public* profile row by username, selecting the given columns.
 *
 * Adds `.eq("visibility", "public")` to the filter, so non-public profiles return `{ data: null }`.
 * Used by the public API route, which only ever serves public profiles.
 */
export async function getPublicProfileByUsername(
  username: string,
  columns: string,
): Promise<QueryResult<ProfileRow>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(columns)
    .eq('username', username)
    .eq('visibility', 'public')
    .maybeSingle();
  return { data: (data as unknown as ProfileRow) ?? null, error };
}

/**
 * Upsert a profile's badges using the shared (anon) client.
 *
 * This is the write behind the "remove badge" controls in the profile UI. RLS still applies via the
 * shared client, exactly as when this was inline. Returns `{ error }` so the caller can surface a
 * failure message and skip the optimistic state update on error, as before.
 */
export async function updateProfileBadges(params: {
  id: string;
  username: string;
  badges: unknown;
}): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from('profiles').upsert({
    id: params.id,
    username: params.username,
    badges: params.badges,
    // `updated_at` is set server-side by the profiles_set_updated_at trigger; setting it here would
    // let a client forge the timestamp (e.g. to pin itself to the top of "recently updated").
  });
  return { error };
}

/** Parameters for the discover full-text search RPC (`search_profiles`). */
export interface SearchProfilesParams {
  query: string;
  lang: string;
  minScore: number;
  sortBy: string;
  pageSize: number;
  pageOffset: number;
}

/**
 * Run the `search_profiles` Postgres function (discover page).
 *
 * Returns `{ data, error }` unchanged so the caller keeps its existing error branch (log + 500).
 * The RPC itself already filters to public profiles server-side.
 */
export async function searchProfiles(
  params: SearchProfilesParams,
): Promise<QueryResult<unknown[]>> {
  const { data, error } = await supabase.rpc('search_profiles', {
    query: params.query,
    lang: params.lang,
    min_score: params.minScore,
    sort_by: params.sortBy,
    page_size: params.pageSize,
    page_offset: params.pageOffset,
  });
  return { data: (data as unknown[]) ?? null, error };
}

/** Sort keys accepted by the Explore profile listing. */
export type ExploreProfileSort =
  'score' | 'prs' | 'commits' | 'issues' | 'improvement';

/**
 * Fetch a page of public profiles for the Explore listing.
 *
 * Mirrors the original inline query: filters to `visibility = 'public'`, optional name/username
 * search, sort column chosen from `sortBy`, then `updated_at` and `username` as tiebreakers, and a
 * `[from, to]` range. Returns `{ data, error }`; the caller keeps its own guard
 * (`error || !Array.isArray(data)` → empty page).
 */
export async function fetchExploreProfiles(opts: {
  searchQuery: string;
  sortBy: ExploreProfileSort;
  from: number;
  to: number;
}): Promise<QueryResult<unknown[]>> {
  let query = supabase
    .from('profiles')
    .select(
      'username, name, avatar_url, score, total_prs, total_issues, total_commits, score_delta_30_days',
    )
    // Explore is a listing, so only public profiles belong in it. `unlisted` and `private` have
    // both opted out of being found.
    .eq('visibility', 'public');

  if (opts.searchQuery) {
    query = query.or(
      `username.ilike.%${opts.searchQuery}%,name.ilike.%${opts.searchQuery}%`,
    );
  }

  let orderColumn = 'score';
  if (opts.sortBy === 'prs') orderColumn = 'total_prs';
  else if (opts.sortBy === 'commits') orderColumn = 'total_commits';
  else if (opts.sortBy === 'issues') orderColumn = 'total_issues';
  else if (opts.sortBy === 'improvement') orderColumn = 'score_delta_30_days';

  const { data, error } = await query
    .order(orderColumn, { ascending: false })
    .order('updated_at', { ascending: false })
    .order('username', { ascending: true })
    .range(opts.from, opts.to);

  return { data: (data as unknown[]) ?? null, error };
}

/**
 * Fetch a page of organizations for the Explore listing.
 *
 * Mirrors the original inline query: optional name search, ordered by `score` desc then `slug` asc,
 * within a `[from, to]` range. Returns `{ data, error }`; the caller keeps its own guard.
 */
export async function fetchExploreOrganizations(opts: {
  searchQuery: string;
  from: number;
  to: number;
}): Promise<QueryResult<unknown[]>> {
  let query = supabase
    .from('organizations')
    .select('name, slug, avatar_url, score');

  if (opts.searchQuery) {
    query = query.ilike('name', `%${opts.searchQuery}%`);
  }

  const { data, error } = await query
    .order('score', { ascending: false })
    .order('slug', { ascending: true })
    .range(opts.from, opts.to);

  return { data: (data as unknown[]) ?? null, error };
}
