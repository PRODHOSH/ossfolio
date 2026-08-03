import { NextRequest } from "next/server";
import { fetchGoodFirstIssues } from "@/lib/good-first-issues";
import { createApiResponse, createErrorResponse } from "@/lib/validators/api";

// Runtime managed by @opennextjs/cloudflare

/** GET /api/good-first-issues - Fetches beginner open-source issues */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || undefined;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "15", 10), 1),
      50,
    );

    const issues = await fetchGoodFirstIssues(language, limit);

    return createApiResponse({
      success: true,
      count: issues.length,
      issues,
    });
  } catch (err) {
    console.error("[api/good-first-issues] GET error:", err);
    return createErrorResponse("Could not load good first issues", 500);
  }
}
