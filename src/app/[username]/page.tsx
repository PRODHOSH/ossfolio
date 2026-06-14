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
  return {
    title: `${username} — OSSfolio`,
    description: `View ${username}'s open-source profile on OSSfolio.`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  // Base profile + repos (already-working live data) plus the new live extras.
  // Each extra fetch fails soft (empty / zero) so a rate-limited Search call
  // never takes down the whole page.
  const [user, repos, liveStats, orgs] = await Promise.all([
    fetchGitHubUser(username),
    fetchGitHubRepos(username),
    fetchLiveStats(username),
    fetchOrganizations(username),
  ]);

  if (!user) notFound();

  const mappedRepos = mapRepos(repos);
  const techStack = deriveTechStack(repos);

  // Heatmap is not available from unauthenticated REST, so we use a seeded
  // placeholder and surface its total as the headline contribution count.
  const { weeks: heatmap, totalContributions } = generateMockHeatmap(username);

  // Streaks are computed on the server (once, with the server's date) and passed
  // down as plain numbers, so the client never recomputes them — no hydration drift.
  const { current: currentStreak, longest: longestStreak } = computeStreaks(heatmap);

  const stats = { ...liveStats, totalContributions };
  const liveScore = calculateScore(stats, mappedRepos);

  // DB-first: prefer the stored (synced) score so every visitor — including
  // signed-out ones — sees the same official number that feeds the leaderboard.
  // Falls back to the live-computed score if this user hasn't synced a row yet.
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
    // Ignore and use the live score — a Supabase hiccup must not break the page.
  }

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#ffffff", minHeight: "100vh" }}>
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
        />
      </main>
      <Footer />
    </>
  );
}
