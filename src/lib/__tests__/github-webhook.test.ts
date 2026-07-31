import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/webhooks/github/route';
import {
  verifySignature,
  timingSafeEqualBuffer,
} from '@/lib/webhook-signature';
import { NextRequest } from 'next/server';
import { enqueueDeadLetterPayload } from '../webhook-dead-letter';
import { refreshProfile } from '../refresh-profile';

vi.mock('next/server', async () => {
  const actual =
    await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    after: vi.fn((fn: () => Promise<void> | void) => {
      Promise.resolve(fn()).catch(() => {});
    }),
  };
});

vi.mock('../refresh-profile', () => ({
  refreshProfile: vi.fn(),
}));

vi.mock('../webhook-dead-letter', () => ({
  enqueueDeadLetterPayload: vi.fn(),
}));

// Helper to calculate valid HMAC-SHA256 signature string for testing
async function computeTestSignature(
  secret: string,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  );
  const digest = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256=${digest}`;
}

describe('GitHub Webhook HMAC-SHA256 Verification & Endpoint', () => {
  const testSecret = 'my-super-secret-webhook-key';
  const testBody = JSON.stringify({
    repository: { owner: { login: 'octocat' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_WEBHOOK_SECRET = testSecret;
  });

  describe('timingSafeEqualBuffer', () => {
    it('should return true for identical Uint8Arrays', () => {
      const a = new Uint8Array([1, 2, 3, 4, 5, 255]);
      const b = new Uint8Array([1, 2, 3, 4, 5, 255]);
      expect(timingSafeEqualBuffer(a, b)).toBe(true);
    });

    it('should return false for different Uint8Arrays of same length', () => {
      const a = new Uint8Array([1, 2, 3, 4, 5, 255]);
      const b = new Uint8Array([1, 2, 3, 4, 5, 0]);
      expect(timingSafeEqualBuffer(a, b)).toBe(false);
    });

    it('should return false for buffers of different byte lengths', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3, 4]);
      expect(timingSafeEqualBuffer(a, b)).toBe(false);
    });
  });

  describe('verifySignature', () => {
    it('should return true for a valid signature', async () => {
      const signature = await computeTestSignature(testSecret, testBody);
      const isValid = await verifySignature(testSecret, testBody, signature);
      expect(isValid).toBe(true);
    });

    it('should return false if header signature is missing or null', async () => {
      expect(await verifySignature(testSecret, testBody, null)).toBe(false);
    });

    it('should return false if header does not start with sha256=', async () => {
      expect(
        await verifySignature(testSecret, testBody, 'sha1=abcdef1234567890'),
      ).toBe(false);
    });

    it('should return false for incorrect signature length or invalid hex', async () => {
      expect(
        await verifySignature(testSecret, testBody, 'sha256=invalidhex'),
      ).toBe(false);
    });

    it('should return false when body has been tampered with', async () => {
      const signature = await computeTestSignature(testSecret, testBody);
      const isValid = await verifySignature(
        testSecret,
        testBody + 'tampered',
        signature,
      );
      expect(isValid).toBe(false);
    });
  });

  describe('POST /api/webhooks/github', () => {
    it('should return 503 if GITHUB_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.GITHUB_WEBHOOK_SECRET;

      const req = new NextRequest('http://localhost/api/webhooks/github', {
        method: 'POST',
        body: testBody,
      });

      const res = await POST(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      // The API returns a structured error object, not a bare string.
      expect(json.error.message).toBe('Webhook not configured');
    });

    it('should return 401 for an invalid signature', async () => {
      const req = new NextRequest('http://localhost/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=' + '0'.repeat(64),
        },
        body: testBody,
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.message).toBe('Invalid signature');
    });

    it('should return 200 pong for ping event', async () => {
      const signature = await computeTestSignature(testSecret, testBody);
      const req = new NextRequest('http://localhost/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'ping',
        },
        body: testBody,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      // Success bodies travel inside the { success, data } envelope that
      // createApiResponse applies.
      expect(json).toEqual({
        success: true,
        data: { ok: true, message: 'pong' },
      });
    });

    it('should return 200 accepted for valid push event and trigger background refresh', async () => {
      vi.mocked(refreshProfile).mockResolvedValue({
        status: 'refreshed',
        username: 'octocat',
      });

      const signature = await computeTestSignature(testSecret, testBody);
      const req = new NextRequest('http://localhost/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
        },
        body: testBody,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        data: { ok: true, accepted: 'octocat' },
      });
    });

    it('should enqueue to dead-letter queue when background refresh encounters error', async () => {
      vi.mocked(refreshProfile).mockResolvedValue({
        status: 'error',
      });

      const signature = await computeTestSignature(testSecret, testBody);
      const req = new NextRequest('http://localhost/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
        },
        body: testBody,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(enqueueDeadLetterPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'push',
          username: 'octocat',
          errorReason: 'refresh_status_error',
        }),
      );
    });
  });
});
