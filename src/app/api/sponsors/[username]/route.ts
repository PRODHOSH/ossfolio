import { NextResponse } from 'next/server';
import { getSponsorshipData } from '@/lib/sponsors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  if (!username) {
    return NextResponse.json(
      { error: 'Username parameter is required' },
      { status: 400 },
    );
  }

  try {
    const data = await getSponsorshipData(username);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      },
    });
  } catch (err) {
    console.error('Failed to fetch sponsorship data:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
