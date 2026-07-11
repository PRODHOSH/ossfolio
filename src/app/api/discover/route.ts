import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { sanitizeString } from "@/lib/sanitizer";
import { validatePagination, validateSortBy, createApiResponse, createErrorResponse } from "@/lib/validators/api";

export const runtime = "edge";

const PAGE_SIZE = 20;
const MAX_PAGE = 50;
const VALID_SORT = ["score", "contributions", "followers", "improvement"] as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = sanitizeString(searchParams.get("q"), 100);
  const lang = sanitizeString(searchParams.get("lang"), 50);
  const rawMinScore = searchParams.get("min_score") || "0";
  const minScore = Math.min(2147483647, Math.max(0, parseInt(rawMinScore, 10) || 0));
  const sortBy = validateSortBy(searchParams.get("sort"), VALID_SORT, "score");

  const { page } = validatePagination(searchParams.get("page"), null, MAX_PAGE);
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const { data, error } = await supabase.rpc("search_profiles", {
      query,
      lang,
      min_score: minScore,
      sort_by: sortBy,
      page_size: PAGE_SIZE + 1,
      page_offset: offset,
    });

    if (error) {
      console.error("[discover] search_profiles RPC error:", error);
      return createErrorResponse("Failed to fetch profiles", 500);
    }

    const results = (data || []) as Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      bio: string | null;
      score: number;
      total_prs: number;
      total_commits: number;
      total_issues: number;
      followers: number;
      top_languages: string[];
      score_delta_30_days: number;
    }>;

    const hasNext = page < MAX_PAGE && results.length > PAGE_SIZE;
    const profiles = results.slice(0, PAGE_SIZE);

    return createApiResponse({
      profiles,
      page,
      hasNext,
      hasPrev: page > 1,
    });
  } catch {
    return createErrorResponse("Internal server error", 500);
  }
}
