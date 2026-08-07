import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizeString } from "@/lib/sanitizer";
import { createApiResponse, createErrorResponse } from "@/lib/validators/api";
import { generateApiKey } from "@/lib/api-keys";
import { supabaseAdmin } from "@/lib/supabase";

// Runtime managed by @opennextjs/cloudflare

// Maximum number of active (non-revoked) keys per user.
// Keeps the lookup table small and deters key-farming.
const MAX_ACTIVE_KEYS = 10;

function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

function createAuthClient(accessToken: string) {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function extractToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  // API keys start with osk_; this route only accepts Supabase JWTs.
  if (token.startsWith("osk_")) return null;
  return token;
}

/**
 * GET /api/settings/api-keys
 *
 * Returns the caller's active (non-revoked) API keys.
 * The `key_hash` column is never returned — only display-safe fields.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  if (!token) return createErrorResponse("Unauthorized", 401);

  const supabase = createAuthClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return createErrorResponse("Unauthorized", 401);

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api-keys GET] Supabase error:", error.message);
    return createErrorResponse("Failed to fetch API keys", 502);
  }

  return createApiResponse(data ?? []);
}

/**
 * POST /api/settings/api-keys
 *
 * Creates a new API key for the caller.
 * Body: `{ "name": "My Widget" }`
 *
 * Returns the plaintext key exactly once in the response. It is the caller's
 * responsibility to copy and store it; there is no recovery path.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  if (!token) return createErrorResponse("Unauthorized", 401);

  const supabase = createAuthClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return createErrorResponse("Unauthorized", 401);

  // Validate body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("Invalid JSON body", 400);
  }

  const rawName =
    body && typeof body === "object" && "name" in body
      ? (body as Record<string, unknown>).name
      : undefined;

  const name = sanitizeString(rawName);
  if (!name || name.trim().length === 0) {
    return createErrorResponse("Key name is required", 400);
  }
  if (name.trim().length > 64) {
    return createErrorResponse("Key name must be 64 characters or fewer", 400);
  }

  // Check the active-key cap.
  const { count } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (typeof count === "number" && count >= MAX_ACTIVE_KEYS) {
    return createErrorResponse(
      `You have reached the maximum of ${MAX_ACTIVE_KEYS} active API keys. Revoke one before creating another.`,
      422,
    );
  }

  // Generate key material. The service-role client is required for INSERT
  // because the RLS policy withholds INSERT from all client roles — key
  // creation is intentionally a server-side operation so we fully control
  // the hash calculation and never trust the client to supply its own hash.
  const { key, hash, prefix } = await generateApiKey();

  const { data: inserted, error: insertError } = await supabaseAdmin()
    .from("api_keys")
    .insert({
      user_id: user.id,
      name: name.trim(),
      key_hash: hash,
      key_prefix: prefix,
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (insertError || !inserted) {
    console.error("[api-keys POST] Insert error:", insertError?.message);
    return createErrorResponse("Failed to create API key", 502);
  }

  // Return the plaintext key alongside the display-safe metadata.
  // This is the only time the plaintext is visible.
  return createApiResponse(
    {
      id: inserted.id,
      name: inserted.name,
      key_prefix: inserted.key_prefix,
      created_at: inserted.created_at,
      // The key itself — display once and discard.
      key,
    },
    201,
  );
}
