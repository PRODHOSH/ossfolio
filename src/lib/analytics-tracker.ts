import { supabase } from "@/lib/supabase";

export function parseReferrer(referrerHeader?: string | null): string {
  if (!referrerHeader || referrerHeader.trim() === "") {
    return "Direct";
  }

  const lower = referrerHeader.toLowerCase();

  if (lower.includes("github.com")) return "GitHub";
  if (lower.includes("t.co") || lower.includes("twitter.com") || lower.includes("x.com")) {
    return "Twitter / X";
  }
  if (lower.includes("linkedin.com") || lower.includes("lnkd.in")) return "LinkedIn";
  if (
    lower.includes("google.") ||
    lower.includes("bing.com") ||
    lower.includes("duckduckgo.com") ||
    lower.includes("yahoo.com")
  ) {
    return "Search Engine";
  }
  if (lower.includes("reddit.com")) return "Reddit";
  if (lower.includes("ycombinator.com")) return "Hacker News";
  if (lower.includes("dev.to") || lower.includes("hashnode.com") || lower.includes("medium.com")) {
    return "Tech Blogs";
  }

  try {
    const url = new URL(referrerHeader);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Other";
  }
}

export function parseDeviceType(userAgent?: string | null): "desktop" | "mobile" | "tablet" {
  if (!userAgent) return "desktop";
  const lower = userAgent.toLowerCase();
  if (lower.includes("ipad") || lower.includes("tablet") || (lower.includes("android") && !lower.includes("mobile"))) {
    return "tablet";
  }
  if (lower.includes("mobile") || lower.includes("iphone") || lower.includes("android")) {
    return "mobile";
  }
  return "desktop";
}

export function hashVisitorIp(ip: string): string {
  if (!ip) return "anon";
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `ip_${Math.abs(hash).toString(36)}`;
}

export interface TrackViewParams {
  username: string;
  referrerHeader?: string | null;
  visitorIp?: string | null;
  countryHeader?: string | null;
  cityHeader?: string | null;
  userAgent?: string | null;
}

export async function recordProfileView({
  username,
  referrerHeader,
  visitorIp,
  countryHeader,
  cityHeader,
  userAgent,
}: TrackViewParams): Promise<boolean> {
  if (!username || username.trim() === "") return false;

  const cleanUsername = username.toLowerCase();
  const referrer = parseReferrer(referrerHeader);
  const country = (countryHeader && countryHeader !== "XX" ? countryHeader : "Unknown").toUpperCase();
  const city = cityHeader || "Unknown";
  const device_type = parseDeviceType(userAgent);
  const ip_hash = hashVisitorIp(visitorIp || "127.0.0.1");

  try {
    // Deduplicate / rate-limit: Check if same ip_hash viewed this username within 10 minutes (600s)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentView } = await supabase
      .from("profile_views")
      .select("id")
      .eq("username", cleanUsername)
      .eq("ip_hash", ip_hash)
      .gte("viewed_at", tenMinutesAgo)
      .limit(1)
      .maybeSingle();

    if (recentView) {
      // Already recorded a view from this visitor within 10 minutes
      return false;
    }

    // Insert new view log entry
    const { error } = await supabase.from("profile_views").insert({
      username: cleanUsername,
      referrer,
      country,
      city,
      ip_hash,
      device_type,
      viewed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to insert profile view:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Analytics view tracking bypassed:", err);
    return false;
  }
}
