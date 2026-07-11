"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchContributorProfile, contributorToScoreInputs } from "@/lib/github";
import { mapRepos, fetchLiveStats } from "@/lib/profile-data";
import { scoreWithAnomalyCheck } from "@/lib/anomaly";
import type { Session } from "@supabase/supabase-js";
import type { ContributorStats, Repo } from "@/types";

// Cap how long the post-login score sync may delay the redirect. The sync is
// best-effort (the profile page recomputes the score live as a fallback), so a
// slow GitHub/Supabase response must never hold the user on this screen.
const SYNC_TIMEOUT_MS = 4000;

// Maximum time to wait for the PKCE code exchange before giving up and
// redirecting home. Prevents infinite "Signing you in…" spinner.
const AUTH_WAIT_TIMEOUT_MS = 10000;

async function statsFromRest(
  username: string
): Promise<{ stats: ContributorStats; repos: Repo[] }> {
  const reposRes = await fetch(
    `https://api.github.com/users/${username}/repos?sort=stars&per_page=12&type=owner`,
    { headers: { Accept: "application/vnd.github.v3+json" } }
  );
  const rawRepos = reposRes.ok ? await reposRes.json() : [];
  const filtered = Array.isArray(rawRepos)
    ? rawRepos.filter((r: { fork: boolean }) => !r.fork).slice(0, 6)
    : [];
  return { repos: mapRepos(filtered), stats: await fetchLiveStats(username) };
}

async function syncScore(
  userId: string,
  username: string,
  providerToken: string | undefined
): Promise<void> {
  let stats: ContributorStats;
  let repos: Repo[];

  if (providerToken) {
    try {
      const contributor = await fetchContributorProfile(username, providerToken);
      ({ stats, repos } = contributorToScoreInputs(contributor));
    } catch {
      ({ stats, repos } = await statsFromRest(username));
    }
  } else {
    ({ stats, repos } = await statsFromRest(username));
  }

  // Score the account and run the anti-gaming heuristic. A flagged account is
  // persisted with its reason (auditable, reversible) and stores the discounted
  // score, so every surface that reads `profiles.score` reflects the discount.
  const { score, anomaly } = scoreWithAnomalyCheck(stats, repos);
  const now = new Date().toISOString();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      username,
      score,
      total_commits: stats.totalCommits,
      total_prs: stats.totalPRs,
      total_issues: stats.totalIssues,
      total_reviews: stats.totalReviews,
      flagged: anomaly.flagged,
      flag_reason: anomaly.reason,
      flagged_at: anomaly.flagged ? now : null,
      updated_at: now,
    },
    { onConflict: "id" }
  );
  if (error) {
    console.error("Score sync upsert failed:", error.message);
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function handleSession(session: Session) {
      const username = session.user.user_metadata?.user_name as string | undefined;
      const userId = session.user.id;
      // provider_token is only present immediately after the OAuth redirect.
      const providerToken = session.provider_token ?? undefined;

      if (username && userId) {
        await Promise.race([
          syncScore(userId, username, providerToken).catch(() => {}),
          new Promise<void>((resolve) => setTimeout(resolve, SYNC_TIMEOUT_MS)),
        ]);
      }

      if (!cancelled) {
        router.replace(username ? `/${username}` : "/");
      }
    }

    // With PKCE flow (Supabase v2 default), the ?code= in the callback URL is
    // exchanged asynchronously during client initialization. getSession() can
    // return null before that exchange completes, so we listen for SIGNED_IN
    // instead, which fires only after the exchange succeeds and the session is
    // stored. We also fall back to INITIAL_SESSION in case the session was
    // already established before the listener attached (e.g., rapid re-mount).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled || !session) return;
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          await handleSession(session);
        }
      }
    );

    // Safety net: if no auth event arrives within AUTH_WAIT_TIMEOUT_MS, redirect
    // home so the user isn't stuck on the spinner indefinitely.
    const timeout = setTimeout(() => {
      if (!cancelled) router.replace("/");
    }, AUTH_WAIT_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#ffffff",
      }}
    >
      <p style={{ color: "#707070", fontSize: "14px" }}>Signing you in…</p>
    </div>
  );
}
