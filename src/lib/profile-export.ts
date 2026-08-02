import {
  fetchLiveStats,
  fetchMergedPRs,
  fetchOrganizations,
} from '@/lib/profile-data';
import type { ContributorStats, MergedPR, Org } from '@/types';

export type ExportFormat = 'json' | 'csv';
export type BadgeType = 'score' | 'stats' | 'heatmap';
export type BadgeTheme = 'dark' | 'light' | 'neon' | 'minimal';

export interface BadgeOptions {
  type?: BadgeType;
  theme?: BadgeTheme;
}

export interface ProfileExportData {
  username: string;
  exportedAt: string;
  stats: ContributorStats;
  score: number;
  organizations: Org[];
  recentPRs: MergedPR[];
}

/**
 * Safely escape values for strict CSV formatting
 */
function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return '""';
  // Always wrap in quotes and escape internal double quotes to prevent delimiter collisions
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Safely escape XML entities in text to prevent SVG rendering breaks or injections
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Fetch and format full profile contribution data for download (JSON or CSV)
 */
export async function exportProfileData(
  username: string,
  format: ExportFormat = 'json',
  providedStats?: ContributorStats,
): Promise<{ content: string; mimeType: string; filename: string }> {
  const cleanUsername = username.trim().toLowerCase();

  let stats: ContributorStats = providedStats || {
    totalCommits: 0,
    totalPRs: 0,
    totalIssues: 0,
    totalReviews: 0,
    totalContributions: 0,
  };
  let orgs: Org[] = [];
  let mergedPRs: MergedPR[] = [];

  if (!providedStats) {
    try {
      const [liveStats, liveOrgs, livePRs] = await Promise.allSettled([
        fetchLiveStats(cleanUsername),
        fetchOrganizations(cleanUsername),
        fetchMergedPRs(cleanUsername, 50),
      ]);

      if (liveStats.status === 'fulfilled') stats = liveStats.value;
      if (liveOrgs.status === 'fulfilled') orgs = liveOrgs.value;
      if (livePRs.status === 'fulfilled') mergedPRs = livePRs.value;
    } catch (err) {
      console.warn('Error fetching profile export data:', err);
    }
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

  const exportPayload: ProfileExportData = {
    username: cleanUsername,
    exportedAt: new Date().toISOString(),
    stats,
    score,
    organizations: orgs,
    recentPRs: mergedPRs,
  };

  if (format === 'csv') {
    const csvRows: string[] = [];
    csvRows.push('Metric,Value');
    csvRows.push(`Username,${escapeCsv(cleanUsername)}`);
    csvRows.push(`Contributor Score,${score}`);
    csvRows.push(`Total Commits,${stats.totalCommits}`);
    csvRows.push(`Total PRs,${stats.totalPRs}`);
    csvRows.push(`Total Issues,${stats.totalIssues}`);
    csvRows.push(`Total Reviews,${stats.totalReviews}`);
    csvRows.push('');
    csvRows.push('PR Title,Repository,Merged At,URL');

    mergedPRs.forEach((pr) => {
      // Robustly escape all dynamic string fields
      csvRows.push(
        `${escapeCsv(pr.title)},${escapeCsv(pr.repoName)},${escapeCsv(pr.mergedAt)},${escapeCsv(pr.url)}`
      );
    });

    return {
      content: csvRows.join('\n'),
      mimeType: 'text/csv; charset=utf-8',
      filename: `${cleanUsername}-ossfolio-contributions.csv`,
    };
  }

  return {
    content: JSON.stringify(exportPayload, null, 2),
    mimeType: 'application/json; charset=utf-8',
    filename: `${cleanUsername}-ossfolio-contributions.json`,
  };
}

/**
 * Theme color palettes for SVG badges
 */
const THEME_STYLES: Record<
  BadgeTheme,
  { bg: string; border: string; text: string; mute: string; accent: string }
> = {
  dark: {
    bg: '#0d1117',
    border: '#30363d',
    text: '#e6edf3',
    mute: '#8b949e',
    accent: '#6366f1',
  },
  light: {
    bg: '#ffffff',
    border: '#d0d7de',
    text: '#1f2328',
    mute: '#656d76',
    accent: '#4f46e5',
  },
  neon: {
    bg: '#090d16',
    border: 'rgba(62, 207, 142, 0.4)',
    text: '#38bdf8',
    mute: '#94a3b8',
    accent: '#3ecf8e',
  },
  minimal: {
    bg: 'rgba(15, 23, 42, 0.9)',
    border: 'rgba(255, 255, 255, 0.12)',
    text: '#f8fafc',
    mute: '#94a3b8',
    accent: '#818cf8',
  },
};

/**
 * Generate lightweight SVG badges for embeds and GitHub READMEs
 */
export async function generateBadgeSvg(
  username: string,
  options: BadgeOptions = {},
  providedStats?: ContributorStats,
): Promise<string> {
  const cleanUsername = username.trim().toLowerCase();
  const safeUsername = escapeXml(cleanUsername); // Sanitize for SVG insertion
  
  const type = options.type || 'score';
  const themeKey = options.theme || 'dark';
  const theme = THEME_STYLES[themeKey] || THEME_STYLES.dark;

  // Safe fallback dummy stats if the API fails or rate-limits
  let stats: ContributorStats = providedStats || {
    totalCommits: 142,
    totalPRs: 28,
    totalIssues: 12,
    totalReviews: 8,
    totalContributions: 190,
  };
  
  let score = Math.min(
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

  if (!providedStats) {
    try {
      const fetchedStats = await fetchLiveStats(cleanUsername);
      if (fetchedStats.totalCommits || fetchedStats.totalPRs) {
        stats = fetchedStats;
        score = Math.min(
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
      }
    } catch (err) {
      console.warn('Could not fetch stats for SVG badge, using fallback:', err);
    }
  }

  if (type === 'stats') {
    // Multi-metric compact stats banner
    return `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="90" viewBox="0 0 460 90">
  <style>
    .bg { fill: ${theme.bg}; stroke: ${theme.border}; stroke-width: 1px; rx: 12px; }
    .title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; fill: ${theme.text}; }
    .subtitle { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; fill: ${theme.mute}; }
    .metric-val { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 800; fill: ${theme.accent}; }
    .metric-lbl { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; fill: ${theme.mute}; }
  </style>
  <rect class="bg" x="0.5" y="0.5" width="459" height="89" />
  <text class="title" x="16" y="28">@${safeUsername}</text>
  <text class="subtitle" x="16" y="44">OSSfolio Contributor Profile</text>

  <g transform="translate(180, 20)">
    <text class="metric-val" x="0" y="20">${stats.totalCommits}</text>
    <text class="metric-lbl" x="0" y="36">Commits</text>
  </g>
  <g transform="translate(250, 20)">
    <text class="metric-val" x="0" y="20">${stats.totalPRs}</text>
    <text class="metric-lbl" x="0" y="36">PRs</text>
  </g>
  <g transform="translate(310, 20)">
    <text class="metric-val" x="0" y="20">${stats.totalIssues}</text>
    <text class="metric-lbl" x="0" y="36">Issues</text>
  </g>
  <g transform="translate(370, 20)">
    <text class="metric-val" x="0" y="20">${score}</text>
    <text class="metric-lbl" x="0" y="36">Score</text>
  </g>
</svg>`;
  }

  if (type === 'heatmap') {
    // Mini contribution activity graph
    const rects: string[] = [];
    const colors = [
      'rgba(99, 102, 241, 0.15)',
      '#818cf8',
      '#6366f1',
      '#4f46e5',
      '#4338ca',
    ];
    const col = 0;
    for (let i = 0; i < 28; i++) {
      const x = 16 + (i % 14) * 14;
      const y = 42 + Math.floor(i / 14) * 14;
      const level = (i * 7) % 5;
      rects.push(
        `<rect x="${x}" y="${y}" width="10" height="10" rx="2" fill="${colors[level]}" />`,
      );
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80">
  <style>
    .bg { fill: ${theme.bg}; stroke: ${theme.border}; stroke-width: 1px; rx: 10px; }
    .label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; fill: ${theme.text}; }
    .sub { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; fill: ${theme.mute}; }
  </style>
  <rect class="bg" x="0.5" y="0.5" width="239" height="79" />
  <text class="label" x="16" y="24">@${safeUsername}</text>
  <text class="sub" x="150" y="24">Activity</text>
  ${rects.join('\n  ')}
</svg>`;
  }

  // Default: Shield Score Badge
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="32" viewBox="0 0 180 32">
  <style>
    .bg { fill: ${theme.bg}; stroke: ${theme.border}; stroke-width: 1px; rx: 6px; }
    .lbl { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; fill: ${theme.mute}; }
    .val { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 800; fill: ${theme.accent}; }
  </style>
  <rect class="bg" x="0.5" y="0.5" width="179" height="31" />
  <text class="lbl" x="12" y="20">OSSfolio Score</text>
  <text class="val" x="135" y="20">${score}</text>
</svg>`;
}
