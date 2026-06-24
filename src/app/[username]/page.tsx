import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileView } from "@/components/profile/ProfileView";
import {
  fetchLiveStats,
  fetchOrganizations,
  deriveTechStack,
  mapRepos,
} from "@/lib/profile-data";
import { generateMockHeatmap, computeStreaks } from "@/lib/mock";
import { fetchContributionCalendar } from "@/lib/github";
import { calculateScore } from "@/lib/score";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

async function fetchGitHubUser(username: string) {
  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchGitHubRepos(username: string) {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=stars&per_page=12&type=owner`,
    {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) return [];
  const repos = await res.json();
  return repos.filter((r: { fork: boolean }) => !r.fork).slice(0, 6);
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  const user = await fetchGitHubUser(username);
  if (!user) {
    return {
      title: `${username} - OSSfolio`,
      description: `Open-source profile for ${username}.`,
    };
  }

  const displayName = user.name || username;
  const description = user.bio
    ? `${user.bio} | ${user.public_repos} repos, ${user.followers} followers`
    : `${displayName} has ${user.public_repos} public repos and ${user.followers} followers on GitHub.`;

  return {
    title: `${displayName} - OSSfolio`,
    description,
    openGraph: {
      title: `${displayName} - OSSfolio`,
      description,
      images: [{ url: user.avatar_url, width: 400, height: 400, alt: `${displayName}'s avatar` }],
      type: "profile",
      siteName: "OSSfolio",
    },
    twitter: {
      card: "summary",
      title: `${displayName} - OSSfolio`,
      description,
      images: [user.avatar_url],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  // Base profile + repos (already-working live data) plus the new live extras.
  const [user, repos, liveStats, orgs, contributionCalendar] = await Promise.all([
    fetchGitHubUser(username),
    fetchGitHubRepos(username),
    fetchLiveStats(username),
    fetchOrganizations(username),
    fetchContributionCalendar(username),
  ]);

  if (!user) notFound();

  const mappedRepos = mapRepos(repos);
  const techStack = deriveTechStack(repos);

  // Heatmap calculation — use the user's real contribution calendar parsed from
  // GitHub's public endpoint. If that request failed (network error, rate limit,
  // markup change), fall back to the seeded placeholder so the page still renders.
  const { weeks: heatmap, totalContributions } = contributionCalendar
    ? contributionCalendar
    : generateMockHeatmap(username);

  // Streaks computation
  const { current: currentStreak, longest: longestStreak } = computeStreaks(heatmap);

  const stats = { ...liveStats, totalContributions };
  const liveScore = calculateScore(stats, mappedRepos);

  let score = liveScore;
  let updatedAt: string | null = null;
  try {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("score, updated_at")
      .eq("username", username)
      .maybeSingle();
    if (profileRow && typeof profileRow.score === "number") {
      score = profileRow.score;
    }
    if (profileRow && typeof profileRow.updated_at === "string") {
      updatedAt = profileRow.updated_at;
    }
  } catch {
    // Soft isolation fallback
  }
// Fetch custom links and check ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('custom_links')
    .eq('username', params.username)
    .single();
  
  const customLinks = profile?.custom_links || [];
  
  const { data: authData } = await supabase.auth.getUser();
  const isOwner = authData?.user?.user_metadata?.user_name === params.username;
  return (
    <>
      <Navbar />
      {/* 💡 Fixed: Linked layout to design tokens and added transition curves */}
      <main 
        style={{ 
          backgroundColor: "var(--color-canvas)", 
          color: "var(--color-ink)",
          minHeight: "100vh",
          transition: "background-color 0.2s ease, color 0.2s ease"
        }}
      >
        <ProfileView
          user={user}
          repos={repos}
          stats={stats}
          techStack={techStack}
          orgs={orgs}
          heatmap={heatmap}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          score={score}
          updatedAt={updatedAt}
          isOwner={isOwner}
          customLinks={customLinks}
        />
      </main>
      <Footer />
    </>
  );
}