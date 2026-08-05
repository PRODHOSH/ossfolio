import { NextRequest } from 'next/server';
import { fetchUserGists } from '@/lib/gists';
import { createApiResponse, createErrorResponse } from '@/lib/validators/api';

// Runtime managed by @opennextjs/cloudflare

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

/** GET /api/[username]/gists - Returns public Gists for a user */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { username } = await params;
    if (!username) {
      return createErrorResponse('Username is required', 400);
    }

    const gists = await fetchUserGists(username);

    return createApiResponse({
      success: true,
      username,
      count: gists.length,
      gists,
    });
  } catch (err) {
    console.error('[api/[username]/gists] GET error:', err);
    return createErrorResponse('Could not load user gists', 500);
  }
}
