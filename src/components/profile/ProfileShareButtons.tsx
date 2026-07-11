"use client";

import { useState } from "react";

interface ProfileShareButtonsProps {
  username: string;
  score: number;
}

function buildProfileMarkdown(username: string, score: number) {
  const profileUrl = `https://ossfolio.qzz.io/${username}`;

  const scoreBadge = `https://img.shields.io/badge/OSSfolio-Score-${score}-brightgreen`;

  return `[![OSSfolio Score](${scoreBadge})](${profileUrl})\n\nSource: [${username}](${profileUrl})\n`;
}


export function ProfileShareButtons({ username, score }: ProfileShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);


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
    transition: "border-color 0.15s, color 0.15s",
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

  const handleShareFacebook = () => {
    const profileUrl = `https://ossfolio.qzz.io/${username}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleShareReddit = () => {
    const profileUrl = `https://ossfolio.qzz.io/${username}`;
    const title = "My open source score on OSSfolio";
    window.open(
      `https://www.reddit.com/submit?url=${encodeURIComponent(profileUrl)}&title=${encodeURIComponent(title)}`,
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

  const handleCopyMarkdown = async () => {
    try {
      const md = buildProfileMarkdown(username, score);
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (err) {
      console.error("Copy markdown to clipboard failed:", err);
    }
  };


  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button type="button" onClick={handleShareX} style={btnBase} aria-label="Share profile on X (Twitter)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share on X
      </button>

      <button type="button" onClick={handleShareFacebook} style={btnBase} aria-label="Share profile on Facebook">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99h-2.54V12h2.54V9.69c0-2.5 1.5-3.89 3.8-3.89 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.12 22 16.99 22 12z" />
        </svg>
        Share on Facebook
      </button>

      <button type="button" onClick={handleShareReddit} style={btnBase} aria-label="Share profile on Reddit">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6.167 8a.83.83 0 0 0-.83.83c0 .459.372.84.83.831a.831.831 0 0 0 0-1.661m1.843 3.647c.315 0 1.403-.038 1.976-.611a.23.23 0 0 0 0-.306.213.213 0 0 0-.306 0c-.353.363-1.126.487-1.67.487-.545 0-1.308-.124-1.671-.487a.213.213 0 0 0-.306 0 .213.213 0 0 0 0 .306c.564.563 1.652.61 1.977.61zm.992-2.807c0 .458.373.83.831.83s.83-.381.83-.83a.831.831 0 0 0-1.66 0z" />
        </svg>
        Share on Reddit
      </button>

      <button
        type="button"
        onClick={handleCopyMarkdown}
        style={{
          ...btnBase,
          color: copiedMarkdown ? "#3ecf8e" : "var(--color-ink)",
          borderColor: copiedMarkdown ? "#3ecf8e" : "var(--color-hairline-strong)",
        }}
        aria-label="Copy profile markdown to clipboard"
      >
        {copiedMarkdown ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 4h16v16H4z" />
              <path d="M8 9h8" />
              <path d="M8 13h5" />
            </svg>
            Copy Markdown
          </>
        )}
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
