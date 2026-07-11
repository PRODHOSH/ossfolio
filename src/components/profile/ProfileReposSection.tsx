"use client";

import { useMemo, useState } from "react";
import { LANG_COLORS } from "@/lib/languages";

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  pushed_at?: string;
}

interface ProfileReposSectionProps {
  repos: GitHubRepo[];
  username: string;
}

export function ProfileReposSection({ repos, username }: ProfileReposSectionProps) {
  const [repoSort, setRepoSort] = useState<"stars" | "forks" | "updated">("stars");
  const [repoQuery, setRepoQuery] = useState<string>("");

  const sortOptions = ["stars", "forks", "updated"] as const;

  const sortedRepos = useMemo(() => {
    return [...repos].sort((a, b) => {
      if (repoSort === "forks") return b.forks_count - a.forks_count;
      if (repoSort === "updated") return (b.pushed_at || "").localeCompare(a.pushed_at || "");
      return b.stargazers_count - a.stargazers_count;
    });
  }, [repos, repoSort]);

  const trimmedQuery = repoQuery.trim().toLowerCase();
  const filteredRepos = useMemo(() => {
    if (!trimmedQuery) return sortedRepos;
    return sortedRepos.filter((repo) => repo.name.toLowerCase().includes(trimmedQuery));
  }, [sortedRepos, trimmedQuery]);

  return (
    <div style={{ marginTop: "40px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "0 0 12px 0",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-ink)",
            margin: 0,
            letterSpacing: "-0.2px",
          }}
        >
          Popular repositories
        </h2>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-ink-mute)" }}>
              Search repositories
            </span>
            <input
              type="text"
              value={repoQuery}
              onChange={(e) => setRepoQuery(e.target.value)}
              placeholder="Filter by repo name"
              aria-label="Filter repositories by name"
              style={{
                width: "260px",
                maxWidth: "80vw",
                padding: "8px 12px",
                fontSize: "13px",
                borderRadius: "10px",
                border: "1px solid var(--color-hairline)",
                backgroundColor: "var(--color-canvas)",
                color: "var(--color-ink)",
                outline: "none",
              }}
            />
          </label>

          <div role="group" aria-label="Sort popular repositories" style={{ display: "flex", gap: "6px" }}>
            {sortOptions.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={repoSort === option}
                onClick={() => setRepoSort(option)}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: repoSort === option ? 600 : 400,
                  color: repoSort === option ? "#171717" : "var(--color-ink-mute)",
                  backgroundColor: repoSort === option ? "#3ecf8e" : "var(--color-canvas-soft)",
                  border: repoSort === option ? "none" : "1px solid var(--color-hairline)",
                  borderRadius: "9999px",
                  cursor: "pointer",
                }}
              >
                {option === "stars" ? "Stars" : option === "forks" ? "Forks" : "Recent"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredRepos.length === 0 ? (
        <div
          style={{
            padding: "40px",
            border: "1px dashed var(--color-hairline-strong)",
            borderRadius: "12px",
            textAlign: "center",
            backgroundColor: "var(--color-canvas-soft)",
            margin: "16px 0",
          }}
        >
          <svg
            style={{ margin: "0 auto 12px", color: "var(--color-ink-mute-2)" }}
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
            <path d="M12 18H12.01" />
          </svg>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>
            {trimmedQuery ? "No repositories match your search" : "No public repositories found"}
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: "4px 0 0 0" }}>
            {trimmedQuery
              ? "Try a different search term"
              : "Create public repositories on GitHub to display them here."}
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredRepos.map((repo) => (
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
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "12px",
                  textDecoration: "none",
                  backgroundColor: "var(--color-canvas-soft)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {repo.name}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-ink-mute)",
                    margin: 0,
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                    minHeight: "38px",
                  }}
                >
                  {repo.description || "No description"}
                </p>
                {repo.topics && repo.topics.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                    {repo.topics.slice(0, 3).map((topic) => (
                      <span
                        key={topic}
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          backgroundColor: "var(--color-canvas-soft)",
                          color: "var(--color-ink-mute)",
                          border: "1px solid var(--color-hairline)",
                        }}
                      >
                        {topic}
                      </span>
                    ))}
                    {repo.topics.length > 3 && (
                      <span style={{ fontSize: "11px", padding: "2px 6px", color: "var(--color-ink-mute)" }}>
                        +{repo.topics.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "auto", paddingTop: "8px" }}>
                  {repo.language && (
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--color-ink-mute)" }}>
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "9999px",
                          backgroundColor: LANG_COLORS[repo.language] ?? "#9a9a9a",
                          flexShrink: 0,
                        }}
                      />
                      {repo.language}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--color-ink-mute)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {repo.stargazers_count.toLocaleString("en-US")}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--color-ink-mute)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="18" r="3" />
                      <circle cx="6" cy="6" r="3" />
                      <circle cx="18" cy="6" r="3" />
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
              href={`https://github.com/${username}?tab=repositories`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View all repositories on GitHub (opens in a new tab)"
              style={{
                fontSize: "13px",
                color: "var(--color-ink-mute)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              View all repositories on GitHub
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

