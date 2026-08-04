import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchGitLabStats } from "@/lib/providers/gitlab";
import { fetchBitbucketStats } from "@/lib/providers/bitbucket";
import { aggregateMultiPlatformStats } from "@/lib/providers/aggregator";
import { createApiResponse, createErrorResponse } from "@/lib/validators/api";

// Runtime managed by @opennextjs/cloudflare

function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

function extractToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

/** GET /api/profile/providers?username=octocat - Fetches linked provider accounts & stats */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return createErrorResponse("Username parameter is required", 400);
    }

    const { url, anonKey } = getSupabaseEnv();
    const db = createClient(url, anonKey);

    const { data: profile } = await db
      .from("profiles")
      .select("username, gitlab_username, bitbucket_username, provider_stats")
      .eq("username", username.toLowerCase())
      .single();

    return createApiResponse({
      success: true,
      username,
      gitlabUsername: profile?.gitlab_username || null,
      bitbucketUsername: profile?.bitbucket_username || null,
      providerStats: profile?.provider_stats || {},
    });
  } catch (err) {
    console.error("[api/profile/providers] GET error:", err);
    return createErrorResponse("Could not load provider integrations", 500);
  }
}

/** POST /api/profile/providers - Links GitLab / Bitbucket accounts */
export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (!token) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { url, anonKey } = getSupabaseEnv();
    const authed = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user } } = await authed.auth.getUser();
    if (!user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const { gitlabUsername, bitbucketUsername } = body || {};

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const admin = serviceKey ? createClient(url, serviceKey) : authed;

    // Fetch stats for linked providers
    const gitlabData = gitlabUsername ? await fetchGitLabStats(gitlabUsername) : undefined;
    const bitbucketData = bitbucketUsername ? await fetchBitbucketStats(bitbucketUsername) : undefined;

    const aggregated = aggregateMultiPlatformStats(
      { stats: { totalCommits: 0, totalPRs: 0, totalIssues: 0, totalReviews: 0, totalContributions: 0 }, repos: [] },
      gitlabData,
      bitbucketData,
    );

    const { error } = await admin
      .from("profiles")
      .update({
        gitlab_username: gitlabUsername || null,
        bitbucket_username: bitbucketUsername || null,
        provider_stats: aggregated.providerStats,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("[api/profile/providers] update error:", error.message);
      return createErrorResponse("Could not update provider accounts", 500);
    }

    return createApiResponse({
      success: true,
      gitlabUsername: gitlabUsername || null,
      bitbucketUsername: bitbucketUsername || null,
      providerStats: aggregated.providerStats,
    });
  } catch (err) {
    console.error("[api/profile/providers] POST error:", err);
    return createErrorResponse("Error linking provider accounts", 500);
  }
}
