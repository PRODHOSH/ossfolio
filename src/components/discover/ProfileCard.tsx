"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";

interface ProfileCardProps {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  score: number;
  totalPrs: number;
  totalCommits: number;
  totalIssues: number;
  followers: number;
  topLanguages: string[];
  scoreDelta30Days?: number | null;
}

function ProfileCardInner({
  username,
  name,
  avatarUrl,
  bio,
  score,
  totalPrs,
  totalCommits,
  totalIssues,
  followers,
  topLanguages,
  scoreDelta30Days,
}: ProfileCardProps) {
  const displayName = name || username;
  const avatar =
    avatarUrl &&
    (avatarUrl.startsWith("https://avatars.githubusercontent.com/") ||
      avatarUrl.startsWith("https://github.com/"))
      ? avatarUrl
      : `https://github.com/${encodeURIComponent(username)}.png`;

  return (
    <Link
      href={`/${encodeURIComponent(username)}`}
      aria-label={`View ${displayName}'s profile, score is ${score}`}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        border: "1px solid var(--color-hairline)",
        borderRadius: "12px",
        textDecoration: "none",
        backgroundColor: "var(--color-canvas)",
        transition: "border-color 0.15s, background-color 0.2s, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-primary)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-hairline)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <Image
          src={avatar}
          alt={`${displayName} avatar`}
          width={44}
          height={44}
          style={{ borderRadius: "9999px", border: "1px solid var(--color-hairline)", flexShrink: 0 }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--color-ink)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-ink-mute-2)",
              margin: "2px 0 0 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            @{username}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "20px", fontWeight: 600, color: "var(--color-ink)", margin: 0, lineHeight: 1 }}>
            {score}
          </p>
          {typeof scoreDelta30Days === "number" && scoreDelta30Days > 0 ? (
            <p style={{ fontSize: "11px", color: "#10b981", fontWeight: 600, margin: "2px 0 0 0" }} title="Improvement over last 30 days">
              📈 +{scoreDelta30Days}
            </p>
          ) : (
            <p style={{ fontSize: "11px", color: "var(--color-ink-mute-2)", margin: "2px 0 0 0" }}>score</p>
          )}
        </div>
      </div>

      {bio && (
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-ink-mute)",
            margin: "0 0 12px 0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {bio}
        </p>
      )}

      {topLanguages.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
          {topLanguages.slice(0, 4).map((lang) => (
            <span
              key={lang}
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--color-ink-mute)",
                backgroundColor: "var(--color-canvas-soft)",
                borderRadius: "4px",
                padding: "2px 8px",
              }}
            >
              {lang}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "var(--color-ink-mute-2)" }}>
        <span aria-label={`${totalPrs} merged pull requests`}>{totalPrs} PRs</span>
        <span aria-label={`${totalCommits} commits`}>{totalCommits} commits</span>
        <span aria-label={`${totalIssues} issues`}>{totalIssues} issues</span>
        <span aria-label={`${followers} followers`}>{followers} followers</span>
      </div>
    </Link>
  );
}

export const ProfileCard = memo(ProfileCardInner);
