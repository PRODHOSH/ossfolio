import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizeString } from "@/lib/sanitizer";
import { sanitizeUrl, createApiResponse, createErrorResponse } from "@/lib/validators/api";

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
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
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
            ? badge.years.filter((y: unknown) => typeof y === "number" && y >= 2000 && y <= 2100).slice(0, 5)
            : [],
        };
      })
      .filter(Boolean);
  }

  if (body.visibility === "public" || body.visibility === "unlisted") {
    updates.visibility = body.visibility;
  }

  if (Object.keys(updates).length === 0) {
    return createErrorResponse("No valid fields to update", 400);
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return createErrorResponse("Failed to update profile", 500);
  }

  return createApiResponse({ success: true });
}
