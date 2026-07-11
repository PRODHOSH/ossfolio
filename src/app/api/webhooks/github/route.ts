import { NextRequest, after } from "next/server";
import { sanitizeUsername, createApiResponse, createErrorResponse } from "@/lib/validators/api";
import { refreshProfile } from "@/lib/refresh-profile";

// Receives GitHub `push` webhooks and triggers a (rate-limited) refresh of the
// affected profile in the background. Signature verification uses Web Crypto so
// it works on both the edge and Node runtimes.

/** Constant-time comparison of two equal-length hex strings. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Verify GitHub's `X-Hub-Signature-256` (HMAC-SHA256 of the raw body). */
async function verifySignature(
  secret: string,
  body: string,
  header: string | null
): Promise<boolean> {
  if (!header || !header.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const digest = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(`sha256=${digest}`, header);
}

interface PushPayload {
  repository?: { owner?: { login?: string; name?: string } };
}

export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: without a configured secret nothing can be verified.
    return createErrorResponse("Webhook not configured", 503);
  }

  // The raw body is required — re-serializing parsed JSON would change bytes and
  // break the HMAC.
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!(await verifySignature(secret, body, signature))) {
    return createErrorResponse("Invalid signature", 401);
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") {
    return createApiResponse({ ok: true, message: "pong" });
  }
  if (event !== "push") {
    // Acknowledge other events so GitHub doesn't retry them.
    return createApiResponse({ ok: true, ignored: event ?? "unknown" });
  }

  let owner: string | undefined;
  try {
    const payload = JSON.parse(body) as PushPayload;
    owner = payload.repository?.owner?.login ?? payload.repository?.owner?.name;
  } catch {
    return createErrorResponse("Invalid JSON payload", 400);
  }

  const username = sanitizeUsername(owner);
  if (!username) {
    return createApiResponse({ ok: true, ignored: "no repository owner" });
  }

  // Respond fast; run the rate-limited refresh after the response is sent.
  after(async () => {
    try {
      await refreshProfile(username);
    } catch (err) {
      // Best-effort: GitHub already received its 2xx. Log so failed
      // webhook-triggered refreshes are visible in production.
      console.error("GitHub webhook: background refresh failed", { username, err });
    }
  });

  return createApiResponse({ ok: true, accepted: username });
}
