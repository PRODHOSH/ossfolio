import { type NextRequest } from "next/server";
import { createApiResponse, createErrorResponse } from "@/lib/validators/api";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  if (!username) {
    return createErrorResponse("Username is required", 400);
  }

  const cleanUsername = username.toLowerCase();

  // 1. Authenticate user session
  const authHeader = request.headers.get("authorization");
  let userId: string | null = null;
  let authUsername: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const { data } = await supabase.auth.getUser(token);
    if (data.user) {
      userId = data.user.id;
      authUsername = (data.user.user_metadata?.user_name || "").toLowerCase();
    }
  } else {
    // Fallback to cookie-based session
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      userId = data.session.user.id;
      authUsername = (data.session.user.user_metadata?.user_name || "").toLowerCase();
    }
  }

  if (!userId) {
    return createErrorResponse("Unauthorized", 401);
  }

  // 2. Verify Profile Ownership
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", cleanUsername)
    .maybeSingle();

  const isOwner =
    (profile && profile.id === userId) ||
    authUsername === cleanUsername;

  if (!isOwner) {
    return createErrorResponse(
      "Forbidden: Analytics are private to the profile owner",
      403
    );
  }

  // 3. Query params for range (default 30 days)
  const searchParams = request.nextUrl.searchParams;
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") || "30", 10)));
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: rawViews, error } = await supabase
    .from("profile_views")
    .select("viewed_at, referrer, country, ip_hash, device_type")
    .eq("username", cleanUsername)
    .gte("viewed_at", startDate)
    .order("viewed_at", { ascending: true });

  if (error) {
    console.error("Failed to query profile_views:", error.message);
    return createErrorResponse("Failed to fetch analytics", 500);
  }

  const views = rawViews || [];
  const totalViews = views.length;
  const uniqueVisitors = new Set(views.map((v) => v.ip_hash)).size;

  // 4. Aggregate daily trend data
  const dateMap = new Map<string, { views: number; uniqueIps: Set<string> }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    dateMap.set(dateStr, { views: 0, uniqueIps: new Set() });
  }

  for (const v of views) {
    const dateStr = new Date(v.viewed_at).toISOString().split("T")[0];
    if (dateMap.has(dateStr)) {
      const entry = dateMap.get(dateStr)!;
      entry.views += 1;
      entry.uniqueIps.add(v.ip_hash);
    }
  }

  const viewsTrend = Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    views: data.views,
    uniqueViews: data.uniqueIps.size,
  }));

  // 5. Aggregate Referrers
  const referrerMap = new Map<string, number>();
  for (const v of views) {
    const ref = v.referrer || "Direct";
    referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1);
  }

  const referrers = Array.from(referrerMap.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 6. Aggregate Top Countries
  const countryMap = new Map<string, number>();
  for (const v of views) {
    const c = v.country || "Unknown";
    countryMap.set(c, (countryMap.get(c) || 0) + 1);
  }

  const topCountries = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 7. Aggregate Device Breakdown
  const deviceMap = new Map<string, number>();
  for (const v of views) {
    const dev = v.device_type || "desktop";
    deviceMap.set(dev, (deviceMap.get(dev) || 0) + 1);
  }

  const deviceBreakdown = Array.from(deviceMap.entries()).map(([device, count]) => ({
    device,
    count,
  }));

  return createApiResponse({
    username: cleanUsername,
    days,
    totalViews,
    uniqueVisitors,
    viewsTrend,
    referrers,
    topCountries,
    deviceBreakdown,
  });
}
