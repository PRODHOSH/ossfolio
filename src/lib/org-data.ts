import { supabase } from "@/lib/supabase";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { GITHUB_API_BASE } from './constants';

export interface OrgMember {
  login: string;
  avatarUrl: string;
  role: "owner" | "admin" | "member";
  score: number;
  contributions: number;
}

export interface OrgRepo {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  url: string;
}

export interface OrgStats {
  memberCount: number;
  repoCount: number;
  totalStars: number;
  totalForks: number;
  teamScore: number;
  topLanguages: string[];
}

export interface OrgDashboardData {
  id?: string;
  name: string;
  slug: string;
  avatarUrl: string;
  description: string | null;
  websiteUrl: string | null;
  githubUrl: string;
  isClaimed: boolean;
  claimedBy?: string | null;
  claimedAt?: string | null;
  stats: OrgStats;
  members: OrgMember[];
  repos: OrgRepo[];
  updatedAt: string;
}

/**
 * Calculates aggregate team contributor score from member list and repo stats
 */
export function calculateTeamScore(members: OrgMember[], totalStars: number): number {
  if (!members || members.length === 0) return 60;
  const avgMemberScore = members.reduce((sum, m) => sum + m.score, 0) / members.length;
  const starBonus = Math.min(25, Math.floor(totalStars / 50));
  return Math.min(99, Math.max(40, Math.floor(avgMemberScore + starBonus)));
}

/**
 * Fetch and aggregate organization dashboard data
 */
export async function getOrganizationData(
  orgSlug: string
): Promise<OrgDashboardData> {
  const cleanSlug = orgSlug.trim().toLowerCase();

  // Try checking Supabase DB cache first
  try {
    const { data: dbOrg } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", cleanSlug)
      .maybeSingle();

    // 1. Fixed Falsy Cache Bug: Explicitly check for type 'number' instead of 
    // relying on truthiness, which would skip the cache for orgs with 0 members.
    if (dbOrg && dbOrg.stats && typeof dbOrg.stats.memberCount === "number") {
      const updatedAt = new Date(dbOrg.updated_at || dbOrg.created_at || 0).getTime();
      const ageMs = Date.now() - updatedAt;
      // 12 hour cache freshness
      if (ageMs < 12 * 60 * 60 * 1000) {
        return {
          id: dbOrg.id,
          name: dbOrg.name,
          slug: dbOrg.slug,
          avatarUrl: dbOrg.avatar_url || `https://github.com/${cleanSlug}.png`,
          description: dbOrg.description || null,
          websiteUrl: dbOrg.website_url || null,
          githubUrl: `https://github.com/${cleanSlug}`,
          isClaimed: !!dbOrg.claimed_by,
          claimedBy: dbOrg.claimed_by || null,
          claimedAt: dbOrg.claimed_at || null,
          stats: dbOrg.stats as OrgStats,
          members: (dbOrg.stats.members as OrgMember[]) || [],
          repos: (dbOrg.stats.repos as OrgRepo[]) || [],
          updatedAt: dbOrg.updated_at || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn("Error checking organization cache:", err);
  }

  // Fetch live from GitHub API
  return await refreshOrganizationStats(cleanSlug);
}

/**
 * Re-fetch live GitHub organization data and update DB cache
 */
export async function refreshOrganizationStats(
  orgSlug: string
): Promise<OrgDashboardData> {
  const cleanSlug = orgSlug.trim().toLowerCase();

  let name = cleanSlug;
  let avatarUrl = `https://github.com/${cleanSlug}.png`;
  let description: string | null = null;
  let websiteUrl: string | null = null;

  let publicReposCount = 0;
  let members: OrgMember[] = [];
  let repos: OrgRepo[] = [];
  let totalStars = 0;
  let totalForks = 0;
  const langCounts: Record<string, number> = {};

  try {
    const [orgRes, reposRes, membersRes] = await Promise.allSettled([
      fetchWithTimeout(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(cleanSlug)}`, {
        headers: { Accept: "application/vnd.github.v3+json" },
      }),
      fetchWithTimeout(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(cleanSlug)}/repos?per_page=30&sort=updated`, {
        headers: { Accept: "application/vnd.github.v3+json" },
      }),
      fetchWithTimeout(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(cleanSlug)}/public_members?per_page=30`, {
        headers: { Accept: "application/vnd.github.v3+json" },
      }),
    ]);

    if (orgRes.status === "fulfilled" && orgRes.value.ok) {
      const orgJson = await orgRes.value.json();
      name = orgJson.name || orgJson.login || name;
      avatarUrl = orgJson.avatar_url || avatarUrl;
      description = orgJson.description || null;
      websiteUrl = orgJson.blog || null;
      publicReposCount = orgJson.public_repos || 0;
    }

    if (reposRes.status === "fulfilled" && reposRes.value.ok) {
      const reposJson = await reposRes.value.json();
      if (Array.isArray(reposJson)) {
        repos = reposJson.map((r: any) => {
          const stars = r.stargazers_count || 0;
          const forks = r.forks_count || 0;
          totalStars += stars;
          totalForks += forks;
          if (r.language) {
            langCounts[r.language] = (langCounts[r.language] || 0) + 1;
          }
          return {
            name: r.name,
            description: r.description || null,
            stars,
            forks,
            language: r.language || null,
            url: r.html_url,
          };
        });
      }
    }

    if (membersRes.status === "fulfilled" && membersRes.value.ok) {
      const membersJson = await membersRes.value.json();
      if (Array.isArray(membersJson)) {
        members = membersJson.map((m: any, idx: number) => ({
          login: m.login,
          avatarUrl: m.avatar_url,
          role: idx === 0 ? "owner" : "member",
          score: Math.min(99, Math.max(50, 85 - idx * 3)),
          contributions: Math.max(10, 150 - idx * 12),
        }));
      }
    }
  } catch (err) {
    console.error("Error refreshing live organization data:", err);
  }

  // Fallback demo member if none returned
  if (members.length === 0) {
    members = [
      {
        login: cleanSlug,
        avatarUrl,
        role: "owner",
        score: 85,
        contributions: 120,
      },
    ];
  }

  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([lang]) => lang);

  const teamScore = calculateTeamScore(members, totalStars);

  const stats: OrgStats = {
    memberCount: members.length,
    repoCount: Math.max(publicReposCount, repos.length),
    totalStars,
    totalForks,
    teamScore,
    topLanguages: topLanguages.length > 0 ? topLanguages : ["TypeScript", "JavaScript"],
  };

  const dashboardData: OrgDashboardData = {
    name,
    slug: cleanSlug,
    avatarUrl,
    description,
    websiteUrl,
    githubUrl: `https://github.com/${cleanSlug}`,
    isClaimed: false,
    stats,
    members,
    repos,
    updatedAt: new Date().toISOString(),
  };

  // Upsert to Supabase
  try {
    const { data: updatedDb, error: upsertError } = await supabase
      .from("organizations")
      .upsert(
        {
          name,
          slug: cleanSlug,
          avatar_url: avatarUrl,
          description,
          website_url: websiteUrl,
          score: teamScore,
          stats: {
            ...stats,
            members,
            repos,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug", ignoreDuplicates: false } // ensure updates happen strictly
      )
      .select("*")
      .maybeSingle();

    if (upsertError) throw upsertError;

    if (updatedDb) {
      dashboardData.id = updatedDb.id;
      dashboardData.isClaimed = !!updatedDb.claimed_by;
      dashboardData.claimedBy = updatedDb.claimed_by || null;
      dashboardData.claimedAt = updatedDb.claimed_at || null;
    }
  } catch (err) {
    console.warn("Failed to persist organization data to Supabase:", err);
  }

  return dashboardData;
}

/**
 * Claim an unclaimed organization profile
 */
export async function claimOrganization(
  orgSlug: string,
  userId: string
): Promise<boolean> {
  const cleanSlug = orgSlug.trim().toLowerCase();

  try {
    // 2. Atomic claim: update only if claimed_by is currently null,
    // and select the result to verify the row was actually modified.
    const { data, error } = await supabase
      .from("organizations")
      .update({
        claimed_by: userId,
        claimed_at: new Date().toISOString(),
      })
      .eq("slug", cleanSlug)
      .is("claimed_by", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Error claiming organization:", error);
      return false;
    }

    // Only return true if the update matched the condition and returned data
    return !!data;
  } catch (err) {
    console.error("Error claiming organization:", err);
  }

  return false;
}
