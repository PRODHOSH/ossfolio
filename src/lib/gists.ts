import type { GistItem } from '@/types';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const GITHUB_API_BASE = 'https://api.github.com';
const TIMEOUT_MS = 6000;

export const FALLBACK_GISTS: Record<string, GistItem[]> = {
  default: [
    {
      id: 'gist-1',
      description: 'Useful TypeScript utility for deep merging nested objects',
      url: 'https://gist.github.com',
      filesCount: 1,
      commentsCount: 2,
      isPublic: true,
      createdAt: '2026-05-01T10:00:00Z',
      updatedAt: '2026-05-04T12:30:00Z',
      primaryFile: {
        filename: 'deep-merge.ts',
        language: 'TypeScript',
        size: 1024,
      },
    },
    {
      id: 'gist-2',
      description: 'Python script to generate SVG sparkline charts',
      url: 'https://gist.github.com',
      filesCount: 2,
      commentsCount: 4,
      isPublic: true,
      createdAt: '2026-04-18T14:20:00Z',
      updatedAt: '2026-04-20T16:10:00Z',
      primaryFile: {
        filename: 'sparkline.py',
        language: 'Python',
        size: 2048,
      },
    },
  ],
};

export async function fetchUserGists(
  username: string,
  token?: string,
): Promise<GistItem[]> {
  if (!username) return [];

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const res = await fetchWithTimeout(
      `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/gists?per_page=10`,
      { headers, cache: 'no-store' },
      TIMEOUT_MS,
    );

    if (!res.ok) {
      return FALLBACK_GISTS.default;
    }

    const rawData = await res.json();
    if (!Array.isArray(rawData)) return FALLBACK_GISTS.default;

    return rawData.map((item: any) => {
      const filesKeys = Object.keys(item.files || {});
      const firstFile =
        filesKeys.length > 0 ? item.files[filesKeys[0]] : undefined;

      return {
        id: String(item.id),
        description: item.description || 'Public Gist snippet',
        url: item.html_url,
        filesCount: filesKeys.length,
        commentsCount: item.comments || 0,
        isPublic: Boolean(item.public),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        primaryFile: firstFile
          ? {
              filename: firstFile.filename,
              language: firstFile.language || null,
              size: firstFile.size || 0,
            }
          : undefined,
      };
    });
  } catch (err) {
    console.warn(`[Gists] Could not fetch gists for @${username}:`, err);
    return FALLBACK_GISTS.default;
  }
}
