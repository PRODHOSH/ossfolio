import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sanitizeUsername, createApiResponse, createErrorResponse } from "@/lib/validators/api";

export const runtime = "edge";

// Public, cross-origin REST endpoint for third-party consumers of a profile's
// aggregated score/stats. Reads are open because profiles are already publicly
// viewable; responses are cached at the edge to absorb load. A coarse per-IP
// rate limit (below) guards the read path so cache misses can't drive unbounded
// Supabase reads; globally-shared per-key limiting comes with the API-key
// follow-up (see the PR description).

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, If-None-Match, Cache-Control",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

// Coarse, best-effort per-IP rate limit for the public read path. This lives in
// the edge isolate's memory (not a globally-shared store), so it's a first line
// against naive floods and high-cardinality scraping that would otherwise hit
// Supabase on every cache miss — not a hard global guarantee. Proper globally-
// shared, per-key limits arrive with the API-key follow-up.
const RATE_LIMIT_MAX = 60; // requests per window, per IP, per isolate
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_KEYS = 10_000; // hard cap on tracked IPs to bound memory
let rateHits: Map<string, { count: number; resetAt: number }> | null = null;

function getRateHits(): Map<string, { count: number; resetAt: number }> {
  if (!rateHits) {
    rateHits = new Map();
  }
  return rateHits;
}

// Run periodic cleanup every 60 seconds in the background to evict stale
// entries and keep heap growth bounded even under sustained traffic.
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
function ensureCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const hits = getRateHits();
    if (hits.size === 0) return;
    const now = Date.now();
    for (const [key, value] of hits) {
      if (now >= value.resetAt) hits.delete(key);
    }
  }, 60_000);
  // Allow the process to exit even if the interval is still active.
  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

function getClientIp(request: NextRequest): string {
  // Prefer the platform-set header (unspoofable on Cloudflare) so a client can't
  // forge x-forwarded-for to bypass the limiter or inflate key cardinality.
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function checkRateLimit(ip: string): { limited: boolean; retryAfter: number } {
  ensureCleanup();

  const hits = getRateHits();
  const now = Date.now();

  // Prune expired entries, then enforce a hard cap so a flood of many unique
  // IPs can't grow the map without bound and OOM the isolate.
  if (hits.size > RATE_LIMIT_MAX_KEYS) {
    for (const [key, value] of hits) {
      if (now >= value.resetAt) hits.delete(key);
    }
    // Still at capacity after pruning: stop tracking new keys rather than grow.
    if (hits.size > RATE_LIMIT_MAX_KEYS && !hits.has(ip)) {
      return { limited: true, retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
    }
  }

  const entry = hits.get(ip);
  if (!entry || now >= entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return { limited: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { limited: false, retryAfter: 0 };
}

// Columns exposed publicly. Internal fields (id, visibility, view_count,
// search_text, timestamps) are deliberately excluded.
const PUBLIC_COLUMNS =
  "username, name, avatar_url, github_url, bio, headline, score, followers, " +
  "top_languages, total_commits, total_prs, total_issues, total_reviews, " +
  "badges, last_refreshed_at";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { limited, retryAfter } = checkRateLimit(getClientIp(request));
  if (limited) {
    const res = withCors(
      createErrorResponse("Rate limit exceeded. Please slow down.", 429, {
        retryAfterSeconds: retryAfter,
      })
    );
    res.headers.set("Retry-After", String(retryAfter));
    return res;
  }

  const { username: rawUsername } = await params;
  const username = sanitizeUsername(rawUsername);

  if (!username) {
    return withCors(createErrorResponse("Invalid username format", 400));
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_COLUMNS)
    .eq("username", username)
    .eq("visibility", "public")
    .maybeSingle();

  if (error) {
    return withCors(createErrorResponse("Failed to fetch profile", 502));
  }

  // No row means either the username doesn't exist or the profile is unlisted.
  // We return the same 404 for both so the API never reveals that an unlisted
  // profile exists.
  if (!data) {
    return withCors(createErrorResponse("Profile not found", 404));
  }

  const profile = data as unknown as {
    username: string;
    name: string | null;
    avatar_url: string | null;
    github_url: string | null;
    bio: string | null;
    headline: string | null;
    score: number;
    followers: number;
    top_languages: string[];
    total_commits: number;
    total_prs: number;
    total_issues: number;
    total_reviews: number;
    badges: unknown;
    last_refreshed_at: string | null;
  };

  const body = {
    username: profile.username,
    name: profile.name,
    avatar_url: profile.avatar_url,
    github_url: profile.github_url,
    bio: profile.bio,
    headline: profile.headline,
    score: profile.score,
    followers: profile.followers,
    top_languages: profile.top_languages,
    stats: {
      commits: profile.total_commits,
      prs: profile.total_prs,
      issues: profile.total_issues,
      reviews: profile.total_reviews,
    },
    badges: profile.badges,
    last_refreshed_at: profile.last_refreshed_at,
  };

  return withCors(
    createApiResponse(body, 200, {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    })
  );
}
