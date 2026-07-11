import { NextRequest } from "next/server";
import { fetchContributionCalendar } from "@/lib/github";
import { sanitizeUsername, validateYear, createApiResponse, createErrorResponse } from "@/lib/validators/api";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = sanitizeUsername(rawUsername);

  if (!username) {
    return createErrorResponse("Invalid username format", 400);
  }

  const yearParam = request.nextUrl.searchParams.get("year");
  let from: string | undefined;

  if (yearParam !== null) {
    const year = validateYear(yearParam);
    if (year === null) {
      return createErrorResponse("Invalid year parameter. Must be a valid year within the last 10 years.", 400);
    }
    from = `${year}-01-01`;
  }

  const calendar = await fetchContributionCalendar(username, from);

  if (!calendar) {
    return createErrorResponse("Failed to fetch contribution data", 502);
  }

  return createApiResponse(calendar, 200, {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
  });
}
