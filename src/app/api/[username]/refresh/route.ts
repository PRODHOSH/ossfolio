import { NextRequest } from "next/server";
import { sanitizeUsername, createApiResponse, createErrorResponse } from "@/lib/validators/api";
import { refreshProfile } from "@/lib/refresh-profile";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = sanitizeUsername(rawUsername);

  if (!username) {
    return createErrorResponse("Invalid GitHub username format", 400);
  }

  const result = await refreshProfile(username);

  switch (result.status) {
    case "refreshed":
      return createApiResponse({
        success: true,
        message: `Profile ${username} refresh triggered`,
        refreshedAt: new Date().toISOString(),
      });
    case "rate_limited":
      return createErrorResponse("Rate limited. Try again later.", 429, {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    case "not_found":
      return createErrorResponse("Profile not found", 404);
    case "error":
      return createErrorResponse("Failed to refresh profile", 500);
  }
}
