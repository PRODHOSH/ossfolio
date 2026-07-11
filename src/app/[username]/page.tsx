import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TemporaryUnavailableFallback } from "@/components/layout/TemporaryUnavailableFallback";

import { ProfileView } from "@/components/profile/ProfileView";
import {
  fetchLiveStats,
  fetchOrganizations,
  deriveTechStack,
  mapRepos,
  fetchMergedPRs,
} from "@/lib/profile-data";
import { generateMockHeatmap, computeStreaks } from "@/lib/mock";
import { fetchContributionCalendar } from "@/lib/github";
import { calculateScore } from "@/lib/score";
import { supabase } from "@/lib/supabase";
import { fetchWithTimeout, isTimeoutError } from "@/lib/fetch-with-timeout";


export const runtime = "edge";

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  blog: string | null;
  location: string | null;
  twitter_username: string | null;
}

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

async function fetchGitHubUser(username: string): Promise<GitHubUser | null> {
  const res = await fetchWithTimeout(
    `https://api.github.com/users/${username}`,
    {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    },
    10_000
  );
  if (!res.ok) {
    try {
      const err = await res.json();
      if (err.message && err.message.toLowerCase().includes("rate limit")) {
        throw new Error("RateLimit");
      }
    } catch (e) {
      if (e instanceof Error && e.message === "RateLimit") throw e;
    }
    return null;
  }

  return res.json() as Promise<GitHubUser>;
}

async function fetchGitHubRepos(username: string) {
  const res = await fetchWithTimeout(
    `https://api.github.com/users/${username}/repos?sort=stars&per_page=100&type=owner`,
    {
      headers: { Accept: "application/vnd.github.mercy-preview+json" },
      next: { revalidate: 3600 },
    },
    10_000
  );
  if (!res.ok) return [];
  const repos = await res.json();
  return repos.filter((r: { fork: boolean }) => !r.fork).slice(0, 6);
}


export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  let user: GitHubUser | null = null;
  try {
    user = await fetchGitHubUser(username);
  } catch {
    // Rate limit or network error - fall back to minimal metadata
  }
  if (!user) {
    const fallbackDescription = `Open-source profile for ${username}.`;
    return {
      title: `${username} - OSSfolio`,
      description: fallbackDescription,
      // Always emit openGraph/twitter blocks on a profile route — even when the
      // GitHub lookup fails (rate limit / network). Returning without them let
      // the root layout's static `/og-image.png` be inherited here, which is why
      // shared profile links could fall back to the generic card. Neither block
      // sets `images`, so the per-user `opengraph-image.tsx` / `twitter-image.tsx`
      // file convention remains the single source of og:image and twitter:image.
      openGraph: {
        title: `${username} - OSSfolio`,
        description: fallbackDescription,
        type: "profile",
        siteName: "OSSfolio",
      },
      twitter: {
        card: "summary_large_image",
        title: `${username} - OSSfolio`,
        description: fallbackDescription,
      },
    };
  }
  const displayName = user.name || user.login;
  const bio = user.bio || "";
  const publicRepos = user.public_repos;
  const followers = user.followers;

  const description = bio
    ? `${bio} | ${publicRepos} repos, ${followers} followers`
    : `${displayName} has ${publicRepos} public repos and ${followers} followers on GitHub.`;

  return {
    title: `${displayName} - OSSfolio`,
    description,
    openGraph: {
      title: `${displayName} - OSSfolio`,
      description,
      type: "profile",
      siteName: "OSSfolio",
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} - OSSfolio`,
      description,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  // Base profile + repos (already-working live data) plus the new live extras.
  let rateLimited = false;
  let user: GitHubUser | null = null;
  let repos: any = [];
  let liveStats: any = null;
  let orgs: any = [];
  let contributionCalendar: any = null;

  try {
    user = await fetchGitHubUser(username);
  } catch (e) {
    if (e instanceof Error && e.message === "RateLimit") rateLimited = true;
    // If GitHub is slow/unreachable, avoid a hard crash.
    if (isTimeoutError(e)) {
      return (
        <TemporaryUnavailableFallback
          heading="Temporarily Unavailable"
          message={
            <>
              GitHub API is taking too long to respond for <strong>@{username}</strong>. Please try again in a moment.
            </>
          }
        />
      );
    }
    user = null;
  }

  // Other fetches can also error on rate limit; we treat them similarly.
  try { repos = await fetchGitHubRepos(username); } catch (e) { if (e instanceof Error && e.message === "RateLimit") rateLimited = true; }
  try { liveStats = await fetchLiveStats(username); } catch (e) { if (e instanceof Error && e.message === "RateLimit") rateLimited = true; }
  let mergedPRs: any[] = [];
  try { mergedPRs = await fetchMergedPRs(username, 10); } catch (e) { if (e instanceof Error && e.message === "RateLimit") rateLimited = true; }
  try { orgs = await fetchOrganizations(username); } catch (e) { if (e instanceof Error && e.message === "RateLimit") rateLimited = true; }
  try { contributionCalendar = await fetchContributionCalendar(username); } catch (e) { if (e instanceof Error && e.message === "RateLimit") rateLimited = true; }

  if (!user && !rateLimited) return notFound();

  if (!user && rateLimited) {
    return (
      <TemporaryUnavailableFallback
        heading="Temporarily Unavailable"
        message={
          <>
            GitHub API rate limit reached. Profile data for <strong>@{username}</strong> cannot be
            loaded right now. Please try again in a few minutes.
          </>
        }
      />
    );
  }

  const profileUser = user!;
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
  let profileRow: any = null;
  let customizationFetchSettled = false;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, score, updated_at, badges, headline, pinned_repos, custom_links, visibility")
      .eq("username", username)
      .maybeSingle();
    customizationFetchSettled = true;
    profileRow = data;
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
    customizationFetchSettled = true;
    // Soft isolation fallback
  }

  const customization = profileRow ? {
    headline: typeof profileRow.headline === "string" ? profileRow.headline : null,
    pinnedRepos: Array.isArray(profileRow.pinned_repos) ? profileRow.pinned_repos as string[] : [],
    customLinks: Array.isArray(profileRow.custom_links) ? profileRow.custom_links as Array<{ label: string; url: string }> : [],
    visibility: profileRow.visibility as string,
  } : null;

  if (customization?.headline && user) {
    user.bio = customization.headline;
  }

  return (
    <>
      <Navbar />
        {/* 💡 Fixed: Linked layout to design tokens and added transition curves */}
        {/* ProfileActions component within ProfileView handles GitHub profile sync/refresh state */}
      <main 
        style={{ 
          backgroundColor: "var(--color-canvas)", 
          color: "var(--color-ink)",
          minHeight: "100vh",
          transition: "background-color 0.2s ease, color 0.2s ease"
        }}
      >
        <ProfileView
          user={profileUser}
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
          mergedPRs={mergedPRs}
          customLinks={customization?.customLinks ?? []}
          customizationLoaded={customizationFetchSettled}
        />
      </main>
      <Footer />
    </>
  );
}