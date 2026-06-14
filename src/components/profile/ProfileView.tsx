"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { ContributorStats, Org, TechEntry, HeatmapWeek } from "@/types";

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  blog: string | null;
  location: string | null;
  twitter_username: string | null;
  followers: number;
  following: number;
  public_repos: number;
}

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  PHP: "#4F5D95",
};

interface ProfileExtras {
  stats: ContributorStats;
  techStack: TechEntry[];
  orgs: Org[];
  heatmap: HeatmapWeek[];
  currentStreak: number;
  longestStreak: number;
  score: number;
  /** ISO 8601 timestamp from Supabase profiles.updated_at — null if the user has never synced. */
  updatedAt: string | null;
}

/** Format an ISO timestamp as a human-readable relative string for the profile header. */
function formatUpdatedAt(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function ProfileView({
  user,
  repos,
  stats,
  techStack,
  orgs,
  heatmap,
  currentStreak,
  longestStreak,
  score,
  updatedAt,
}: { user: GitHubUser; repos: GitHubRepo[] } & ProfileExtras) {
  const displayName = user.name || user.login;
  const website = user.blog
    ? user.blog.startsWith("http")
      ? user.blog
      : `https://${user.blog}`
    : null;

  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy to clipboard failed:", err);
    }
  };

  // Show a "Back to top" button once the visitor scrolls past 400px. The
  // listener is passive (it never calls preventDefault) so it does not block
  // scrolling, and it is cleaned up on unmount.
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    onScroll(); // set the initial state in case the page loads already scrolled
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  // Total stars across the repos shown on this page (the top repos fetched for
  // display). Derived from the `repos` prop already passed in.
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "48px 20px 80px" }}>

      {/* Profile header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", flexWrap: "wrap", paddingBottom: "40px", borderBottom: "1px solid #ededed" }}>
        <Image
          src={user.avatar_url}
          alt={displayName}
          width={88}
          height={88}
          style={{ borderRadius: "9999px", border: "1px solid #ededed", flexShrink: 0 }}
        />

        <div style={{ flex: 1, minWidth: "200px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#171717", letterSpacing: "-0.42px", margin: 0 }}>
            {displayName}
          </h1>
          <p style={{ fontSize: "14px", color: "#707070", margin: "4px 0 0 0" }}>@{user.login}</p>

          {user.bio && (
            <p style={{ fontSize: "14px", color: "#212121", lineHeight: 1.55, margin: "12px 0 0 0", maxWidth: "480px" }}>
              {user.bio}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "14px", alignItems: "center" }}>
            {user.location && (
              <span style={{ fontSize: "13px", color: "#707070", display: "flex", alignItems: "center", gap: "5px" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {user.location}
              </span>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Personal website ${website.replace(/^https?:\/\//, "")} (opens in a new tab)`}
                style={{ fontSize: "13px", color: "#707070", display: "flex", alignItems: "center", gap: "5px", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#171717")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#707070")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {user.twitter_username && (
              <a
                href={`https://twitter.com/${user.twitter_username}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Twitter profile of @${user.twitter_username} (opens in a new tab)`}
                style={{ fontSize: "13px", color: "#707070", display: "flex", alignItems: "center", gap: "5px", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#171717")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#707070")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                @{user.twitter_username}
              </a>
            )}
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`GitHub profile of ${displayName} (opens in a new tab)`}
              style={{ fontSize: "13px", color: "#707070", display: "flex", alignItems: "center", gap: "5px", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#171717")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#707070")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>

          {/* Action buttons — Share on X and Copy link, consistent with
              DESIGN.md button-secondary-outline: white bg, ink border, 6px radius */}
          <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                const profileUrl = `https://ossfolio.qzz.io/${user.login}`;
                const text = `My open source contributor score is ${score} on OSSfolio: ${profileUrl} #opensource`;
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#171717",
                backgroundColor: "#ffffff",
                border: "1px solid #c7c7c7",
                borderRadius: "6px",
                cursor: "pointer",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#171717";
                e.currentTarget.style.backgroundColor = "#fafafa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#c7c7c7";
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
              aria-label="Share profile on X (Twitter)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </button>

            {/* Copy link button — copies window.location.href to clipboard,
                shows "Copied!" with green accent for 2 s then resets.
                Uses {colors.primary} (#3ecf8e) for the confirmed state to
                signal success without adding a new chromatic event. */}
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                fontSize: "13px",
                fontWeight: 500,
                color: copied ? "#3ecf8e" : "#171717",
                backgroundColor: "#ffffff",
                border: `1px solid ${copied ? "#3ecf8e" : "#c7c7c7"}`,
                borderRadius: "6px",
                cursor: "pointer",
                lineHeight: 1,
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.currentTarget.style.borderColor = "#171717";
                  e.currentTarget.style.backgroundColor = "#fafafa";
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.currentTarget.style.borderColor = "#c7c7c7";
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }
              }}
              aria-label="Copy profile link to clipboard"
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy link
                </>
              )}
            </button>
          </div>

          <div style={{ display: "flex", gap: "20px", marginTop: "14px" }}>
            <span style={{ fontSize: "13px", color: "#707070" }}>
              <strong style={{ color: "#171717", fontWeight: 600 }}>{user.followers.toLocaleString("en-US")}</strong> followers
            </span>
            <span style={{ fontSize: "13px", color: "#707070" }}>
              <strong style={{ color: "#171717", fontWeight: 600 }}>{user.following.toLocaleString("en-US")}</strong> following
            </span>
            <span style={{ fontSize: "13px", color: "#707070" }}>
              <strong style={{ color: "#171717", fontWeight: 600 }}>{user.public_repos}</strong> repos
            </span>
          </div>

          {/* Last updated timestamp — shown only when a Supabase profile row exists.
              Uses {typography.micro} (12px/1.45) and {colors.ink-mute-2} (#9a9a9a)
              — the most subdued text tier in the design system, appropriate for
              metadata that is helpful but never the focal point. */}
          {updatedAt && (
            <p style={{ fontSize: "12px", color: "#9a9a9a", margin: "10px 0 0 0", lineHeight: 1.45 }}>
              Last updated {formatUpdatedAt(updatedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Repos */}
      {repos.length > 0 && (
        <div style={{ marginTop: "40px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#171717", margin: "0 0 20px 0", letterSpacing: "-0.2px" }}>
            Popular repositories
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {repos.map((repo) => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "20px",
                  border: "1px solid #ededed",
                  borderRadius: "12px",
                  textDecoration: "none",
                  backgroundColor: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#dfdfdf";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#ededed";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#171717", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {repo.name}
                </p>
                <p style={{ fontSize: "13px", color: "#707070", margin: 0, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", minHeight: "38px" }}>
                  {repo.description || "No description"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "auto", paddingTop: "8px" }}>
                  {repo.language && (
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#707070" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "9999px", backgroundColor: LANG_COLORS[repo.language] ?? "#9a9a9a", flexShrink: 0 }} />
                      {repo.language}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#707070" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {repo.stargazers_count.toLocaleString("en-US")}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#707070" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" />
                      <path d="M18 9a9 9 0 0 1-9 9M6 9a9 9 0 0 0 9 9" />
                    </svg>
                    {repo.forks_count.toLocaleString("en-US")}
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div style={{ marginTop: "20px" }}>
            <a
              href={`https://github.com/${user.login}?tab=repositories`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View all repositories on GitHub (opens in a new tab)"
              style={{ fontSize: "13px", color: "#707070", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#171717")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#707070")}
            >
              View all repositories on GitHub
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Contribution stats */}
      <div style={{ marginTop: "44px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#171717", margin: "0 0 16px 0", letterSpacing: "-0.2px" }}>
          Contribution stats
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          {[
            { label: "Commits", value: stats.totalCommits },
            { label: "Pull Requests", value: stats.totalPRs },
            { label: "Issues", value: stats.totalIssues },
            { label: "Stars", value: totalStars },
            { label: "Contributor score", value: score },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px 12px",
                border: "1px solid #ededed",
                borderRadius: "12px",
                backgroundColor: "#ffffff",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "24px", fontWeight: 700, color: "#171717", letterSpacing: "-0.5px" }}>
                {item.value.toLocaleString("en-US")}
              </span>
              <span style={{ fontSize: "12px", color: "#707070", marginTop: "4px" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      {techStack.length > 0 && (
        <div style={{ marginTop: "44px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#171717", margin: "0 0 16px 0", letterSpacing: "-0.2px" }}>
            Tech stack
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {techStack.map(({ language, repoCount }) => (
              <span
                key={language}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  border: "1px solid #ededed",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  color: "#171717",
                  backgroundColor: "#fafafa",
                }}
              >
                {language}
                <span style={{ color: "#9a9a9a", fontSize: "12px" }}>×{repoCount}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Organizations */}
      {orgs.length > 0 && (
        <div style={{ marginTop: "44px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#171717", margin: "0 0 16px 0", letterSpacing: "-0.2px" }}>
            Organizations
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {orgs.map((org) => (
              <a
                key={org.login}
                href={org.url}
                target="_blank"
                rel="noopener noreferrer"
                title={org.name ?? org.login}
                aria-label={`Organization ${org.name ?? org.login} (opens in a new tab)`}
                style={{ display: "inline-flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #ededed", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3ecf8e")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#ededed")}
              >
                <Image src={org.avatarUrl} alt={org.login} width={36} height={36} style={{ display: "block" }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Contribution heatmap */}
      {heatmap.length > 0 && (
        <div style={{ marginTop: "44px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#171717", margin: "0 0 16px 0", letterSpacing: "-0.2px" }}>
            Contribution activity
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "0 0 12px 0" }}>
            {[
              { label: "Current streak", value: currentStreak },
              { label: "Longest streak", value: longestStreak },
            ].map(({ label, value }) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: "6px",
                  padding: "6px 12px",
                  border: "1px solid #ededed",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  color: "#707070",
                  backgroundColor: "#fafafa",
                }}
              >
                <strong style={{ color: "#171717", fontWeight: 600 }}>
                  {value} {value === 1 ? "day" : "days"}
                </strong>
                {label}
              </span>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: "3px",
              overflowX: "auto",
              padding: "16px",
              border: "1px solid #ededed",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
            }}
          >
            {heatmap.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {week.days.map((day, di) => (
                  <div
                    key={di}
                    title={`${day.count} contributions on ${day.date}`}
                    style={{ width: "11px", height: "11px", borderRadius: "2px", backgroundColor: day.color, flexShrink: 0 }}
                  />
                ))}
              </div>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "#9a9a9a", margin: "10px 0 0 0" }}>
            This chart shows an estimate of contribution activity. Exact daily counts are not available for public profiles.
          </p>
        </div>
      )}

      {/* Back to top — fixed bottom-right, fades in past 400px of scroll.
          Uses {colors.primary} (#3ecf8e) for the background, the only
          chromatic accent in the design system, with white iconography. */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#3ecf8e",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            transition: "transform 0.15s, background-color 0.15s",
            zIndex: 50,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.backgroundColor = "#36b97e";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.backgroundColor = "#3ecf8e";
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
