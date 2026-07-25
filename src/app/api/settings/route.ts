import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizeString } from "@/lib/sanitizer";
import {
  sanitizeUrl,
  createApiResponse,
  createErrorResponse,
} from "@/lib/validators/api";

export const runtime = "edge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function createAuthClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function extractToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

export async function GET(request: NextRequest) {
  const token = extractToken(request);
  if (!token) {
    return createErrorResponse("Unauthorized", 401);
  }

  const supabase = createAuthClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return createErrorResponse("Unauthorized", 401);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("headline, pinned_repos, custom_links, badges, visibility")
    .eq("id", user.id)
    .single();

  if (error) {
    return createErrorResponse("Profile not found", 404);
  }

  return createApiResponse(data);
}

export async function PUT(request: NextRequest) {
  const token = extractToken(request);
  if (!token) {
    return createErrorResponse("Unauthorized", 401);
  }

  const supabase = createAuthClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return createErrorResponse("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return createErrorResponse("Invalid JSON body", 400);
    }
  } catch {
    return createErrorResponse("Invalid JSON body", 400);
  }

  const updates: Record<string, unknown> = {};

  if (body.headline !== undefined) {
    const sanitized = sanitizeString(body.headline, 160);
    if (sanitized) updates.headline = sanitized;
  }

  if (Array.isArray(body.pinned_repos)) {
    updates.pinned_repos = body.pinned_repos
      .slice(0, 6)
      .map((r: unknown) => sanitizeString(r, 100))
      .filter(Boolean);
  }

  if (Array.isArray(body.custom_links)) {
    updates.custom_links = body.custom_links
      .slice(0, 5)
      .map((link: unknown) => {
        if (!link || typeof link !== "object") return null;
        const l = link as Record<string, unknown>;
        const url = sanitizeUrl(l.url);
        if (!url) return null;
        return {
          label: sanitizeString(l.label, 50),
          url,
        };
      })
      .filter(Boolean);
  }

  if (Array.isArray(body.badges)) {
    updates.badges = body.badges
      .slice(0, 10)
      .map((b: unknown) => {
        if (!b || typeof b !== "object") return null;
        const badge = b as Record<string, unknown>;
        return {
          program: sanitizeString(badge.program, 50),
          years: Array.isArray(badge.years)
            ? badge.years
                .filter(
                  (y: unknown) =>
                    typeof y === "number" && y >= 2000 && y <= 2100,
                )
                .slice(0, 5)
            : [],
        };
      })
      .filter(Boolean);
  }

  // 'private' is new: the column's CHECK previously rejected it, so the third state the UI is meant
  // to offer could never be stored. Still an explicit allow-list rather than a passthrough — the
  // value lands in a CHECK-constrained column, and a 400 from us beats a constraint violation from
  // Postgres.
  if (
    body.visibility === "public" ||
    body.visibility === "unlisted" ||
    body.visibility === "private"
  ) {
    updates.visibility = body.visibility;
  }

  if (Object.keys(updates).length === 0) {
    return createErrorResponse("No valid fields to update", 400);
  }

  // `updated_at` is maintained by the `profiles_set_updated_at` trigger. The client is not
  // granted the column (Explore orders by it, so a writable timestamp is forgeable), and
  // writing it here would now fail with `permission denied`.

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return createErrorResponse("Failed to update profile", 500);
  }

  return createApiResponse({ success: true });
}

/**
 * Delete the signed-in user's account.
 *
 * The identity comes from `auth.getUser()` on a client scoped to the caller's bearer token, never
 * from a user id in the request body — otherwise anyone holding any valid token could delete anyone
 * else's account by naming them.
 *
 * This deletes the *auth user*, not the profile row, and that is deliberate rather than an
 * oversight:
 *
 *   1. `profiles.id` is `references auth.users(id) on delete cascade`, so removing the auth user
 *      removes the profile with it. Deleting the row separately would be redundant and would open a
 *      window where the profile is gone but the account still exists.
 *
 *   2. Migration 20260713000000 revokes DELETE on `public.profiles` from `authenticated` outright,
 *      on the grounds that nothing in the app deletes a profile from the client. That is still the
 *      right call — re-granting DELETE just to support this endpoint would widen the client's write
 *      surface permanently to serve one server-side operation. Deleting through the auth admin API
 *      leaves that hardening intact.
 *
 *   3. `auth.admin.deleteUser` requires the service-role key by design. The anon key cannot call it,
 *      which is precisely why account deletion belongs on the server rather than in the browser.
 */
export async function DELETE(request: NextRequest) {
  const token = extractToken(request);
  if (!token) {
    return createErrorResponse("Unauthorized", 401);
  }

  const authed = createAuthClient(token);
  const {
    data: { user },
    error: authError,
  } = await authed.auth.getUser();

  if (authError || !user) {
    return createErrorResponse("Unauthorized", 401);
  }

  // Checked rather than assumed: without the service key the admin call below fails in a way that
  // looks like a server bug, and the user would be told their deletion failed with no idea why. A
  // 503 says "this deployment can't do that", which is the truth.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return createErrorResponse("Account deletion is not configured", 503);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return createErrorResponse("Failed to delete account", 500);
  }

  return createApiResponse({ deleted: true });
}
