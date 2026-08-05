import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export interface GoodFirstIssue {
  id: string;
  title: string;
  url: string;
  repoName: string;
  repoUrl: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  language: string | null;
}

export const CURATED_REPOS = [
  'facebook/react',
  'vercel/next.js',
  'shadcn-ui/ui',
  'tailwindlabs/tailwindcss',
  'supabase/supabase',
  'astral-sh/uv',
  'expressjs/express',
  'pallets/flask',
];

export const FALLBACK_GOOD_FIRST_ISSUES: GoodFirstIssue[] = [
  {
    id: 'issue-1',
    title: 'Docs: Clarify installation steps for Next.js App Router template',
    url: 'https://github.com/vercel/next.js/issues/10001',
    repoName: 'vercel/next.js',
    repoUrl: 'https://github.com/vercel/next.js',
    labels: ['good first issue', 'documentation'],
    createdAt: '2026-05-10T12:00:00Z',
    updatedAt: '2026-05-12T14:30:00Z',
    commentsCount: 3,
    language: 'TypeScript',
  },
  {
    id: 'issue-2',
    title:
      'feat(ui): Add dark mode toggle accessibility aria-label to Button component',
    url: 'https://github.com/shadcn-ui/ui/issues/4021',
    repoName: 'shadcn-ui/ui',
    repoUrl: 'https://github.com/shadcn-ui/ui',
    labels: ['good first issue', 'help wanted', 'a11y'],
    createdAt: '2026-05-11T09:15:00Z',
    updatedAt: '2026-05-14T11:00:00Z',
    commentsCount: 5,
    language: 'TypeScript',
  },
  {
    id: 'issue-3',
    title:
      'fix(cli): Improve error message formatting when package config is missing',
    url: 'https://github.com/astral-sh/uv/issues/2105',
    repoName: 'astral-sh/uv',
    repoUrl: 'https://github.com/astral-sh/uv',
    labels: ['good first issue', 'cli'],
    createdAt: '2026-05-08T16:20:00Z',
    updatedAt: '2026-05-13T10:00:00Z',
    commentsCount: 2,
    language: 'Rust',
  },
  {
    id: 'issue-4',
    title: 'fix(auth): Add typed error code for expired magic link tokens',
    url: 'https://github.com/supabase/supabase/issues/8831',
    repoName: 'supabase/supabase',
    repoUrl: 'https://github.com/supabase/supabase',
    labels: ['good first issue', 'help wanted', 'auth'],
    createdAt: '2026-05-09T18:45:00Z',
    updatedAt: '2026-05-14T08:30:00Z',
    commentsCount: 4,
    language: 'TypeScript',
  },
  {
    id: 'issue-5',
    title: 'docs: Add Python type annotations example to CLI tutorial',
    url: 'https://github.com/pallets/flask/issues/5210',
    repoName: 'pallets/flask',
    repoUrl: 'https://github.com/pallets/flask',
    labels: ['good first issue', 'documentation'],
    createdAt: '2026-05-07T11:10:00Z',
    updatedAt: '2026-05-10T15:20:00Z',
    commentsCount: 1,
    language: 'Python',
  },
  {
    id: 'issue-6',
    title: 'fix(css): Fix grid container auto-fill layout gap calculation',
    url: 'https://github.com/tailwindlabs/tailwindcss/issues/12099',
    repoName: 'tailwindlabs/tailwindcss',
    repoUrl: 'https://github.com/tailwindlabs/tailwindcss',
    labels: ['good first issue', 'css'],
    createdAt: '2026-05-12T10:00:00Z',
    updatedAt: '2026-05-14T16:45:00Z',
    commentsCount: 6,
    language: 'TypeScript',
  },
];

let cachedIssues: GoodFirstIssue[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function fetchGoodFirstIssues(
  language?: string,
  limit = 15,
): Promise<GoodFirstIssue[]> {
  const now = Date.now();
  let issues: GoodFirstIssue[] = [];

  // Check in-memory cache first
  if (cachedIssues && now - lastFetchTime < CACHE_TTL_MS) {
    issues = cachedIssues;
  } else {
    try {
      // Query GitHub Search API for open beginner issues
      const repoQuery = CURATED_REPOS.map((r) => `repo:${r}`).join('+');
      const searchQuery = `label:"good first issue",label:"help wanted"+is:open+is:issue+${repoQuery}`;

      const res = await fetchWithTimeout(
        `https://api.github.com/search/issues?q=${searchQuery}&sort=updated&order=desc&per_page=30`,
        {
          headers: { Accept: 'application/vnd.github.v3+json' },
          cache: 'no-store',
        },
        6000,
      );

      if (res.ok) {
        const data = await res.json();
        const rawItems = Array.isArray(data?.items) ? data.items : [];

        issues = rawItems.map((item: any) => {
          const repoUrl = item.repository_url
            ? item.repository_url.replace(
                'https://api.github.com/repos/',
                'https://github.com/',
              )
            : 'https://github.com';

          const repoParts = repoUrl.split('/');
          const repoName = repoParts.slice(-2).join('/');

          return {
            id: String(item.id || item.number),
            title: item.title,
            url: item.html_url,
            repoName,
            repoUrl,
            labels: Array.isArray(item.labels)
              ? item.labels.map((l: any) => l.name)
              : [],
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            commentsCount: item.comments || 0,
            language: repoName.includes('flask')
              ? 'Python'
              : repoName.includes('uv')
                ? 'Rust'
                : 'TypeScript',
          };
        });

        cachedIssues = issues;
        lastFetchTime = now;
      } else {
        issues = FALLBACK_GOOD_FIRST_ISSUES;
      }
    } catch {
      issues = FALLBACK_GOOD_FIRST_ISSUES;
    }
  }

  if (issues.length === 0) {
    issues = FALLBACK_GOOD_FIRST_ISSUES;
  }

  // Apply language filter if provided
  if (language && language.toLowerCase() !== 'all') {
    const filterLang = language.toLowerCase();
    issues = issues.filter(
      (i) => i.language && i.language.toLowerCase() === filterLang,
    );
  }

  return issues.slice(0, limit);
}
