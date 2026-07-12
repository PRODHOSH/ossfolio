import { notFound } from "next/navigation";
import type { ContributorStats } from "@/types";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TemporaryUnavailableFallback } from "@/components/layout/TemporaryUnavailableFallback";

import { ProfileView } from "@/components/profile/ProfileView";
import {
  deriveTechStack,
  mapRepos,
  type GitHubUser,
} from "@/lib/profile-data";
import {
  getProfileSnapshot,
  isSnapshotStale,
  syncProfileSnapshot,
} from "@/lib/profile-snapshot";
import { ProfileSyncing } from "@/components/profile/ProfileSyncing";
import { after } from "next/server";
import { generateMockHeatmap, computeStreaks } from "@/lib/mock";
import { fetchContributionCalendar } from "@/lib/github";
import { calculateScore } from "@/lib/score";
import { supabase } from "@/lib/supabase";


export const runtime = "edge";


interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  // Read the same snapshot the page body renders from, rather than calling GitHub
  // again here. `generateMetadata` blocks the response head, so a live fetch here
  // would put a GitHub round-trip back on the critical path and undo the TTFB win.
  // `getProfileSnapshot` is `cache()`d, so this shares one query with the page body.
  // A profile that hasn't synced yet simply falls through to the minimal metadata
  // below, and gets the rich card on its next render once the snapshot lands.
  const stored = await getProfileSnapshot(username);
  const user: GitHubUser | null = stored?.snapshot?.user ?? null;

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

  // DB-first: one query, instead of six sequential GitHub calls in the render path.
  const stored = await getProfileSnapshot(username);

  // Cold profile — nothing stored yet. Kick the sync off behind the response and
  // show a syncing state; `after()` runs once this response has already been sent,
  // so it costs the user nothing. The claim inside syncProfileSnapshot() means the
  // client polling this page cannot stampede GitHub with repeat syncs.
  if (!stored?.snapshot) {
    after(() => syncProfileSnapshot(username));
    return <ProfileSyncing username={username} />;
  }

  // Warm profile — render from the snapshot. If it's past its TTL, refresh it in the
  // background: the visitor still gets the stored copy instantly (stale-while-revalidate).
  if (isSnapshotStale(stored.syncedAt)) {
    after(() => syncProfileSnapshot(username));
  }

  // ProfileSnapshot types every field, so no casts are needed. Array-shaped fields all
  // get the same `?? []` default: an older row written before a field existed would
  // otherwise arrive undefined and throw when mapped.
  const snapshot = stored.snapshot;
  const rateLimited = snapshot.rateLimited;
  const user = snapshot.user;
  const repos = snapshot.repos ?? [];
  // ContributorStats requires every field, and fetchLiveStats already degrades to zeros
  // rather than throwing — so a null (failed) snapshot value degrades the same way here,
  // instead of spreading `null` into an object missing four required fields.
  const liveStats: ContributorStats = snapshot.liveStats ?? {
    totalCommits: 0,
    totalPRs: 0,
    totalIssues: 0,
    totalReviews: 0,
    totalContributions: 0,
  };
  const mergedPRs = snapshot.mergedPRs ?? [];
  const orgs = snapshot.orgs ?? [];
  const contributionCalendar = snapshot.contributionCalendar ?? null;

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