import { createApiResponse, createErrorResponse } from '@/lib/validators/api';
import { getSponsorshipData } from '@/lib/sponsors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  if (!username) {
    return createErrorResponse('Username parameter is required', 400);
  }

  try {
    const data = await getSponsorshipData(username);
    return createApiResponse(data, 200, {
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    });
  } catch (err) {
    console.error('Failed to fetch sponsorship data:', err);
    return createErrorResponse('Internal server error', 500);
  }
}
