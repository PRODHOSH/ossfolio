import { NextRequest } from 'next/server';
import { getProfileSnapshot } from '@/lib/profile-snapshot';
import { generateOpenSourceStory } from '@/lib/open-source-story';
import { createApiResponse, createErrorResponse } from '@/lib/validators/api';

// Runtime managed by @opennextjs/cloudflare

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

/**
 * GET /api/[username]/story - Returns generated Year in Open Source Story
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { username } = await params;
    if (!username) {
      return createErrorResponse('Username is required', 400);
    }

    const snapshot = await getProfileSnapshot(username);
    if (!snapshot) {
      return createErrorResponse('Profile not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format'); // "markdown" | "json"

    const snap = snapshot as any;

    const story = generateOpenSourceStory(
      snap.username ?? username,
      snap.stats,
      snap.repos,
      snap.score ?? 0,
    );

    if (format === 'markdown') {
      return new Response(story.markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control':
            'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }

    return createApiResponse({
      success: true,
      story,
    });
  } catch (err) {
    console.error('[api/[username]/story] GET error:', err);
    return createErrorResponse('Could not generate open source story', 500);
  }
}
