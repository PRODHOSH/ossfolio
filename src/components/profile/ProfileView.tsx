"use client";

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
  score: number;
  githubUnavailable?: boolean;
}

export function ProfileView({
  user,
  repos,
  stats,
  techStack,
  orgs,
  heatmap,
  score,
  githubUnavailable,
}: { user: GitHubUser; repos: GitHubRepo[] } & ProfileExtras) {
  const displayName = user.name || user.login;
  const website = user.blog
    ? user.blog.startsWith("http")
      ? user.blog
      : `https://${user.blog}`
    : null;

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "48px 20px 80px" }}>
{githubUnavailable && (
  <div
    style={{
      marginBottom: "24px",
      padding: "12px 16px",
      border: "1px solid #fbbf24",
      borderRadius: "8px",
      backgroundColor: "#fffbeb",
      color: "#92400e",
      fontSize: "14px",
    }}
  >
    GitHub data is temporarily unavailable. Please try again in a few minutes.
  </div>
)}
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
            Activity graph is a representative placeholder &mdash; precise daily counts require GitHub&rsquo;s authenticated API.
          </p>
        </div>
      )}
    </div>
  );
}
