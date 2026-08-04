import type { MetadataRoute } from "next";

import { supabaseAdmin } from "@/lib/supabase";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ossfolio.qzz.io";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch public profiles for dynamic sitemap generation
  // We use supabaseAdmin here just to be safe with server-side environment, 
  // but supabase (anon) works too if configured correctly.
  let profiles: { username: string; updated_at?: string }[] = [];
  try {
    // using the admin client to bypass any potential RLS read issues server-side,
    // though public visibility should be readable by anon.
    const { data } = await supabaseAdmin()
      .from("profiles")
      .select("username, updated_at")
      .eq("visibility", "public");
    if (data) {
      profiles = data;
    }
  } catch (error) {
    console.error("Failed to fetch profiles for sitemap:", error);
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
