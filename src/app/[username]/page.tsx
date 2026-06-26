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
  if (!res.ok) {
    // Detect rate limit based on GitHub response
    try {
      const err = await res.json();
      if (err.message && err.message.toLowerCase().includes("rate limit")) {
        throw new Error("RateLimit");
      }
    } catch {}
    return null;
  }
  return res.json();
}

async function fetchGitHubRepos(username: string) {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=stars&per_page=100&type=owner`,
    {
      headers: { Accept: "application/vnd.github.mercy-preview+json" },
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) return [];
  const repos = await res.json();
  return repos.filter((r: { fork: boolean }) => !r.fork).slice(0, 6);
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await fetchGitHubUser(username);
  if (result.status !== "ok") {
    return {
      title: `${username} - OSSfolio`,
      description: `Open-source profile for ${username}.`,
    };
  }
  const user = result.data;
  const displayName = user.name || username;
  const bio = user.bio || "";
  const publicRepos = user.public_repos;
  const followers = user.followers;
  const avatarUrl = user.avatar_url;

  const description = bio
    ? `${bio} | ${publicRepos} repos, ${followers} followers`
    : `${displayName} has ${publicRepos} public repos and ${followers} followers on GitHub.`;

  return {
    title: `${displayName} - OSSfolio`,
    description,
    openGraph: {
      title: `${displayName} - OSSfolio`,
      description,
      // og:image is auto-injected by opengraph-image.tsx
      type: "profile",
      siteName: "OSSfolio",
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} - OSSfolio`,
      description,
      // twitter:image is auto-injected by twitter-image.tsx
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  // Base profile + repos (already-working live data) plus the new live extras.
  let rateLimited = false;
  let user: any = null;
  let repos: any = [];
  let liveStats: any = null;
  let orgs: any = [];
  let contributionCalendar: any = null;

  try {
    user = await fetchGitHubUser(username);
  } catch (e) {
    if (e instanceof Error && e.message === "RateLimit") rateLimited = true;
    user = null;
  }
  // Other fetches can also error on rate limit; we treat them similarly.
  try { repos = await fetchGitHubRepos(username); } catch (e) { if (e instanceof Error && e.message === "RateLimit") rateLimited = true; }
  try { liveStats = await fetchLiveStats(username); } catch (e) { if (e instanceof Error && e.message === "RateLimit") rateLimited = true; }
  try { orgs = await fetchOrganizations(username); } catch (e) { if (e instanceof Error && e.message === "RateLimit") rateLimited = true; }
  try { contributionCalendar = await fetchContributionCalendar(username); } catch (e) { if (e instanceof Error && e.message === "RateLimit") rateLimited = true; }

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
  let badges: any[] = [];
  let profileId: string | null = null;
  try {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id, score, updated_at, badges")
      .eq("username", username)
      .maybeSingle();
    if (profileRow) {
      profileId = profileRow.id;
      if (typeof profileRow.score === "number") {
        score = profileRow.score;
      }
      if (typeof profileRow.updated_at === "string") {
        updatedAt = profileRow.updated_at;
      }
      if (Array.isArray(profileRow.badges)) {
        badges = profileRow.badges
          .filter(
            (b: any) =>
              b &&
              typeof b.program === "string" &&
              b.program.trim() !== "" &&
              Array.isArray(b.years)
          )
          .map((b: any) => ({
            program: b.program,
            years: b.years
              .map((y: any) => Number(y))
              .filter((y: number) => !isNaN(y)),
          }));
      }
    }
  } catch {
    // Soft isolation fallback
  }

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
          badges={badges}
          profileId={profileId}
          rateLimited={rateLimited}
        />
      </main>
      <Footer />
    </>
  );
}