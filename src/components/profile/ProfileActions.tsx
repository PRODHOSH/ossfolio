"use client";

import { useState } from "react";

interface ProfileActionsProps {
  username: string;
  score: number;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
}

export function ProfileActions({ username, score, isRefreshing, onRefresh }: ProfileActionsProps) {
  const [copied, setCopied] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "success" | "error">("idle");

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--color-ink)",
    backgroundColor: "var(--color-canvas-soft)",
    border: "1px solid var(--color-hairline-strong)",
    borderRadius: "6px",
    cursor: "pointer",
    lineHeight: 1,
    transition: "all 0.15s ease",
  };

  const handleShareX = () => {
    const profileUrl = `https://ossfolio.qzz.io/${username}`;
    const text = `My open source contributor score is ${score} on OSSfolio: ${profileUrl} #opensource`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy to clipboard failed:", err);
    }
  };

  const handleRefreshClick = async () => {
    setRefreshState("loading");
    try {
      await onRefresh();
      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 2500);
    } catch (err) {
      setRefreshState("error");
      setTimeout(() => setRefreshState("idle"), 2500);
    }
  };

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
      <button
        type="button"
        disabled={isRefreshing || refreshState === "loading"}
        onClick={handleRefreshClick}
        style={{
          ...btnBase,
          backgroundColor: refreshState === "loading" ? "var(--color-canvas-soft)" : "var(--color-canvas)",
        }}
        aria-label="Refresh GitHub profile statistics"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ animation: refreshState === "loading" ? "spin 1s linear infinite" : "none" }}
          aria-hidden="true"
        >
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
        {refreshState === "loading"
          ? "Refreshing..."
          : refreshState === "success"
          ? "Refreshed!"
          : refreshState === "error"
          ? "Error"
          : "Sync GitHub"}
      </button>

      <button type="button" onClick={handleShareX} style={btnBase} aria-label="Share profile on X (Twitter)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share on X
      </button>

      <button
        type="button"
        onClick={handleCopyLink}
        style={{
          ...btnBase,
          color: copied ? "#3ecf8e" : "var(--color-ink)",
          borderColor: copied ? "#3ecf8e" : "var(--color-hairline-strong)",
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
  );
}
