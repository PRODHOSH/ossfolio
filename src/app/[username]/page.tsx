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
import { generateMockHeatmap } from "@/lib/mock";
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

  if (res.status === 403 || res.status === 429) {
    throw new Error("GITHUB_RATE_LIMIT");
  }

  if (!res.ok) return null;

  return res.json();
}

async function fetchGitHubRepos(username: string) {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=stars&per_page=12&type=owner`,
    {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    },
  );

  if (res.status === 403 || res.status === 429) {
    throw new Error("GITHUB_RATE_LIMIT");
  }

  if (!res.ok) return [];

  const repos = await res.json();
  return repos.filter((r: { fork: boolean }) => !r.fork).slice(0, 6);
}
export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `${username} — OSSfolio`,
    description: `View ${username}'s open-source profile on OSSfolio.`,

    openGraph: {
      title: `${username} — OSSfolio`,
      description: `View ${username}'s open-source profile on OSSfolio.`,
    },

    twitter: {
      card: "summary_large_image",
      title: `${username} — OSSfolio`,
      description: `View ${username}'s open-source profile on OSSfolio.`,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  let githubUnavailable = false;

  const [userResult, reposResult, liveStats, orgs] = await Promise.allSettled([
    fetchGitHubUser(username),
    fetchGitHubRepos(username),
    fetchLiveStats(username),
    fetchOrganizations(username),
  ]);
  const user = userResult.status === "fulfilled" ? userResult.value : null;

  const repos = reposResult.status === "fulfilled" ? reposResult.value : [];

  if (userResult.status === "rejected" || reposResult.status === "rejected") {
   const error =
  userResult.status === "rejected"
    ? userResult.reason
    : reposResult.status === "rejected"
      ? reposResult.reason
      : null;

    if (error instanceof Error && error.message === "GITHUB_RATE_LIMIT") {
      githubUnavailable = true;
    }
  }
if (!user && !githubUnavailable) {
  notFound();
}
if (!user && githubUnavailable) {
  return (
    <>
      <Navbar />
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            padding: "16px",
            border: "1px solid #fbbf24",
            borderRadius: "8px",
            backgroundColor: "#fffbeb",
            color: "#92400e",
          }}
        >
          GitHub data is temporarily unavailable. Please try again in a few minutes.
        </div>
      </main>
      <Footer />
    </>
  );
}

  const mappedRepos = mapRepos(repos);
  const techStack = deriveTechStack(repos);

  // Heatmap is not available from unauthenticated REST, so we use a seeded
  // placeholder and surface its total as the headline contribution count.
  const { weeks: heatmap, totalContributions } = generateMockHeatmap(username);

const statsData =
  liveStats.status === "fulfilled"
    ? liveStats.value
    : {
        totalCommits: 0,
        totalPRs: 0,
        totalIssues: 0,
        totalReviews: 0,
        totalContributions: 0,
      };

const organizations =
  orgs.status === "fulfilled" ? orgs.value : [];
const stats = { ...statsData, totalContributions };
  const liveScore = calculateScore(stats, mappedRepos);

  // DB-first: prefer the stored (synced) score so every visitor — including
  // signed-out ones — sees the same official number that feeds the leaderboard.
  // Falls back to the live-computed score if this user hasn't synced a row yet.
  let score = liveScore;
  try {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("score")
      .eq("username", username)
      .maybeSingle();
    if (profileRow && typeof profileRow.score === "number") {
      score = profileRow.score;
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
          orgs={organizations}
          heatmap={heatmap}
          score={score}
           githubUnavailable={githubUnavailable}
        />
      </main>
      <Footer />
    </>
  );
}
