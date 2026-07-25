import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  fetchGitHubUser,
  fetchGitHubRepos,
  fetchLiveStats,
  fetchOrganizations,
  fetchMergedPRs,
  type GitHubUser,
  type GitHubRepoPayload,
} from "@/lib/profile-data";
import { fetchContributionCalendar, type ContributionCalendar } from "@/lib/github";
import type { ContributorStats, Org, MergedPR } from "@/types";

/**
 * DB-first profile data.
 *
 * The profile page used to await six GitHub calls in sequence before it could
 * respond, so TTFB was their sum. It now reads a stored snapshot in one query and
 * renders from that; the GitHub work happens afterwards, in the background, via
 * `after()`.
 *
 * The snapshot stores the *raw* GitHub payloads rather than the derived score,
 * heatmap, or tech stack. Those are cheap pure functions computed at render, so
 * keeping them out of the snapshot means changing the scoring formula takes effect
 * immediately instead of requiring every stored row to be re-synced.
 */

/** How old a snapshot may be before we refresh it behind the response. */
export const SNAPSHOT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * How long one sync may hold its claim. A cold profile is polled by the client
 * while it syncs, and every one of those renders would otherwise fire another
 * six-call GitHub sync — a stampede against the very API this issue is trying to
 * stop hammering. The claim below makes only the first one proceed.
 */
const SYNC_LOCK_MS = 2 * 60 * 1000; // 2 minutes

export interface ProfileSnapshot {
  user: GitHubUser | null;
  repos: GitHubRepoPayload[];
  liveStats: ContributorStats | null;
  mergedPRs: MergedPR[];
  orgs: Org[];
  contributionCalendar: ContributionCalendar | null;
  /** True when GitHub rate-limited any of the calls. Such a snapshot is never stored. */
  rateLimited: boolean;
}

export interface SnapshotRow {
  snapshot: ProfileSnapshot | null;
  syncedAt: string | null;
}

/** True when a snapshot is old enough to be worth refreshing behind the response. */
export function isSnapshotStale(syncedAt: string | null): boolean {
  if (!syncedAt) return true;
  const at = Date.parse(syncedAt);
  if (!Number.isFinite(at)) return true;
  return Date.now() - at > SNAPSHOT_TTL_MS;
}

/**
 * Read the stored snapshot. Uses the anon client — reads are public, per the RLS
 * policy on the table. Returns null when nothing has ever been stored.
 *
 * Wrapped in React's `cache()` so `generateMetadata` and the page body — which both
 * need it and both run for the same request — share a single database round-trip.
 */
export const getProfileSnapshot = cache(async function getProfileSnapshot(
  username: string
): Promise<SnapshotRow | null> {
  const { data, error } = await supabase
    .from("profile_snapshots")
    .select("snapshot, synced_at")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error || !data) return null;

  return {
    snapshot: (data.snapshot as ProfileSnapshot | null) ?? null,
    syncedAt: (data.synced_at as string | null) ?? null,
  };
});

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

/**
 * Take the sync claim for a username, so concurrent renders don't all sync.
 *
 * Two steps, because the row may not exist yet:
 *  1. Insert a claim row if there isn't one (ignoring a conflict if there is).
 *  2. Atomically bump `sync_started_at`, but only if the existing value is older
 *     than the lock window. Postgres decides the winner, so this is race-safe
 *     across concurrent edge invocations — the same technique `refreshProfile()`
 *     already uses against `profiles.last_refreshed_at`.
 *
 * Returns false when another sync currently holds the claim.
 */
async function claimSync(admin: SupabaseClient, username: string): Promise<boolean> {
  const now = new Date();
  const lockCutoff = new Date(now.getTime() - SYNC_LOCK_MS).toISOString();

  const { error: insertError } = await admin
    .from("profile_snapshots")
    .insert({ username, sync_started_at: now.toISOString() });

  // No conflict: the row is new and we just created it, so the claim is ours.
  if (!insertError) return true;

  // Only a unique violation (23505) means the row already existed. Any other insert
  // failure is a real problem — a transient DB or network error, say — and must not
  // be silently reinterpreted as "another sync owns the claim", which would skip this
  // sync without a trace.
  if (insertError.code !== "23505") {
    console.error("[snapshot] could not claim sync:", insertError.message);
    return false;
  }

  // A row already existed. Take the claim only if the previous sync is stale.
  const { data } = await admin
    .from("profile_snapshots")
    .update({ sync_started_at: now.toISOString() })
    .eq("username", username)
    .lt("sync_started_at", lockCutoff)
    .select("username")
    .maybeSingle();

  return Boolean(data);
}

/**
 * Fetch the profile from GitHub and store it.
 *
 * Intended to be called from `after()`, so it runs once the response has already
 * been sent and never blocks a render. The six GitHub calls run concurrently here
 * (they're independent), so a sync costs roughly the slowest call rather than the
 * sum of all six.
 *
 * Failures are contained: one failing call leaves that section empty rather than
 * discarding the whole snapshot, matching how the page already degrades.
 */
export async function syncProfileSnapshot(rawUsername: string): Promise<void> {
  const username = rawUsername.toLowerCase();

  const admin = adminClient();
  if (!admin) {
    console.error("[snapshot] service-role key missing; cannot sync");
    return;
  }

  if (!(await claimSync(admin, username))) {
    // Another sync is already in flight for this username.
    return;
  }

  const [user, repos, liveStats, mergedPRs, orgs, contributionCalendar] =
    await Promise.allSettled([
      fetchGitHubUser(rawUsername),
      fetchGitHubRepos(rawUsername),
      fetchLiveStats(rawUsername),
      fetchMergedPRs(rawUsername, 10),
      fetchOrganizations(rawUsername),
      fetchContributionCalendar(rawUsername),
    ]);

  const wasRateLimited = (r: PromiseSettledResult<unknown>) =>
    r.status === "rejected" &&
    r.reason instanceof Error &&
    r.reason.message === "RateLimit";

  const rateLimited = [user, repos, liveStats, mergedPRs, orgs, contributionCalendar].some(
    wasRateLimited
  );

  // ANY failed user fetch — rate limit, 10s timeout, DNS failure, connection reset —
  // tells us nothing about whether the account exists. `fetchWithTimeout` throws
  // FetchTimeoutError on timeout and rethrows other transport errors, so narrowing this
  // to the rate-limit case would let a single transient blip persist `user: null` with a
  // fresh `synced_at` — caching a false 404 for a real account for a full TTL hour.
  if (user.status === "rejected") {
    return;
  }

  // Likewise, never persist a rate-limited (and therefore degraded) snapshot: it would
  // be stored as "fresh" and serve an empty profile for an hour. GitHub applies its rate
  // limit across all calls from the same IP/token, and all six run concurrently here, so
  // a limit hit by any of them means the whole snapshot is untrustworthy. Leaving the row
  // unwritten keeps the page in its syncing state, which then retries — the honest outcome.
  if (rateLimited) {
    return;
  }

  const snapshot: ProfileSnapshot = {
    user: user.status === "fulfilled" ? user.value : null,
    repos: repos.status === "fulfilled" ? repos.value : [],
    liveStats: liveStats.status === "fulfilled" ? liveStats.value : null,
    mergedPRs: mergedPRs.status === "fulfilled" ? mergedPRs.value : [],
    orgs: orgs.status === "fulfilled" ? orgs.value : [],
    contributionCalendar:
      contributionCalendar.status === "fulfilled" ? contributionCalendar.value : null,
    rateLimited,
  };

  const { error } = await admin
    .from("profile_snapshots")
    .upsert(
      {
        username,
        snapshot,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "username" }
    );

  if (error) {
    console.error("[snapshot] failed to store snapshot:", error.message);
  }
}
