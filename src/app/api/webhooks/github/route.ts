import { NextRequest, after } from 'next/server';
import {
  sanitizeUsername,
  createApiResponse,
  createErrorResponse,
} from '@/lib/validators/api';
import { refreshProfile } from '@/lib/refresh-profile';
import { enqueueDeadLetterPayload } from '@/lib/webhook-dead-letter';

// Receives GitHub `push` webhooks and triggers a (rate-limited) refresh of the
// affected profile in the background. Signature verification uses edge-safe Web Crypto
// APIs and constant-time buffer comparison (crypto.subtle.timingSafeEqual).

/** Converts a hex string into a Uint8Array byte buffer. */
function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/** Constant-time comparison of two ArrayBuffer or ArrayBufferView byte buffers. */
function timingSafeEqualBuffer(
  a: ArrayBuffer | ArrayBufferView,
  b: ArrayBuffer | ArrayBufferView,
): boolean {
  const subtle = crypto.subtle as unknown as {
    timingSafeEqual?: (
      _a: ArrayBuffer | ArrayBufferView,
      _b: ArrayBuffer | ArrayBufferView,
    ) => boolean;
  };

  if (typeof subtle.timingSafeEqual === 'function') {
    return subtle.timingSafeEqual(a, b);
  }

  const viewA =
    a instanceof Uint8Array ? a : new Uint8Array('buffer' in a ? a.buffer : a);
  const viewB =
    b instanceof Uint8Array ? b : new Uint8Array('buffer' in b ? b.buffer : b);

  if (viewA.byteLength !== viewB.byteLength) return false;
  let mismatch = 0;
  for (let i = 0; i < viewA.byteLength; i++) {
    mismatch |= viewA[i] ^ viewB[i];
  }
  return mismatch === 0;
}

/** Verify GitHub's `X-Hub-Signature-256` (HMAC-SHA256 of raw body in constant time). */
async function verifySignature(
  secret: string,
  body: string,
  header: string | null,
): Promise<boolean> {
  if (!header || !header.startsWith('sha256=')) return false;

  const headerHex = header.slice(7);
  if (headerHex.length !== 64) return false;

  const headerBytes = hexToBytes(headerHex);
  if (!headerBytes) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signedBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  );
  const computedBytes = new Uint8Array(signedBuffer);

  return timingSafeEqualBuffer(computedBytes, headerBytes);
}

interface PushPayload {
  repository?: { owner?: { login?: string; name?: string } };
}

export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: without a configured secret nothing can be verified.
    return createErrorResponse('Webhook not configured', 503);
  }

  // The raw body is required — re-serializing parsed JSON would change bytes and
  // break the HMAC.
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!(await verifySignature(secret, body, signature))) {
    return createErrorResponse('Invalid signature', 401);
  }

  const event = request.headers.get('x-github-event');
  if (event === 'ping') {
    return createApiResponse({ ok: true, message: 'pong' });
  }
  if (event !== 'push') {
    // Acknowledge other events so GitHub doesn't retry them.
    return createApiResponse({ ok: true, ignored: event ?? 'unknown' });
  }

  let owner: string | undefined;
  let parsedPayload: PushPayload | undefined;
  try {
    parsedPayload = JSON.parse(body) as PushPayload;
    owner =
      parsedPayload.repository?.owner?.login ??
      parsedPayload.repository?.owner?.name;
  } catch {
    return createErrorResponse('Invalid JSON payload', 400);
  }

  const username = sanitizeUsername(owner);
  if (!username) {
    return createApiResponse({ ok: true, ignored: 'no repository owner' });
  }

  // Respond fast; run refresh and enqueue to dead-letter queue if transient write locks occur.
  after(async () => {
    try {
      const res = await refreshProfile(username);
      if (res.status === 'error' || res.status === 'rate_limited') {
        await enqueueDeadLetterPayload({
          eventType: event ?? 'push',
          username,
          payload: parsedPayload ?? { owner },
          errorReason: `refresh_status_${res.status}`,
        });
      }
    } catch (err) {
      console.error('GitHub webhook: background refresh failed', {
        username,
        err,
      });
      await enqueueDeadLetterPayload({
        eventType: event ?? 'push',
        username,
        payload: parsedPayload ?? { owner },
        errorReason: err instanceof Error ? err.message : 'unknown_error',
      });
    }
  });

  return createApiResponse({ ok: true, accepted: username });
}
