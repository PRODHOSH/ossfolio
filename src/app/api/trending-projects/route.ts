import { NextRequest } from 'next/server';
import {
  fetchTrendingProjects,
  syncTrendingProjects,
} from '@/lib/trending-projects';
import { createApiResponse, createErrorResponse } from '@/lib/validators/api';

// Runtime managed by @opennextjs/cloudflare

/** GET /api/trending-projects - Returns list of trending open-source projects */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '6', 10), 1),
      20,
    );

    const projects = await fetchTrendingProjects(limit);

    return createApiResponse({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (err) {
    console.error('[api/trending-projects] GET error:', err);
    return createErrorResponse('Could not load trending projects', 500);
  }
}

/** POST /api/trending-projects - Triggers background aggregation sync */
export async function POST() {
  try {
    const result = await syncTrendingProjects();
    if (!result.success) {
      return createErrorResponse('Failed to sync trending projects', 500);
    }

    return createApiResponse({
      success: true,
      message: 'Trending projects updated successfully',
      syncedCount: result.count,
    });
  } catch (err) {
    console.error('[api/trending-projects] POST error:', err);
    return createErrorResponse('Error syncing trending projects', 500);
  }
}
