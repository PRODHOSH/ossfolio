import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getInterFonts,
  resetFontCacheForTesting,
  default as OGImage,
} from '@/app/[username]/opengraph-image';
import { getProfileByUsername } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  getProfileByUsername: vi.fn(),
}));

// Mock Next.js ImageResponse for vitest
vi.mock('next/og', () => {
  return {
    ImageResponse: class MockImageResponse {
      status = 200;
      headers: Headers;
      constructor(
        _element: unknown,
        options?: { headers?: Record<string, string> },
      ) {
        this.headers = new Headers(options?.headers || {});
      }
    },
  };
});

describe('OpenGraph Font ArrayBuffer Caching & Response Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFontCacheForTesting();
  });

  describe('getInterFonts', () => {
    it('should fetch font data once and return cached ArrayBuffer promise on subsequent calls', async () => {
      const mockCssText = `
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 400;
          src: url(https://fonts.gstatic.com/inter-400.ttf) format('truetype');
        }
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 500;
          src: url(https://fonts.gstatic.com/inter-500.ttf) format('truetype');
        }
      `;

      const dummyBufferMedium = new ArrayBuffer(64);
      const dummyBufferRegular = new ArrayBuffer(32);

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async (url) => {
          const urlStr = String(url);
          const parsedUrl = new URL(urlStr);
          if (parsedUrl.hostname === 'fonts.googleapis.com') {
            return new Response(mockCssText, { status: 200 });
          }
          if (urlStr.includes('inter-500.ttf')) {
            return new Response(dummyBufferMedium, { status: 200 });
          }
          if (urlStr.includes('inter-400.ttf')) {
            return new Response(dummyBufferRegular, { status: 200 });
          }
          return new Response('', { status: 200 });
        });

      // First call -> triggers network fetch
      const fonts1 = await getInterFonts();
      expect(fonts1[0]).toBeDefined();
      expect(fonts1[1]).toBeDefined();
      const initialFetchCount = fetchSpy.mock.calls.length;
      expect(initialFetchCount).toBe(3); // 1 CSS fetch + 2 font binary fetches

      // Second call -> reuses in-memory cached promise without additional network calls
      const fonts2 = await getInterFonts();
      expect(fonts2).toBe(fonts1);
      expect(fetchSpy.mock.calls.length).toBe(initialFetchCount);

      fetchSpy.mockRestore();
    });

    it('should clear cache on error allowing subsequent retry', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockImplementation(async (url) => {
          const urlStr = String(url);
          const parsedUrl = new URL(urlStr);
          if (parsedUrl.hostname === 'fonts.googleapis.com') {
            return new Response(
              `
              @font-face {
                font-family: 'Inter';
                font-style: normal;
                font-weight: 400;
                src: url(https://fonts.gstatic.com/inter-400.ttf) format('truetype');
              }
              @font-face {
                font-family: 'Inter';
                font-style: normal;
                font-weight: 500;
                src: url(https://fonts.gstatic.com/inter-500.ttf) format('truetype');
              }
              `,
              { status: 200 },
            );
          }
          return new Response(new ArrayBuffer(16), { status: 200 });
        });

      await expect(getInterFonts()).rejects.toThrow('Network Error');

      // Should attempt fetch again rather than returning failed promise
      await expect(getInterFonts()).resolves.toBeDefined();

      fetchSpy.mockRestore();
    });
  });

  describe('OGImage response headers', () => {
    it('should include Cache-Control immutable header on rendered ImageResponse', async () => {
      vi.mocked(getProfileByUsername).mockResolvedValue({
        data: {
          username: 'octocat',
          score: 95,
          total_commits: 100,
          total_prs: 20,
          total_issues: 5,
          total_reviews: 10,
          visibility: 'public',
        },
        error: null,
      } as never);

      const mockCssText = `
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 400;
          src: url(https://fonts.gstatic.com/inter-400.ttf) format('truetype');
        }
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 500;
          src: url(https://fonts.gstatic.com/inter-500.ttf) format('truetype');
        }
      `;

      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async (url) => {
          const urlStr = String(url);
          const parsedUrl = new URL(urlStr);
          if (parsedUrl.hostname === 'api.github.com') {
            return new Response(
              JSON.stringify({
                name: 'The Octocat',
                avatar_url: 'https://github.com/octocat.png',
              }),
              { status: 200 },
            );
          }
          if (parsedUrl.hostname === 'fonts.googleapis.com') {
            return new Response(mockCssText, { status: 200 });
          }
          return new Response(new ArrayBuffer(16), { status: 200 });
        });

      const res = await OGImage({
        params: Promise.resolve({ username: 'octocat' }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe(
        'public, immutable, max-age=31536000',
      );

      fetchSpy.mockRestore();
    });
  });
});
