import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  fetchProfileEndorsements,
  toggleEndorsement,
} from '@/lib/endorsements';
import { createApiResponse, createErrorResponse } from '@/lib/validators/api';

// Runtime managed by @opennextjs/cloudflare

function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };
}

function extractToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

/** GET /api/profile/endorse?username=octocat - Fetches skill endorsements for a user */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    if (!username) {
      return createErrorResponse('Missing username parameter', 400);
    }

    // Optional user token to compute userHasEndorsed flag
    let currentUserId: string | null = null;
    const token = extractToken(request);
    if (token) {
      const { url, anonKey } = getSupabaseEnv();
      const authed = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const {
        data: { user },
      } = await authed.auth.getUser();
      if (user) {
        currentUserId = user.id;
      }
    }

    const endorsements = await fetchProfileEndorsements(
      username,
      currentUserId,
    );

    return createApiResponse({
      success: true,
      username,
      endorsements,
    });
  } catch (err) {
    console.error('[api/profile/endorse] GET error:', err);
    return createErrorResponse('Could not load endorsements', 500);
  }
}

/** POST /api/profile/endorse - Toggles endorsement for a skill */
export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (!token) {
      return createErrorResponse(
        'Unauthorized - please sign in to endorse skills',
        401,
      );
    }

    const { url, anonKey } = getSupabaseEnv();
    const authed = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { username, skill, profileUserId } = body || {};

    if (!username || !skill) {
      return createErrorResponse(
        'Missing required fields (username, skill)',
        400,
      );
    }

    const result = await toggleEndorsement(
      user.id,
      username,
      profileUserId ?? null,
      skill,
      token,
    );

    if (!result.success) {
      return createErrorResponse(
        result.error || 'Failed to update endorsement',
        400,
      );
    }

    const updatedEndorsements = await fetchProfileEndorsements(
      username,
      user.id,
    );

    return createApiResponse({
      success: true,
      action: result.action,
      skill,
      endorsements: updatedEndorsements,
    });
  } catch (err) {
    console.error('[api/profile/endorse] POST error:', err);
    return createErrorResponse('Error processing endorsement', 500);
  }
}
