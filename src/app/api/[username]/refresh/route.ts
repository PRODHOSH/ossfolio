import { NextRequest } from 'next/server';
import {
  sanitizeUsername,
  createApiResponse,
  createErrorResponse,
} from '@/lib/validators/api';
import { refreshProfile } from '@/lib/refresh-profile';
import { checkRefreshRateLimit } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  // Limit the caller before doing anything else — before the username is even looked at.
  //
  // This has to come first, because the existing per-username limit inside refreshProfile()
  // cannot see the two attacks that matter here. A caller can rotate the username to get a
  // fresh bucket each time, and a username that doesn't exist gets no limit recorded at all
  // (there's no row to record it on), so `/api/{random}/refresh` is unbounded today at two
  // database queries a go. Both are anonymous — this endpoint takes no auth.
  //
  // Limiting per IP up here closes both, and it means a rejected request costs us a single
  // Redis round-trip instead of two database queries.
  const rateLimit = await checkRefreshRateLimit(request);
  if (!rateLimit.allowed) {
    return createErrorResponse(
      'Too many refresh requests. Please try again shortly.',
      429,
      { retryAfterSeconds: rateLimit.retryAfterSeconds },
      { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    );
  }

  const { username: rawUsername } = await params;
  const username = sanitizeUsername(rawUsername);

  if (!username) {
    return createErrorResponse('Invalid GitHub username format', 400);
  }

  const result = await refreshProfile(username);

  switch (result.status) {
    case 'refreshed':
      return createApiResponse({
        success: true,
        message: `Profile ${username} refresh triggered`,
        refreshedAt: new Date().toISOString(),
      });
    case 'rate_limited':
      return createErrorResponse('Rate limited. Try again later.', 429, {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    case 'not_found':
      return createErrorResponse('Profile not found', 404);
    case 'error':
      return createErrorResponse('Failed to refresh profile', 500);
  }
}
