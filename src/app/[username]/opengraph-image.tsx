import { ImageResponse } from 'next/og';
import { getProfileByUsername } from '@/lib/db';
import { GITHUB_API_BASE } from '@/lib/constants';

// Runtime managed by @opennextjs/cloudflare

export const alt = 'OSSfolio Profile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface OGImageProps {
  params: Promise<{ username: string }>;
}

async function fetchGitHubUser(username: string) {
  const res = await fetch(`${GITHUB_API_BASE}/users/${username}`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return res.json();
}

let cachedFontsPromise: Promise<[ArrayBuffer, ArrayBuffer]> | null = null;

/**
 * Resets the in-memory font cache. Used for testing.
 */
export function resetFontCacheForTesting() {
  cachedFontsPromise = null;
}

/**
 * Fetches and caches the Inter font ArrayBuffers across reused edge worker isolations.
 */
export async function getInterFonts(): Promise<[ArrayBuffer, ArrayBuffer]> {
  if (cachedFontsPromise) {
    return cachedFontsPromise;
  }

  cachedFontsPromise = (async () => {
    try {
      // Fetch Inter font from the Google Fonts CSS API.
      const interFontData = await fetch(
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap',
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
          },
        },
      ).then((res) => res.text());

      // Extract font file URLs for weight 500 (medium) and weight 400 (regular)
      const mediumUrlMatch = interFontData.match(
        /font-weight:\s*500;[^}]*?src:\s*url\(([^)]+)\)/,
      );
      const regularUrlMatch = interFontData.match(
        /font-weight:\s*400;[^}]*?src:\s*url\(([^)]+)\)/,
      );

      const [interMedium, interRegular] = await Promise.all([
        fetch(
          mediumUrlMatch?.[1] ??
            'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50SjIa1ZL7.woff2',
        ).then((res) => res.arrayBuffer()),
        fetch(
          regularUrlMatch?.[1] ??
            'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fvbvMwCp50SjIa1ZL7.woff2',
        ).then((res) => res.arrayBuffer()),
      ]);

      return [interMedium, interRegular];
    } catch (err) {
      cachedFontsPromise = null;
      throw err;
    }
  })();

  return cachedFontsPromise;
}

export default async function OGImage({ params }: OGImageProps) {
  const { username } = await params;

  // Fetch fonts (uses in-memory cached ArrayBuffers across worker isolations)
  // alongside user data and stored profile summary in parallel
  const [[interMedium, interRegular], user, profileResult] = await Promise.all([
    getInterFonts(),
    fetchGitHubUser(username),
    getProfileByUsername(
      username,
      'score, total_commits, total_prs, total_issues, total_reviews, visibility',
    ),
  ]);

  // Fail closed. This previously did `.then((r) => r.data)`, which discards the error — and the
  // Supabase client resolves with `{ data: null, error }` rather than throwing, so any database
  // failure left `profileRow` null, the private check below passed, and a private profile got a
  // fully rendered, fully shareable social card.
  if (profileResult.error) {
    return new Response(null, { status: 404 });
  }

  const profileRow = profileResult.data;

  // A private profile has no page, so it must not have a social card either.
  if (profileRow?.visibility === 'private') {
    return new Response(null, { status: 404 });
  }

  const displayName = user?.name || username;
  const avatarUrl = user?.avatar_url || `https://github.com/${username}.png`;
  const score =
    profileRow && typeof profileRow.score === 'number' ? profileRow.score : 0;

  // Stored contribution totals. Rendered only when the profile has been synced —
  // an unsynced profile keeps the original avatar + score layout rather than
  // showing a row of zeroes.
  const statValue = (v: unknown) => (typeof v === 'number' ? v : null);
  const stats = [
    { label: 'Commits', value: statValue(profileRow?.total_commits) },
    { label: 'PRs', value: statValue(profileRow?.total_prs) },
    { label: 'Issues', value: statValue(profileRow?.total_issues) },
    { label: 'Reviews', value: statValue(profileRow?.total_reviews) },
  ].filter((s): s is { label: string; value: number } => s.value !== null);

  const response = new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        fontFamily: 'Inter',
        padding: '48px 64px',
      }}
    >
      {/* Top bar — logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {/* Emerald dot */}
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '9999px',
            backgroundColor: '#3ecf8e',
          }}
        />
        <span
          style={{
            fontSize: '24px',
            fontWeight: 500,
            color: '#171717',
            letterSpacing: '-0.42px',
          }}
        >
          OSSfolio
        </span>
      </div>

      {/* Main content area — avatar + name (left) and score card (right) */}
      <div
        style={{
          display: 'flex',
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '24px',
        }}
      >
        {/* Left: avatar + name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
          }}
        >
          {/* Avatar — circular */}
          <img
            src={avatarUrl}
            alt={`${displayName} avatar`}
            width={120}
            height={120}
            style={{
              borderRadius: '9999px',
              objectFit: 'cover',
            }}
          />
          {/* Name + username */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span
              style={{
                fontSize: '36px',
                fontWeight: 500,
                color: '#171717',
                letterSpacing: '-0.72px',
                lineHeight: 1.15,
              }}
            >
              {displayName}
            </span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 400,
                color: '#707070',
                lineHeight: 1.4,
              }}
            >
              @{username}
            </span>
          </div>
        </div>

        {/* Right: score card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #3ecf8e',
            borderRadius: '12px',
            padding: '20px 40px',
            minWidth: '180px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#707070',
              letterSpacing: '1.2px',
              textTransform: 'uppercase' as const,
              lineHeight: 1.45,
            }}
          >
            Contributor Score
          </span>
          <span
            style={{
              fontSize: '56px',
              fontWeight: 500,
              color: '#3ecf8e',
              lineHeight: 1.1,
              letterSpacing: '-1.44px',
              marginTop: '4px',
            }}
          >
            {score}
          </span>
        </div>
      </div>

      {/* Stored contribution stats — only when the profile has been synced */}
      {stats.length > 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '48px',
            marginTop: '8px',
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '30px',
                  fontWeight: 500,
                  color: '#171717',
                  lineHeight: 1.15,
                  letterSpacing: '-0.6px',
                }}
              >
                {stat.value.toLocaleString('en-US')}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#707070',
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase' as const,
                  lineHeight: 1.45,
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Bottom bar — URL + tagline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #dfdfdf',
          paddingTop: '20px',
          marginTop: '8px',
        }}
      >
        <span
          style={{
            fontSize: '16px',
            fontWeight: 400,
            color: '#707070',
            lineHeight: 1.5,
          }}
        >
          ossfolio.qzz.io/{username}
        </span>
        <span
          style={{
            fontSize: '16px',
            fontWeight: 400,
            color: '#707070',
            lineHeight: 1.5,
          }}
        >
          Your open-source identity, beyond GitHub.
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: 'Inter',
          data: interMedium,
          weight: 500,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: interRegular,
          weight: 400,
          style: 'normal',
        },
      ],
      headers: {
        'Cache-Control': 'public, immutable, max-age=31536000',
      },
    },
  );

  response.headers.set('Cache-Control', 'public, immutable, max-age=31536000');
  return response;
}
