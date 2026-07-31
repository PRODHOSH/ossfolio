/**
 * GitHub webhook signature verification.
 *
 * These live here rather than in the route module because a Next App Router
 * route file has a defined export surface — the HTTP method handlers and a few
 * recognised config values. Exporting helpers from one so a test can import
 * them puts arbitrary names into that surface, and the test previously imported
 * two that weren't exported at all, which failed `tsc --noEmit` on every commit.
 *
 * Extracting them keeps the route's exports to POST and gives the test a normal
 * module to import from.
 */

// Receives GitHub `push` webhooks and triggers a (rate-limited) refresh of the
// affected profile in the background. Signature verification uses edge-safe Web Crypto
// APIs and constant-time buffer comparison (crypto.subtle.timingSafeEqual).

/** Converts a hex string into a Uint8Array byte buffer. */
export function hexToBytes(hex: string): Uint8Array | null {
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
export function timingSafeEqualBuffer(
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
export async function verifySignature(
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
