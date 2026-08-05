import { generateBadgeSvg, BadgeType, BadgeTheme } from '@/lib/profile-export';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);

  const typeParam = searchParams.get('type');
  const themeParam = searchParams.get('theme');

  const type: BadgeType =
    typeParam === 'stats'
      ? 'stats'
      : typeParam === 'heatmap'
        ? 'heatmap'
        : 'score';
  const theme: BadgeTheme =
    themeParam === 'light'
      ? 'light'
      : themeParam === 'neon'
        ? 'neon'
        : themeParam === 'minimal'
          ? 'minimal'
          : 'dark';

  if (!username) {
    return new Response('Username parameter is required', { status: 400 });
  }

  try {
    const svg = await generateBadgeSvg(username, { type, theme });

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err) {
    console.error('Failed to generate badge SVG:', err);
    return new Response('Failed to generate badge SVG', { status: 500 });
  }
}
