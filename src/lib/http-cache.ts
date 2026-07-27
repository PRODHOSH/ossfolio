/**
 * Conditional-request helpers for public GET endpoints (RFC 9110 §8.8.3, §13.1.2).
 *
 * A public profile changes rarely — often not for hours — but every request
 * currently ships the whole payload again. An `ETag` lets a caller say "I already
 * have version X", and lets us answer `304 Not Modified` with no body at all.
 *
 * What this does and does not save, stated plainly: the 304 removes the response
 * payload from the wire, not the database read. The tag is derived from the row,
 * so the row still has to be fetched in order to know whether the caller's copy
 * is current. The win is bandwidth and client parse time, not query count.
 */

/**
 * Derive a strong ETag from the exact bytes the client would have received.
 *
 * Hashing the serialised body rather than a timestamp column is deliberate.
 * `profiles.updated_at` is not part of this endpoint's public projection — the
 * route excludes internal timestamps on purpose — and widening the projection to
 * reach one would leak a field the API intentionally hides. The body is also the
 * more truthful input: it changes exactly when what we send changes, so the tag
 * can never claim "unchanged" while the payload has in fact moved.
 *
 * SHA-256 via Web Crypto matches `rate-limit.ts`, which is available in the edge
 * runtime this route deploys to. 128 bits of the digest is far past the point
 * where an accidental collision matters for cache validation.
 *
 * The result is a *strong* validator (no `W/` prefix) because it is computed from
 * the exact response bytes, which is what strong comparison means.
 */
export async function computeETag(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `"${hex.slice(0, 32)}"`;
}

/**
 * Strip an optional weak-validator prefix from an entity-tag.
 *
 * `If-None-Match` is evaluated with the *weak* comparison function (RFC 9110
 * §8.8.3.2), so `W/"abc"` and `"abc"` are a match. The prefix is case-sensitive
 * and must be an uppercase `W` followed by a solidus, per the grammar.
 */
function stripWeakPrefix(entityTag: string): string {
  return entityTag.startsWith("W/") ? entityTag.slice(2) : entityTag;
}

/**
 * Decide whether a caller's `If-None-Match` header already covers `etag`.
 *
 * Returns true when the request should be answered `304 Not Modified`.
 *
 * Handles the three shapes the header actually takes in the wild:
 *   - `*`, which matches whenever a representation exists at all
 *   - a single entity-tag
 *   - a comma-separated list, which is what a client sends after it has cached
 *     several variants
 *
 * A malformed or absent header is treated as "no match", so the caller falls
 * through to a normal 200. Being permissive in the wrong direction here would
 * serve a stale 304, which is far worse than an unnecessary full response.
 */
export function isNotModified(
  ifNoneMatch: string | null | undefined,
  etag: string,
): boolean {
  if (!ifNoneMatch) return false;

  const header = ifNoneMatch.trim();
  if (header === "") return false;
  if (header === "*") return true;

  const current = stripWeakPrefix(etag);

  return header
    .split(",")
    .map((candidate) => stripWeakPrefix(candidate.trim()))
    .some((candidate) => candidate !== "" && candidate === current);
}
