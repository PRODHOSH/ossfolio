import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createApiResponse, createErrorResponse } from "@/lib/validators/api";

// Runtime managed by @opennextjs/cloudflare

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
  if (token.startsWith("osk_")) return null;
  return token;
}

/**
 * DELETE /api/settings/api-keys/[id]
 *
 * Revokes (soft-deletes) the specified API key.
 * The key must belong to the authenticated user; attempting to revoke another
 * user's key returns 404 rather than 403, so the existence of the key is not
 * revealed to the caller.
 *
 * The row is retained with `revoked_at` set rather than hard-deleted, so
 * audit logs remain intact and we can surface "this key was revoked on <date>"
 * to the user later.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const token = extractToken(request);
  if (!token) return createErrorResponse("Unauthorized", 401);

  const supabase = createAuthClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return createErrorResponse("Unauthorized", 401);

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return createErrorResponse("Invalid key ID", 400);
  }

  // The RLS policy `api_keys_revoke_own` restricts the UPDATE to rows where
  // `user_id = auth.uid()`, so a caller can never revoke another user's key.
  // If the key doesn't exist or belongs to someone else, `count` is 0.
  const { count, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null); // Prevent double-revoke from returning a misleading 200

  if (error) {
    console.error("[api-keys DELETE] Supabase error:", error.message);
    return createErrorResponse("Failed to revoke API key", 502);
  }

  if (count === 0) {
    // Either the key doesn't exist, already revoked, or belongs to someone else.
    return createErrorResponse("API key not found", 404);
  }

  return createApiResponse({ revoked: true });
}
