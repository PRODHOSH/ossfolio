import { NextRequest } from 'next/server';
import {
  fetchProfileViewCount,
  incrementProfileView,
} from '@/lib/profile-views';
import { checkRateLimit } from '@/lib/rate-limit';
import { createApiResponse, createErrorResponse } from '@/lib/validators/api';

// Runtime managed by @opennextjs/cloudflare

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/** GET /api/[username]/view - Returns current profile view count */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { username } = await params;
    if (!username) {
      return createErrorResponse('Username is required', 400);
    }

    const viewCount = await fetchProfileViewCount(username);

    return createApiResponse({
      success: true,
      username,
      viewCount,
    });
  } catch (err) {
    console.error('[api/[username]/view] GET error:', err);
    return createErrorResponse('Could not load view count', 500);
  }
}

/** POST /api/[username]/view - Rate-limited endpoint to increment view count */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { username } = await params;
    if (!username) {
      return createErrorResponse('Username is required', 400);
    }

    const ip = getClientIp(request);
    const rateLimitKey = `view-count:${ip}:${username.toLowerCase()}`;

    // Rate limit: max 10 view records per IP per profile per minute to prevent spam
    const allowed = await checkRateLimit(rateLimitKey, {
      maxRequests: 10,
      windowMs: 60000,
    });
    if (!allowed) {
      const currentCount = await fetchProfileViewCount(username);
      return createApiResponse({
        success: true,
        username,
        viewCount: currentCount,
        rateLimited: true,
      });
    }

    const updatedCount = await incrementProfileView(username);

    return createApiResponse({
      success: true,
      username,
      viewCount: updatedCount,
    });
  } catch (err) {
    console.error('[api/[username]/view] POST error:', err);
    return createErrorResponse('Error recording profile view', 500);
  }
}
