import { redis } from "@/lib/redis";
import type { NextRequest } from "next/server";

/**
 * Per-IP rate limiting for the manual refresh endpoint.
 *
 * ── Why the existing limit isn't enough ───────────────────────────────────────
 *
 * `refreshProfile()` already rate-limits, but it does so **per username**, by way of an
 * atomic conditional update on `profiles.last_refreshed_at`. That protects a single
 * profile from being hammered — and nothing else. Two holes fall straight out of it:
 *
 *   1. **Username rotation.** Hit `/api/alice/refresh`, then `/api/bob/refresh`, then
 *      `/api/carol/refresh`. Every username gets its own independent bucket, so a caller
 *      can drive as much work as it likes just by moving the target.
 *
 *   2. **Usernames that don't exist.** For an unknown username, `refreshProfile()` runs an
 *      UPDATE that matches no rows, then a SELECT to distinguish "rate limited" from
 *      "not found", and returns `not_found` — *without recording a limit anywhere*, since
 *      there is no row to record it on. So `/api/{random}/refresh` can be called without
 *      bound, costing two database queries every single time, and the existing limiter
 *      never once fires.
 *
 * The endpoint is unauthenticated, so both are reachable by anyone. This module closes
 * them by limiting the *caller* rather than the target, before any of that work is done.
 *
 * ── Why `SET NX EX` and not a counter ────────────────────────────────────────
 *
 * `src/lib/redis.ts` falls back to a stub with only `get` and `set` when Upstash isn't
 * configured (CI builds, local dev). A limiter built on `incr`/`expire`/`eval` would throw
 * "not a function" in exactly those environments. `SET key value NX EX <window>` is a
 * single atomic Redis operation that needs neither — it either takes the slot or reports
 * that someone already holds it, with no read-then-write race.
 *
 * With no Upstash configured the stub's `set` returns "OK", so every request is allowed and
 * the limiter is simply inert — the same way the GitHub response cache in `lib/github.ts`
 * already degrades. Local development and CI keep working; production gets the limit.
 */

/** One refresh per IP per window, as the issue specifies. */
const WINDOW_SECONDS = 5 * 60;

export interface RateLimitResult {
  allowed: boolean;
  /** Only meaningful when `allowed` is false. */
  retryAfterSeconds: number;
}

export interface RateLimitFailoverTelemetry {
  timestamp: string;
  event: "REDIS_FAILOVER";
  reason: string;
  key: string;
  fallbackMode: "MEMORY_BUFFER";
  consecutiveFailures: number;
  nextRetryInMs: number;
  inBackoffWindow: boolean;
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitFailoverState {
  consecutiveFailures: number;
  lastFailureTime: number;
  memoryBufferEntriesCount: number;
}

// Exponential backoff configuration
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;
const BACKOFF_FACTOR = 2;

// In-memory state tracking for Redis failover & circuit breaker
let consecutiveFailures = 0;
let lastFailureTime = 0;
const memoryBuffer = new Map<string, number>();

/**
 * Calculate exponential backoff duration based on consecutive failure count.
 */
function calculateBackoffMs(failCount: number): number {
  if (failCount <= 0) return 0;
  const backoff = BASE_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, failCount - 1);
  return Math.min(MAX_BACKOFF_MS, backoff);
}

/**
 * Perform localized sliding memory buffer rate limit check when Redis is unreachable or bypassed.
 */
function checkMemoryBuffer(key: string, now: number): RateLimitResult {
  // Prune expired entries to prevent memory leaks
  for (const [k, resetTime] of memoryBuffer.entries()) {
    if (resetTime <= now) {
      memoryBuffer.delete(k);
    }
  }

  const storedResetAt = memoryBuffer.get(key);
  if (storedResetAt !== undefined && storedResetAt > now) {
    const remainingMs = storedResetAt - now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
    };
  }

  const resetAt = now + WINDOW_SECONDS * 1000;
  memoryBuffer.set(key, resetAt);
  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

/**
 * Emit structured JSON diagnostic logs for administrator alerting during Redis failover.
 */
function logFailoverTelemetry(
  reason: string,
  key: string,
  result: RateLimitResult,
  inBackoff: boolean,
): RateLimitFailoverTelemetry {
  const nextRetryInMs = calculateBackoffMs(consecutiveFailures);
  const telemetry: RateLimitFailoverTelemetry = {
    timestamp: new Date().toISOString(),
    event: "REDIS_FAILOVER",
    reason,
    key,
    fallbackMode: "MEMORY_BUFFER",
    consecutiveFailures,
    nextRetryInMs,
    inBackoffWindow: inBackoff,
    allowed: result.allowed,
    retryAfterSeconds: result.retryAfterSeconds,
  };
  console.warn(
    "[rate-limit-failover] Upstream Redis connection failure/bypass, failing over to sliding memory buffer:",
    JSON.stringify(telemetry),
  );
  return telemetry;
}

/**
 * Returns current failover diagnostic state for testing and system health telemetry.
 */
export function getRateLimitFailoverState(): RateLimitFailoverState {
  return {
    consecutiveFailures,
    lastFailureTime,
    memoryBufferEntriesCount: memoryBuffer.size,
  };
}

/**
 * Resets internal failover state (useful for test isolation).
 */
export function resetRateLimitFailoverState(): void {
  consecutiveFailures = 0;
  lastFailureTime = 0;
  memoryBuffer.clear();
}

/**
 * Work out who is calling.
 *
 * This is the part that decides whether the limit is real or theatre. `x-forwarded-for` is
 * just a header — a client can send whatever it likes in it. Trusting its **first** entry
 * (the usual mistake) means an attacker sets a fresh fake IP on every request, lands in a
 * fresh bucket every time, and the rate limit does nothing at all while looking like it
 * works.
 *
 * So: prefer the headers the edge itself writes, which overwrite anything the client sent
 * and therefore cannot be forged. Only if none are present do we fall back to
 * `x-forwarded-for`, and then we take the **last** entry — because each proxy *appends* the
 * address it saw, so the rightmost value is the one written by the proxy closest to us,
 * and everything to its left is unverified client input.
 */
function clientIp(request: NextRequest): string | null {
  // Cloudflare (this app deploys via @opennextjs/cloudflare) — set by the edge, not forgeable.
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  // Vercel and most reverse proxies — also set by the edge.
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    return hops.length > 0 ? hops[hops.length - 1] : null;
  }

  return null;
}

/**
 * Hash the identifier before it becomes a Redis key.
 *
 * A raw IP address is personal data, and there's no reason to hold one: the limiter only
 * ever needs to know whether it has seen *this* caller before, which a digest answers just
 * as well. Web Crypto is available in the edge runtime, so this costs nothing.
 */
async function keyFor(identifier: string, namespace = "refresh"): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identifier),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // 16 bytes is far beyond enough to avoid collisions here, and keeps the key short.
  return `ratelimit:${namespace}:${hex.slice(0, 32)}`;
}

async function checkNamedRateLimit(
  request: NextRequest,
  namespace: string,
): Promise<RateLimitResult> {
  const identifier = clientIp(request) ?? "unidentified";
  try {
    const key = await keyFor(identifier, namespace);
    const now = Date.now();
    const resetAt = now + WINDOW_SECONDS * 1000;
    const acquired = await redis.set(key, resetAt, { nx: true, ex: WINDOW_SECONDS });
    if (acquired === "OK") return { allowed: true, retryAfterSeconds: 0 };
    const storedResetAt = await redis.get<number>(key);
    const remainingMs = typeof storedResetAt === "number" ? storedResetAt - now : WINDOW_SECONDS * 1000;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) };
  } catch (error) {
    console.error(`[rate-limit] ${namespace} limiter unavailable, allowing request:`, error instanceof Error ? error.message : error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/**
 * Consume one unit of the caller's allowance.
 *
 * Returns `allowed: false` with the seconds remaining when the caller is over the limit.
 * Uses exponential backoff and localized sliding memory buffer fallback when Redis is unavailable,
 * preventing endpoint outage while generating structured telemetry alerts.
 */
export async function checkRefreshRateLimit(
  request: NextRequest,
): Promise<RateLimitResult> {
  // No usable address (local dev, an odd proxy) — everything unidentifiable shares one
  // bucket rather than being waved through, so the absence of a header can't become a way
  // around the limit.
  const identifier = clientIp(request) ?? "unidentified";

  const key = await keyFor(identifier);
  const now = Date.now();

  // Check if we are in an exponential backoff window due to prior Redis failures
  const backoffMs = calculateBackoffMs(consecutiveFailures);
  const inBackoffWindow =
    consecutiveFailures > 0 && now < lastFailureTime + backoffMs;

  if (inBackoffWindow) {
    const memoryResult = checkMemoryBuffer(key, now);
    logFailoverTelemetry(
      "Redis call bypassed due to active exponential backoff window",
      key,
      memoryResult,
      true,
    );
    return memoryResult;
  }

  try {
    const resetAt = now + WINDOW_SECONDS * 1000;

    // Atomic: takes the slot only if nobody holds it, and expires on its own.
    const acquired = await redis.set(key, resetAt, {
      nx: true,
      ex: WINDOW_SECONDS,
    });

    // Redis connection succeeded: reset backoff failure counters
    consecutiveFailures = 0;
    lastFailureTime = 0;

    if (acquired === "OK") {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    // Someone already holds the slot. Read back when it frees up so the caller gets a real
    // number rather than a guess.
    const storedResetAt = await redis.get<number>(key);
    const remainingMs =
      typeof storedResetAt === "number"
        ? storedResetAt - now
        : WINDOW_SECONDS * 1000;

    return {
      allowed: false,
      // At least 1: "try again in 0 seconds" reads like a bug, and a client that trusts it
      // would retry straight into another rejection.
      retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
    };
  } catch (error) {
    consecutiveFailures += 1;
    lastFailureTime = now;

    const reason = error instanceof Error ? error.message : String(error);
    const memoryResult = checkMemoryBuffer(key, now);
    logFailoverTelemetry(reason, key, memoryResult, false);
    return memoryResult;
  }
}

/** Limits costly AI generation separately from manual profile refreshes. */
export function checkDeveloperInsightsRateLimit(
  request: NextRequest,
): Promise<RateLimitResult> {
  return checkNamedRateLimit(request, "developer-insights");
}
