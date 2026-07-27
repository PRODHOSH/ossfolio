"use client";

import React from "react";
import type { Achievement } from "@/lib/achievements";

interface MilestoneCardProps {
  achievement: Achievement;
  onCelebrate?: (achievement: Achievement) => void;
  onShare?: (achievement: Achievement) => void;
}

export function MilestoneCard({
  achievement,
  onCelebrate,
  onShare,
}: MilestoneCardProps) {
  const {
    name,
    tagline,
    unlocked,
    current,
    target,
    progress,
    icon,
    unlockedAt,
    category,
  } = achievement;

  const pct = Math.round(progress * 100);

  const formattedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "16px",
        borderRadius: "var(--radius-sm, 8px)",
        border: `1px solid ${
          unlocked
            ? "var(--color-primary, #3b82f6)"
            : "var(--color-hairline, #21262d)"
        }`,
        backgroundColor: unlocked
          ? "var(--color-canvas-soft, #161b22)"
          : "var(--color-canvas, #0d1117)",
        transition: "all 0.2s ease",
        boxShadow: unlocked
          ? "0 4px 12px rgba(59, 130, 246, 0.08)"
          : "none",
      }}
    >
      <div>
        {/* Top header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: unlocked
                  ? "rgba(59, 130, 246, 0.15)"
                  : "var(--color-hairline, #21262d)",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              {icon || "🏆"}
            </span>

            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  margin: 0,
                  color: unlocked
                    ? "var(--color-ink, #f0f6fc)"
                    : "var(--color-ink-mute, #8b949e)",
                }}
              >
                {name}
              </h3>
              <span
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--color-ink-mute, #8b949e)",
                }}
              >
                {category}
              </span>
            </div>
          </div>

          {unlocked && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: "var(--color-primary, #3b82f6)",
                color: "#ffffff",
              }}
            >
              Unlocked
            </span>
          )}
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-ink-mute, #8b949e)",
            margin: "0 0 14px",
            lineHeight: 1.4,
          }}
        >
          {tagline}
        </p>
      </div>

      <div>
        {/* Progress bar */}
        <div
          aria-hidden="true"
          style={{
            height: "6px",
            width: "100%",
            borderRadius: "var(--radius-full, 9999px)",
            backgroundColor: "var(--color-hairline, #21262d)",
            overflow: "hidden",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: "var(--radius-full, 9999px)",
              backgroundColor: unlocked
                ? "var(--color-primary, #3b82f6)"
                : "var(--color-ink-mute-2, #484f58)",
              transition: "width 0.4s ease-out",
            }}
          />
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
          }}
        >
          <span
            style={{
              fontWeight: 500,
              color: unlocked
                ? "var(--color-primary, #3b82f6)"
                : "var(--color-ink-mute, #8b949e)",
            }}
          >
            {unlocked
              ? formattedDate
                ? `Earned ${formattedDate}`
                : "Earned"
              : `${current} / ${target}`}
          </span>

          {unlocked && (
            <div style={{ display: "flex", gap: "6px" }}>
              {onCelebrate && (
                <button
                  onClick={() => onCelebrate(achievement)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    color: "var(--color-primary, #3b82f6)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    cursor: "pointer",
                  }}
                >
                  🎉 Celebrate
                </button>
              )}

              {onShare && (
                <button
                  onClick={() => onShare(achievement)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    backgroundColor: "var(--color-canvas, #0d1117)",
                    color: "var(--color-ink-mute, #8b949e)",
                    border: "1px solid var(--color-hairline, #21262d)",
                    cursor: "pointer",
                  }}
                >
                  Share
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
