import type { MetadataRoute } from "next";

import { supabaseAdmin } from "@/lib/supabase";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ossfolio.qzz.io";

export const revalidate = 86400; // revalidate every 24 hours

/**
 * Generates the sitemap ids for sharding. Next.js will call sitemap() for each id.
 * The limit of 49,993 is used since static routes take up 7 slots (50,000 max total).
 */
export async function generateSitemaps() {
  const limit = 49993;
  
  try {
    const { count, error } = await supabaseAdmin()
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("visibility", "public");

    if (error || count === null) {
      console.error("Failed to fetch profile count for sitemap generation:", error);
      return [{ id: 0 }];
    }

    const numSitemaps = Math.ceil(count / limit) || 1;
    return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
  } catch (error) {
    console.error("Error generating sitemaps:", error);
    return [{ id: 0 }];
  }
}

/**
 * Generates the sitemap XML containing static and dynamic routes.
 * Dynamic routes (profiles) are fetched from Supabase based on the requested id (shard).
 */
export default async function sitemap({ id = 0 }: { id?: number } = {}): Promise<MetadataRoute.Sitemap> {
  const limit = 49993;
  const start = id * limit;
  const end = start + limit - 1;

  let profiles: { username: string; updated_at?: string }[] = [];
  try {
    const { data, error } = await supabaseAdmin()
      .from("profiles")
      .select("username, updated_at")
      .eq("visibility", "public")
      .range(start, end);

    if (error) {
      console.error("Failed to fetch profiles for sitemap:", error);
    } else if (data) {
      profiles = data;
    }
  } catch (error) {
    console.error("Unexpected error fetching profiles for sitemap:", error);
  }

  const dynamicRoutes: MetadataRoute.Sitemap = profiles.map((profile) => ({
    url: `${siteUrl}/${profile.username}`,
    lastModified: profile.updated_at ? new Date(profile.updated_at) : new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/discover`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/score-explained`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  return [...staticRoutes, ...dynamicRoutes];
}
