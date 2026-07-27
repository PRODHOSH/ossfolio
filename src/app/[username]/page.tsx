import { notFound } from "next/navigation";
import type { ContributorStats } from "@/types";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TemporaryUnavailableFallback } from "@/components/layout/TemporaryUnavailableFallback";

import { ProfileView } from "@/components/profile/ProfileView";
import { deriveTechStack, mapRepos, type GitHubUser } from "@/lib/profile-data";
import {
  getProfileSnapshot,
  isSnapshotStale,
  syncProfileSnapshot,
} from "@/lib/profile-snapshot";
import { ProfileSyncing } from "@/components/profile/ProfileSyncing";
import { after } from "next/server";
import { generateMockHeatmap, computeStreaks } from "@/lib/mock";
import {
  fetchContributionCalendar,
  fetchContributorProfile,
} from "@/lib/github";
import { calculateScore } from "@/lib/score";
import { getProfileByUsername } from "@/lib/db";

// Runtime managed by @opennextjs/cloudflare

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
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
            GitHub API rate limit reached. Profile data for{" "}
            <strong>@{username}</strong> cannot be loaded right now. Please try
            again in a few minutes.
          </>
        }
      />
    );
  }

  const profileUser = user!;

  // Keep original full repos for accurate tech stack and score calculations
  const mappedRepos = mapRepos(repos);
  const techStack = deriveTechStack(repos);

  const { weeks: heatmap, totalContributions } = contributionCalendar
    ? contributionCalendar
    : generateMockHeatmap(username);

  // Streaks computation
  const { current: currentStreak, longest: longestStreak } =
    computeStreaks(heatmap);

  const stats = { ...liveStats, totalContributions };
  const liveScore = calculateScore(stats, mappedRepos);

  interface PinnedRepo {
    id: number;
    name: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    html_url: string;
    topics: string[];
  }

  // --- NEW: Fetch GraphQL profile specifically for Pinned Repos ---
  let pinnedReposRaw: PinnedRepo[] = [];
  try {
    const token =
      process.env.GITHUB_TOKEN || process.env.GITHUB_API_TOKEN || "";
    if (token) {
      const gqlProfile = await fetchContributorProfile(username, token);
      if (gqlProfile?.pinnedItems?.nodes?.length > 0) {
        // Map GraphQL shape to match REST API shape expected by ProfileView
        pinnedReposRaw = gqlProfile.pinnedItems.nodes.map((n: { name: string; description: string | null; stargazerCount: number; forkCount: number; primaryLanguage: { name: string; color: string } | null; url: string }, index: number) => ({
          id: -index - 1, // synthetic id for pinned repos to satisfy type
          name: n.name,
          description: n.description,
          stargazers_count: n.stargazerCount,
          forks_count: n.forkCount,
          language: n.primaryLanguage?.name || null,
          html_url: n.url,
          topics: [],
        }));
      }
    }
  } catch (err) {
    console.error(`Failed to fetch pinned repos for ${username}:`, err);
  }

  // Fallback Logic
  const displayRepos = pinnedReposRaw.length > 0 ? pinnedReposRaw : repos;
  const repoSectionTitle =
    pinnedReposRaw.length > 0 ? "Pinned repositories" : "Popular repositories";
  // ----------------------------------------------------------------

  interface Badge {
    program: string;
    years: number[];
  }

  interface ProfileRow {
    id: string;
    score?: number | null;
    updated_at?: string | null;
    badges?: Array<{ program?: string; years?: Array<string | number> }> | null;
    headline?: string | null;
    pinned_repos?: string[] | null;
    custom_links?: Array<{ label: string; url: string }> | null;
    visibility?: string | null;
  }

  let score = liveScore;
  let updatedAt: string | null = null;
  let badges: Badge[] = [];
  let profileId: string | null = null;
  let profileRow: ProfileRow | null = null;
  let customizationFetchSettled = false;
  let visibilityUnknown = false;
  try {
    const { data, error } = await getProfileByUsername(
      username,
      "id, score, updated_at, badges, headline, pinned_repos, custom_links, visibility",
    );
    customizationFetchSettled = true;

    // The Supabase client resolves with `{ data: null, error }` rather than throwing, so reading
    // only `data` would leave `profileRow` null on a database failure — indistinguishable, from
    // here, from a profile that simply has no row. The private check below would then pass and the
    // page would render. A privacy gate has to fail closed, so the error is captured and handled
    // below rather than discarded.
    if (error) {
      visibilityUnknown = true;
    } else {
      profileRow = data as unknown as ProfileRow;
    }

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
            (b) =>
              b &&
              typeof b.program === "string" &&
              b.program.trim() !== "" &&
              Array.isArray(b.years),
          )
          .map((b) => ({
            program: b.program as string,
            years: (b.years as Array<string | number>)
              .map((y) => Number(y))
              .filter((y: number) => !isNaN(y)),
          }));
      }
    }
  } catch {
    customizationFetchSettled = true;
    visibilityUnknown = true;
    // Soft isolation fallback
  }

  // Both checks below are deliberately *outside* the try above, and that placement is the whole
  // point rather than a stylistic choice.
  //
  // `notFound()` works by throwing. Inside that try, the bare `catch` would swallow it — the page
  // would carry straight on and render the very profile the setting exists to hide. This is the
  // documented reason Next tells you to call notFound()/redirect() outside try/catch, and it is a
  // silent failure: nothing errors, the 404 simply never happens.
  //
  // Failing closed on an unknown visibility matters for the same reason. Note this does *not* touch
  // the ordinary "never signed up" path: that returns no error and no row, and such a profile cannot
  // be private (private requires a stored row), so it still renders from GitHub data exactly as
  // before. Only a genuine database failure trips this.
  if (visibilityUnknown) {
    throw new Error(`Could not verify profile visibility for "${username}"`);
  }

  // `private` means the page does not exist. This is an explicit check rather than an RLS policy:
  // ossfolio renders /[username] for any GitHub account, signed up or not, so a null `profileRow` is
  // the ordinary case. If RLS hid private rows, this code could not tell "private" from "never
  // signed up" — it would fall through and render the public GitHub data instead of 404ing, and the
  // setting would look like it worked while doing nothing.
  if (profileRow?.visibility === "private") {
    return notFound();
  }

  const customization = profileRow
    ? {
        headline:
          typeof profileRow.headline === "string" ? profileRow.headline : null,
        pinnedRepos: Array.isArray(profileRow.pinned_repos)
          ? (profileRow.pinned_repos as string[])
          : [],
        customLinks: Array.isArray(profileRow.custom_links)
          ? (profileRow.custom_links as Array<{ label: string; url: string }>)
          : [],
        visibility: profileRow.visibility as string,
      }
    : null;

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
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
      >
        <ProfileView
          user={profileUser}
          repos={displayRepos}
          repoSectionTitle={repoSectionTitle}
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
          pinnedRepos={customization?.pinnedRepos ?? []}
          customizationLoaded={customizationFetchSettled}
        />
      </main>
      <Footer />
    </>
  );
}
