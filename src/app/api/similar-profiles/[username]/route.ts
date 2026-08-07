import { type NextRequest, NextResponse } from "next/server";
import { findSimilarProfiles } from "@/lib/db";

// Runtime managed by @opennextjs/cloudflare

interface RouteParams {
  params: Promise<{ username: string }>;
}

/**
 * GET /api/similar-profiles/[username]
 *
 * Returns up to 6 public OSSfolio profiles that are similar to [username],
 * ranked by shared top languages (+2 pts) and shared GitHub orgs (+3 pts).
 *
 * Always returns `{ profiles: [] }` on any error so the profile page degrades
 * gracefully — it never breaks because the RPC is absent or returns an error.
 *
 * Cached at the CDN edge for 5 minutes (s-maxage=300). Similarity is derived
 * from profile data that is refreshed on a similar cadence, so 5 min is fine.
 */
export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { username } = await params;

  if (!username || typeof username !== "string") {
    return NextResponse.json({ profiles: [] }, { status: 400 });
  }

  const { data, error } = await findSimilarProfiles(username);

  if (error || !Array.isArray(data)) {
    // Graceful degradation — log but never surface an error to the caller.
    if (error) {
      console.error(
        `[similar-profiles] RPC error for "${username}":`,
        error.message,
      );
    }
    return NextResponse.json(
      { profiles: [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      },
    );
  }

  return NextResponse.json(
    { profiles: data },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    },
  );
}
