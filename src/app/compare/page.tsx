import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  fetchLiveStats,
  fetchOrganizations,
  deriveTechStack,
  mapRepos,
} from "@/lib/profile-data";
import { fetchContributionCalendar } from "@/lib/github";
import { generateMockHeatmap } from "@/lib/mock";
import { calculateScore } from "@/lib/score";
import { supabase } from "@/lib/supabase";
import type { ContributorStats, Repo } from "@/types";
import { CompareForm } from "@/components/profile/CompareForm";
import { CompareCharts } from "@/components/profile/CompareCharts";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Compare Contributors",
  description:
    "Compare two open-source contributor profiles side by side on OSSfolio. See who has more commits, PRs, issues, and the higher contributor score.",
  openGraph: {
    title: "Compare Contributors - OSSfolio",
    description: "Side-by-side comparison of open-source contributor stats.",
  },
};

/* -------------------------------------------------------------------------- */
/* Data fetching — mirrors [username]/page.tsx but wrapped in try/catch        */
/* -------------------------------------------------------------------------- */

interface ProfileData {
  user: Record<string, unknown>;
  stats: ContributorStats;
  repos: Repo[];
  score: number;
}

async function fetchGitHubUser(username: string) {
  const encodedUsername = encodeURIComponent(username);
  const res = await fetch(`https://api.github.com/users/${encodedUsername}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub user lookup failed (${res.status})`);
  }
  return res.json();
}

async function fetchGitHubRepos(username: string) {
  // GitHub's /users/{username}/repos endpoint does not support sort=stars
  // (only created, updated, pushed, full_name). Fetch a page of repos with a
  // supported sort, then order by stargazers_count client-side for the top 6.
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&type=owner`,
    {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) {
    throw new Error(`GitHub repositories lookup failed (${res.status})`);
  }
  const repos = await res.json();
  return repos
    .filter((r: { fork: boolean }) => !r.fork)
    .sort(
      (a: { stargazers_count: number }, b: { stargazers_count: number }) =>
        (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0)
    )
    .slice(0, 6);
}

async function fetchProfile(username: string): Promise<ProfileData> {
  const [user, repos, liveStats, contributionCalendar] = await Promise.all([
    fetchGitHubUser(username),
    fetchGitHubRepos(username),
    fetchLiveStats(username),
    fetchContributionCalendar(username),
  ]);

  if (!user) throw new Error(`GitHub user "${username}" not found`);

  const mappedRepos = mapRepos(repos);

  const { totalContributions } = contributionCalendar
    ? contributionCalendar
    : generateMockHeatmap(username);

  const stats = { ...liveStats, totalContributions };
  const liveScore = calculateScore(stats, mappedRepos);

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
    // Soft fallback to live score
  }

  return { user, stats, repos: mappedRepos, score };
}

/* -------------------------------------------------------------------------- */
/* Page component                                                             */
/* -------------------------------------------------------------------------- */

interface ComparePageProps {
  searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const raw = await searchParams;
  const pick = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const a = pick(raw.a)?.trim();
  const b = pick(raw.b)?.trim();

  // ── No params → show the entry form ──────────────────────────────────────
  if (!a || !b) {
    return (
      <>
        <Navbar />
        <main
          id="main-content"
          style={{
            backgroundColor: "var(--color-canvas)",
            color: "var(--color-ink)",
            minHeight: "100vh",
            transition: "background-color 0.2s ease, color 0.2s ease",
          }}
        >
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "56px 20px" }}>
            <header style={{ marginBottom: "32px" }}>
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 500,
                  color: "var(--color-ink)",
                  letterSpacing: "-0.42px",
                  margin: 0,
                }}
              >
                Compare Contributors
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  color: "var(--color-ink-mute)",
                  margin: "8px 0 0 0",
                }}
              >
                Enter two GitHub usernames to compare their open-source stats side by side.
              </p>
            </header>

            <CompareForm />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ── Fetch both profiles in parallel; each wrapped in its own try/catch ───
  const normalizeError = (err: unknown) =>
      err instanceof Error ? err : new Error("Failed to load profile");

    const [resultA, resultB] = await Promise.all([
    fetchProfile(a).catch(normalizeError),
    fetchProfile(b).catch(normalizeError),
  ]);

  const profileA = resultA instanceof Error ? null : resultA;
  const profileB = resultB instanceof Error ? null : resultB;
  const errorA = resultA instanceof Error ? resultA.message : null;
  const errorB = resultB instanceof Error ? resultB.message : null;

  // ── Stat rows to compare ────────────────────────────────────────────────
  const statRows: { label: string; key: keyof ContributorStats }[] = [
    { label: "Commits", key: "totalCommits" },
    { label: "Pull Requests", key: "totalPRs" },
    { label: "Issues", key: "totalIssues" },
    { label: "Reviews", key: "totalReviews" },
    { label: "Contributions", key: "totalContributions" },
  ];

  const numberFormatter = new Intl.NumberFormat("en-US");

  const winnerScore =
    profileA && profileB
      ? profileA.score > profileB.score
        ? "a"
        : profileA.score < profileB.score
          ? "b"
          : null
      : null;

  return (
    <>
      <Navbar />
      <main
        style={{
          backgroundColor: "var(--color-canvas)",
          color: "var(--color-ink)",
          minHeight: "100vh",
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
      >
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "56px 20px" }}>
          {/* Header */}
          <header style={{ marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 500,
                color: "var(--color-ink)",
                letterSpacing: "-0.42px",
                margin: 0,
              }}
            >
              Compare Contributors
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "var(--color-ink-mute)",
                margin: "8px 0 0 0",
              }}
            >
              {a} vs {b}
            </p>
          </header>

          {/* Search again */}
          <CompareForm defaultA={a} defaultB={b} />

          {/* Two-column profile headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginTop: "32px",
            }}
            className="compare-grid"
          >
            {/* ── Column A ──────────────────────────────────────────── */}
            {errorA ? (
              <div
                style={{
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "12px",
                  padding: "32px 24px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-ink)", margin: 0 }}>
                  Could not load @{a}
                </p>
                <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: "6px 0 0 0" }}>
                  {errorA}
                </p>
              </div>
            ) : profileA ? (
              <ProfileColumn
                user={profileA.user}
                score={profileA.score}
                isWinner={winnerScore === "a"}
              />
            ) : null}

            {/* ── Column B ──────────────────────────────────────────── */}
            {errorB ? (
              <div
                style={{
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "12px",
                  padding: "32px 24px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-ink)", margin: 0 }}>
                  Could not load @{b}
                </p>
                <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: "6px 0 0 0" }}>
                  {errorB}
                </p>
              </div>
            ) : profileB ? (
              <ProfileColumn
                user={profileB.user}
                score={profileB.score}
                isWinner={winnerScore === "b"}
              />
            ) : null}
          </div>

          {/* Comparison table */}
          {profileA && profileB && (
            <div
              style={{
                marginTop: "32px",
                border: "1px solid var(--color-hairline)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {/* Score row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  borderBottom: "1px solid var(--color-hairline)",
                  backgroundColor: "var(--color-canvas-soft)",
                }}
              >
                <span
                  style={{
                    padding: "14px 18px",
                    fontSize: "18px",
                    fontWeight: 600,
                    color: winnerScore === "a" ? "var(--color-primary)" : "var(--color-ink)",
                    textAlign: "center",
                  }}
                >
                  {profileA.score}
                </span>
                <span
                  style={{
                    padding: "14px 18px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--color-ink-mute)",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Score
                </span>
                <span
                  style={{
                    padding: "14px 18px",
                    fontSize: "18px",
                    fontWeight: 600,
                    color: winnerScore === "b" ? "var(--color-primary)" : "var(--color-ink)",
                    textAlign: "center",
                  }}
                >
                  {profileB.score}
                </span>
              </div>

              {/* Stat rows */}
              {statRows.map((row) => {
                const valA = profileA.stats[row.key];
                const valB = profileB.stats[row.key];
                const aWins = valA > valB;
                const bWins = valB > valA;

                return (
                  <div
                    key={row.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      borderBottom: "1px solid var(--color-hairline)",
                    }}
                  >
                    <span
                      style={{
                        padding: "12px 18px",
                        fontSize: "15px",
                        fontWeight: aWins ? 600 : 400,
                        color: aWins ? "var(--color-primary)" : "var(--color-ink)",
                        textAlign: "center",
                      }}
                    >
                      {numberFormatter.format(valA)}
                    </span>
                    <span
                      style={{
                        padding: "12px 18px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--color-ink-mute)",
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        padding: "12px 18px",
                        fontSize: "15px",
                        fontWeight: bWins ? 600 : 400,
                        color: bWins ? "var(--color-primary)" : "var(--color-ink)",
                        textAlign: "center",
                      }}
                    >
                      {numberFormatter.format(valB)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {profileA && profileB && (
            <CompareCharts
              userA={{
                username: a,
                commits: profileA.stats.totalCommits,
                prs: profileA.stats.totalPRs,
                issues: profileA.stats.totalIssues,
                reviews: profileA.stats.totalReviews,
                score: profileA.score,
              }}
              userB={{
                username: b,
                commits: profileB.stats.totalCommits,
                prs: profileB.stats.totalPRs,
                issues: profileB.stats.totalIssues,
                reviews: profileB.stats.totalReviews,
                score: profileB.score,
              }}
            />
          )}
        </div>
      </main>
      <Footer />


      {/* Responsive: stack columns on mobile */}
      <style>{`
        @media (max-width: 767px) {
          .compare-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile column sub-component                                               */
/* -------------------------------------------------------------------------- */

function ProfileColumn({
  user,
  score,
  isWinner,
}: {
  user: Record<string, unknown>;
  score: number;
  isWinner: boolean;
}) {
  const username = user.login as string;
  const name = (user.name as string | null) || username;
  const avatarUrl = user.avatar_url as string;

  return (
    <div
      style={{
        border: `1px solid ${isWinner ? "var(--color-primary)" : "var(--color-hairline)"}`,
        borderRadius: "12px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        textAlign: "center",
        transition: "border-color 0.2s ease",
      }}
    >
      <Link href={`/${username}`}>
        <Image
          src={avatarUrl}
          alt={`${name} avatar`}
          width={72}
          height={72}
          style={{
            borderRadius: "9999px",
            border: "1px solid var(--color-hairline)",
          }}
        />
      </Link>
      <div>
        <Link
          href={`/${username}`}
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-ink)",
            textDecoration: "none",
          }}
        >
          {name}
        </Link>
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-ink-mute)",
            margin: "2px 0 0 0",
          }}
        >
          @{username}
        </p>
      </div>
      <div>
        <span
          style={{
            fontSize: "22px",
            fontWeight: 500,
            color: isWinner ? "var(--color-primary)" : "var(--color-ink)",
            letterSpacing: "-0.42px",
          }}
        >
          {score}
        </span>
        <p
          style={{
            fontSize: "12px",
            color: "var(--color-ink-mute)",
            margin: "2px 0 0 0",
          }}
        >
          contributor score
        </p>
      </div>
    </div>
  );
}
