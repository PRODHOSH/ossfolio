import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchLiveStats } from '@/lib/profile-data';
import type { ContributorStats } from '@/types';

interface EmbedPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{
    theme?: string;
    compact?: string;
    showHeatmap?: string;
  }>;
}

export async function generateMetadata({
  params,
}: EmbedPageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `OSSfolio Embed Card - ${username}`,
    description: `Embedded contribution widget for ${username}`,
  };
}

export default async function EmbedPage({
  params,
  searchParams,
}: EmbedPageProps) {
  const { username } = await params;
  const { theme, compact, showHeatmap } = await searchParams;

  if (!username) {
    notFound();
  }

  const isLight = theme === 'light';
  const isCompact = compact === 'true';
  const displayHeatmap = showHeatmap !== 'false';

  let stats: ContributorStats = {
    totalCommits: 0,
    totalPRs: 0,
    totalIssues: 0,
    totalReviews: 0,
    totalContributions: 0,
  };

  try {
    stats = await fetchLiveStats(username);
  } catch (err) {
    console.warn('Failed to fetch live stats for embed:', err);
  }

  const score = Math.min(
    99,
    Math.max(
      30,
      Math.floor(
        stats.totalCommits * 0.1 +
          stats.totalPRs * 2 +
          stats.totalIssues * 1.5 +
          50,
      ),
    ),
  );

  const bgColor = isLight ? '#ffffff' : '#0d1117';
  const textColor = isLight ? '#1f2328' : '#f8fafc';
  const muteColor = isLight ? '#656d76' : '#94a3b8';
  const borderColor = isLight ? '#d0d7de' : 'rgba(255, 255, 255, 0.12)';
  const cardBg = isLight ? '#f6f8fa' : 'rgba(255, 255, 255, 0.04)';

  // Dummy mini heatmap grid blocks
  const heatmapBlocks = Array.from({ length: 42 }, (_, i) => (i * 7) % 5);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: isCompact ? '120px' : '220px',
        backgroundColor: bgColor,
        color: textColor,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        borderRadius: '14px',
        border: `1px solid ${borderColor}`,
        padding: isCompact ? '14px' : '20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* User Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={`https://github.com/${encodeURIComponent(username)}.png`}
            alt={username}
            style={{
              width: isCompact ? '36px' : '48px',
              height: isCompact ? '36px' : '48px',
              borderRadius: '50%',
              border: '2px solid #6366f1',
              objectFit: 'cover',
            }}
          />
          <div>
            <div
              style={{
                fontSize: isCompact ? '15px' : '18px',
                fontWeight: 700,
                margin: 0,
              }}
            >
              @{username}
            </div>
            <div
              style={{ fontSize: '12px', color: muteColor, marginTop: '2px' }}
            >
              OSSfolio Contributor
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            color: '#818cf8',
            fontSize: '12px',
            fontWeight: 700,
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          Score: {score}
        </div>
      </div>

      {/* Stats Summary Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          margin: isCompact ? '12px 0 0 0' : '16px 0',
        }}
      >
        <div
          style={{
            backgroundColor: cardBg,
            padding: '8px 10px',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700 }}>
            {stats.totalCommits}
          </div>
          <div style={{ fontSize: '10px', color: muteColor }}>Commits</div>
        </div>
        <div
          style={{
            backgroundColor: cardBg,
            padding: '8px 10px',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700 }}>
            {stats.totalPRs}
          </div>
          <div style={{ fontSize: '10px', color: muteColor }}>PRs</div>
        </div>
        <div
          style={{
            backgroundColor: cardBg,
            padding: '8px 10px',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700 }}>
            {stats.totalIssues}
          </div>
          <div style={{ fontSize: '10px', color: muteColor }}>Issues</div>
        </div>
      </div>

      {/* Mini Heatmap if enabled */}
      {!isCompact && displayHeatmap && (
        <div style={{ marginTop: '12px' }}>
          <div
            style={{ fontSize: '11px', color: muteColor, marginBottom: '6px' }}
          >
            Recent Activity
          </div>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {heatmapBlocks.map((lvl, idx) => (
              <div
                key={idx}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor:
                    lvl === 0
                      ? isLight
                        ? '#ebedf0'
                        : 'rgba(255, 255, 255, 0.08)'
                      : lvl === 1
                        ? '#a5b4fc'
                        : lvl === 2
                          ? '#818cf8'
                          : lvl === 3
                            ? '#6366f1'
                            : '#4f46e5',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
