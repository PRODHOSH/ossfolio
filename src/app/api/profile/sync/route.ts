import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  fetchContributorProfile,
  contributorToScoreInputs,
} from "@/lib/github";
import { mapRepos, fetchLiveStats } from "@/lib/profile-data";
import { scoreWithAnomalyCheck } from "@/lib/anomaly";
import { createApiResponse, createErrorResponse } from "@/lib/validators/api";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { ContributorStats, Repo } from "@/types";

// Runtime managed by @opennextjs/cloudflare

/** Bound every outbound GitHub call so a slow upstream cannot pin an edge invocation open. */
const GITHUB_TIMEOUT_MS = 8000;

/**
 * POST /api/profile/sync
 *
 * Recomputes the caller's score and persists it.
 *
 * This used to happen in the browser: `auth/callback` scored the account client-side and
 * upserted `profiles` with the anon key. That made `score`, `total_*` and the anti-gaming
 * `flagged` column client-writable, which is the hole #409 is about — the anon key ships in
 * the browser bundle, so a signed-in user could simply PATCH their own score.
 *
 * Two things make that impossible now:
 *
 *  1. The identity is taken from the *verified* access token, never from the request body.
 *     A caller cannot nominate whose profile is written, nor what score it gets — the score
 *     is derived here, from GitHub, not accepted as input.
 *  2. The write uses the service-role key, which bypasses RLS. The migration alongside this
 *     route revokes the client's column privileges on every server-computed column, so the
 *     browser could not perform this write even if it tried.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function extractToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

/** REST fallback for when no GitHub OAuth token is available (GraphQL needs one). */
async function statsFromRest(
  username: string,
): Promise<{ stats: ContributorStats; repos: Repo[] }> {
  // Bounded: this runs inside an edge invocation. The client stops waiting after
  // SYNC_TIMEOUT_MS and redirects, but the invocation itself would otherwise keep running
  // until GitHub answers, so the request is aborted rather than merely abandoned.
  const reposRes = await fetchWithTimeout(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=stars&per_page=12&type=owner`,
    {
      headers: { Accept: "application/vnd.github.v3+json" },
      cache: "no-store",
    },
    GITHUB_TIMEOUT_MS,
  );
  const rawRepos = reposRes.ok ? await reposRes.json() : [];
  const filtered = Array.isArray(rawRepos)
    ? rawRepos.filter((r: { fork: boolean }) => !r.fork).slice(0, 6)
    : [];
  return { repos: mapRepos(filtered), stats: await fetchLiveStats(username) };
}

export async function POST(request: NextRequest) {
  const token = extractToken(request);
  if (!token) return createErrorResponse("Unauthorized", 401);

  // Verify the caller. `getUser()` validates the JWT against Supabase rather than trusting
  // it, so a forged or expired token cannot get past this point.
  const authed = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return createErrorResponse("Unauthorized", 401);

  // Identity comes from the verified session, never the request body. This is what stops a
  // caller writing to someone else's profile, or scoring a different account as their own.
  const userId = user.id;
  const username = user.user_metadata?.user_name as string | undefined;
  if (!username)
    return createErrorResponse("No GitHub username on this account", 400);

  // The GitHub OAuth token is only available to the client (Supabase does not persist
  // provider tokens server-side), so it is passed in. It only ever widens the rate limit for
  // *this* user's own lookup — the username being scored comes from the session above, so a
  // borrowed token cannot be used to score someone else's account into this profile.
  let providerToken: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.providerToken === "string")
      providerToken = body.providerToken;
  } catch {
    // No body is fine — we fall back to the unauthenticated REST path.
  }

  let stats: ContributorStats;
  let repos: Repo[];
  try {
    if (providerToken) {
      try {
        const contributor = await fetchContributorProfile(
          username,
          providerToken,
        );
        ({ stats, repos } = contributorToScoreInputs(contributor));
      } catch {
        ({ stats, repos } = await statsFromRest(username));
      }
    } else {
      ({ stats, repos } = await statsFromRest(username));
    }
  } catch {
    return createErrorResponse("Could not read this account from GitHub", 502);
  }

  // Score the account and run the anti-gaming heuristic. A flagged account is persisted with
  // its reason (auditable, reversible) and stores the discounted score, so every surface that
  // reads `profiles.score` reflects the discount.
  const { score, anomaly } = scoreWithAnomalyCheck(stats, repos);
  const now = new Date().toISOString();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[profile/sync] service-role key missing");
    return createErrorResponse("Server misconfigured", 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      username,
      score,
      total_commits: stats.totalCommits,
      total_prs: stats.totalPRs,
      total_issues: stats.totalIssues,
      total_reviews: stats.totalReviews,
      flagged: anomaly.flagged,
      flag_reason: anomaly.reason,
      flagged_at: anomaly.flagged ? now : null,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[profile/sync] upsert failed:", error.message);
    return createErrorResponse("Could not save the profile", 500);
  }

  return createApiResponse({
    success: true,
    username,
    score,
    flagged: anomaly.flagged,
  });
}
