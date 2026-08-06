/**
 * API key lifecycle utilities.
 *
 * Keys follow the format:  osk_<44-char base64url-encoded random bytes>
 *
 * "osk" stands for "OSSfolio Secret Key" — a recognisable prefix that makes
 * keys easy to spot in logs, config files, and environment variables, and that
 * allows future secret-scanning tooling to identify leaked keys automatically
 * (same pattern used by GitHub's `ghp_`, Stripe's `sk_live_`, etc.).
 *
 * The plaintext key is NEVER stored. Only a SHA-256 hex digest is persisted.
 * The first 12 characters of the plaintext key are stored as `key_prefix` for
 * display purposes (e.g. "osk_Ab3Xy9Qr") so users can identify their keys
 * without us needing to reconstruct the plaintext.
 *
 * All crypto is via the Web Crypto API, which is available in both the Node.js
 * and Cloudflare Workers edge runtimes this codebase targets.
 */

/** Shape returned by `generateApiKey`. */
export interface GeneratedApiKey {
  /** The full plaintext key — show once, then discard. */
  key: string;
  /** SHA-256 hex digest of the plaintext key, for DB storage. */
  hash: string;
  /** First 12 characters of the key, for display. */
  prefix: string;
}

/** Shape returned by `validateApiKey` when the key is valid. */
export interface ValidatedApiKey {
  keyId: string;
  userId: string;
}

/**
 * Hash an API key (or any string) with SHA-256.
 *
 * Uses Web Crypto so it runs in the edge runtime without polyfills.
 * Returns lowercase hex — consistent with the rate-limiter and http-cache
 * helpers that also use SHA-256 in this codebase.
 */
export async function hashApiKey(plaintext: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(plaintext),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a new, cryptographically random API key.
 *
 * Returns the plaintext key together with its hash and display prefix so the
 * caller can persist the hash + prefix without ever having to re-derive them.
 * The plaintext MUST be shown to the user immediately and then discarded —
 * it cannot be recovered from the hash.
 */
export async function generateApiKey(): Promise<GeneratedApiKey> {
  // 32 random bytes → 256 bits of entropy, far beyond brute-force reach.
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));

  // base64url-encode the bytes for a URL-safe, human-readable key body.
  const body = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const key = `osk_${body}`;
  const hash = await hashApiKey(key);
  const prefix = key.slice(0, 12); // "osk_" + first 8 chars of the body

  return { key, hash, prefix };
}

/**
 * Validate a raw API key extracted from an Authorization header.
 *
 * Hashes the key and calls the `validate_api_key` Postgres RPC (security
 * definer), which simultaneously checks that the key is active and updates
 * `last_used_at`. Returns `null` for any invalid, revoked, or malformed key.
 *
 * This function is ONLY safe to call server-side (it uses the service-role
 * client so it can invoke the restricted RPC). Never import it in client code.
 */
export async function validateApiKey(
  plaintext: string,
): Promise<ValidatedApiKey | null> {
  // Guard against obviously bogus values before doing any crypto.
  if (!plaintext || !plaintext.startsWith("osk_") || plaintext.length > 128) {
    return null;
  }

  // Import the service-role client lazily to avoid pulling it into client
  // bundles (it carries the service-role secret key).
  const { supabaseAdmin } = await import("@/lib/supabase");

  const hash = await hashApiKey(plaintext);

  const { data, error } = await supabaseAdmin().rpc("validate_api_key", {
    p_key_hash: hash,
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as { key_id: string; user_id: string };
  return { keyId: row.key_id, userId: row.user_id };
}

/**
 * Extract a raw `osk_...` key from an `Authorization: Bearer <key>` header.
 *
 * Returns `null` if the header is absent, malformed, or does not carry an
 * OSSfolio key. The caller must distinguish "no key" (anonymous) from "bad
 * key" (401) — this helper only performs the extraction.
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  // Only treat it as an API key if it has the osk_ prefix.
  // Supabase JWTs start with "eyJ" — this distinguishes the two cases so
  // the settings route (which reads JWTs) doesn't accidentally accept API keys.
  return token.startsWith("osk_") ? token : null;
}
