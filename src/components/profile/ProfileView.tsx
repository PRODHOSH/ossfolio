"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { HeatmapWithYearNav } from "@/components/profile/HeatmapWithYearNav";
import type { ContributorStats, Org, TechEntry, HeatmapWeek, BadgeItem } from "@/types";
import { toPng } from "html-to-image";
import { supabase } from "@/lib/supabase";
import { LANG_COLORS } from "@/lib/languages";

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
  topics?: string[];
  pushed_at?: string;
}


const PROGRAM_STYLING: Record<string, { gradient: string; text: string; bg: string }> = {
  GSSoC: {
    gradient: "linear-gradient(135deg, #FF9900 0%, #FF5E36 100%)",
    text: "#ffffff",
    bg: "rgba(255, 153, 0, 0.1)",
  },
  Hacktoberfest: {
    gradient: "linear-gradient(135deg, #FF2201 0%, #FF007A 100%)",
    text: "#ffffff",
    bg: "rgba(255, 34, 1, 0.1)",
  },
  EluSoC: {
    gradient: "linear-gradient(135deg, #6b01c2 0%, #00d2ff 100%)",
    text: "#ffffff",
    bg: "rgba(107, 1, 194, 0.1)",
  },
  GSoC: {
    gradient: "linear-gradient(135deg, #34A853 0%, #4285F4 100%)",
    text: "#ffffff",
    bg: "rgba(66, 133, 244, 0.1)",
  },
  "MLH Fellowship": {
    gradient: "linear-gradient(135deg, #004B87 0%, #00A3E0 100%)",
    text: "#ffffff",
    bg: "rgba(0, 75, 135, 0.1)",
  },
  SWoC: {
    gradient: "linear-gradient(135deg, #00b4ab 0%, #3ecf8e 100%)",
    text: "#ffffff",
    bg: "rgba(0, 180, 171, 0.1)",
  },
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
  badges: BadgeItem[];
  profileId: string | null;
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
  badges = [],
  profileId,
  rateLimited,
}: { user: GitHubUser; repos: GitHubRepo[] } & ProfileExtras & { rateLimited?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [repoSort, setRepoSort] = useState<"stars" | "forks" | "updated">("stars");
  const [isDownloading, setIsDownloading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [repoFilter, setRepoFilter] = useState("");

  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  useKeyboardShortcuts({ onSlash: focusSearch });
  const cardRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Program Badges State
  const sanitizeBadges = (raw: any[]): BadgeItem[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (b) =>
          b &&
          typeof b.program === "string" &&
          b.program.trim() !== "" &&
          Array.isArray(b.years)
      )
      .map((b) => ({
        program: b.program,
        years: b.years
          .map((y: any) => Number(y))
          .filter((y: number) => !isNaN(y)),
      }));
  };

  const [badgesList, setBadgesList] = useState<BadgeItem[]>(() => sanitizeBadges(badges));
  const [authUser, setAuthUser] = useState<any>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState("GSSoC");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isSavingBadge, setIsSavingBadge] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isOwner = !!(
    authUser && (
      (profileId && authUser.id === profileId) ||
      (!profileId && authUser.user_metadata?.user_name?.toLowerCase() === user.login?.toLowerCase())
    )
  );

  // Sync badges from props in effect (instead of setState during render)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBadgesList(sanitizeBadges(badges));
  }, [badges]);

  // Scroll visibility effect
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Resolve the current session on mount and keep it in sync with auth changes
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Sync native dialog element with state and setup event listeners
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isBadgeModalOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }

    const handleClose = () => {
      setIsBadgeModalOpen(false);
    };

    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        const clickInside =
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width;
        if (!clickInside) {
          setIsBadgeModalOpen(false);
        }
      }
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleClick);
    };
  }, [isBadgeModalOpen, isOwner]);

  // Conditional rendering
  if (rateLimited) {
    return (
      <div style={{ color: 'var(--color-ink-mute)', backgroundColor: 'var(--color-canvas-soft)', padding: '16px', borderRadius: '8px', textAlign: 'center', marginBottom: '24px' }}>
        GitHub data is temporarily unavailable. Please try again later.
      </div>
    );
  }

  const displayName = user?.name || user?.login;
  const website = user?.blog
    ? user.blog.startsWith("http")
      ? user.blog
      : `https://${user.blog}`
    : null;

  const handleAddBadge = async () => {
    if (!profileId) {
      alert("Please sync your profile first before adding badges.");
      return;
    }
    const targetProfileId = profileId;
    setIsSavingBadge(true);
    try {
      // Create new list of badges
      const existingBadgeIndex = badgesList.findIndex(
        (b) => b.program === selectedProgram
      );
      let updatedList: BadgeItem[] = [];
      if (existingBadgeIndex > -1) {
        // Append year if not already present, sort desc
        const currentYears = badgesList[existingBadgeIndex].years;
        const updatedYears = currentYears.includes(selectedYear)
          ? currentYears
          : [...currentYears, selectedYear].sort((a, b) => b - a);
        updatedList = badgesList.map((b, idx) =>
          idx === existingBadgeIndex ? { ...b, years: updatedYears } : b
        );
      } else {
        // Add new badge
        updatedList = [
          ...badgesList,
          { program: selectedProgram, years: [selectedYear] },
        ];
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: targetProfileId,
          username: user.login,
          badges: updatedList,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Failed to save badge to database:", error.message);
        alert(`Failed to save badge: ${error.message}`);
      } else {
        setBadgesList(updatedList);
        setIsBadgeModalOpen(false);
      }
    } catch (err) {
      console.error("Error saving badge:", err);
    } finally {
      setIsSavingBadge(false);
    }
  };

  const handleRemoveBadge = async (program: string) => {
    if (!profileId) {
      alert("Please sync your profile first before removing badges.");
      return;
    }
    const targetProfileId = profileId;
    const confirmRemove = confirm(`Are you sure you want to remove the ${program} badge?`);
    if (!confirmRemove) return;

    try {
      const updatedList = badgesList.filter((b) => b.program !== program);
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: targetProfileId,
          username: user.login,
          badges: updatedList,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Failed to remove badge from database:", error.message);
        alert(`Failed to remove badge: ${error.message}`);
      } else {
        setBadgesList(updatedList);
      }
    } catch (err) {
      console.error("Error removing badge:", err);
    }
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

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      // Small delay to ensure images have finished rendering
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });
      const link = document.createElement("a");
      link.download = `${user.login}-ossfolio-card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download profile card:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Show a "Back to top" button once the visitor scrolls past 400px.
  


  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  // Total stars across the repos shown on this page
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);

  const totalForks = repos.reduce((sum, r) => sum + (r.forks_count ?? 0), 0);

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "48px 20px 80px" }}>


      {/* Profile header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", flexWrap: "wrap", paddingBottom: "40px", borderBottom: "1px solid var(--color-hairline)" }}>
        <Image
          src={user.avatar_url}
          alt={displayName}
          width={88}
          height={88}
          style={{ borderRadius: "9999px", border: "1px solid var(--color-hairline)", flexShrink: 0 }}
        />

        <div style={{ flex: 1, minWidth: "200px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.42px", margin: 0 }}>
            {displayName}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-ink-mute)", margin: "4px 0 0 0" }}>@{user.login}</p>

          {user.bio && (
            <p style={{ fontSize: "14px", color: "var(--color-ink)", lineHeight: 1.55, margin: "12px 0 0 0", maxWidth: "480px" }}>
              {user.bio}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "14px", alignItems: "center" }}>
            {user.location && (
              <span style={{ fontSize: "13px", color: "var(--color-ink-mute)", display: "flex", alignItems: "center", gap: "5px" }}>
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                style={{ fontSize: "13px", color: "var(--color-ink-mute)", display: "flex", alignItems: "center", gap: "5px", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-mute)")}
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
                style={{ fontSize: "13px", color: "var(--color-ink-mute)", display: "flex", alignItems: "center", gap: "5px", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-mute)")}
              >
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
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
              style={{ fontSize: "13px", color: "var(--color-ink-mute)", display: "flex", alignItems: "center", gap: "5px", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-mute)")}
            >
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>

          {/* Action buttons */}
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
                color: "var(--color-ink)",
                backgroundColor: "var(--color-canvas-soft)",
                border: "1px solid var(--color-hairline-strong)",
                borderRadius: "6px",
                cursor: "pointer",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-ink)";
                e.currentTarget.style.backgroundColor = "var(--color-hairline)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-hairline-strong)";
                e.currentTarget.style.backgroundColor = "var(--color-canvas-soft)";
              }}
              aria-label="Share profile on X (Twitter)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </button>
            {/* Facebook Share Button */}
            <button
              type="button"
              onClick={() => {
                const profileUrl = `https://ossfolio.qzz.io/${user.login}`;
                const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
                window.open(fbUrl, "_blank", "noopener,noreferrer");
              }}
              style={{
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
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-ink)";
                e.currentTarget.style.backgroundColor = "var(--color-hairline)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-hairline-strong)";
                e.currentTarget.style.backgroundColor = "var(--color-canvas-soft)";
              }}
              aria-label="Share profile on Facebook"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99h-2.54V12h2.54V9.69c0-2.5 1.5-3.89 3.8-3.89 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.12 22 16.99 22 12z" />
              </svg>
              Share on Facebook
            </button>

            {/* Reddit Share Button */}
            <button
              type="button"
              onClick={() => {
                const profileUrl = `https://ossfolio.qzz.io/${user.login}`;
                const title = `My open source score on OSSfolio`;
                const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(profileUrl)}&title=${encodeURIComponent(title)}`;
                window.open(redditUrl, "_blank", "noopener,noreferrer");
              }}
              style={{
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
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-ink)";
                e.currentTarget.style.backgroundColor = "var(--color-hairline)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-hairline-strong)";
                e.currentTarget.style.backgroundColor = "var(--color-canvas-soft)";
              }}
              aria-label="Share profile on Reddit"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.167 8a.83.83 0 0 0-.83.83c0 .459.372.84.83.831a.831.831 0 0 0 0-1.661m1.843 3.647c.315 0 1.403-.038 1.976-.611a.23.23 0 0 0 0-.306.213.213 0 0 0-.306 0c-.353.363-1.126.487-1.67.487-.545 0-1.308-.124-1.671-.487a.213.213 0 0 0-.306 0 .213.213 0 0 0 0 .306c.564.563 1.652.61 1.977.61zm.992-2.807c0 .458.373.83.831.83s.83-.381.83-.83a.831.831 0 0 0-1.66 0z" />
              </svg>
              Share on Reddit
            </button>

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
                color: copied ? "#3ecf8e" : "var(--color-ink)",
                backgroundColor: "var(--color-canvas-soft)",
                border: `1px solid ${copied ? "#3ecf8e" : "var(--color-hairline-strong)"}`,
                borderRadius: "6px",
                cursor: "pointer",
                lineHeight: 1,
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.currentTarget.style.borderColor = "var(--color-ink)";
                  e.currentTarget.style.backgroundColor = "var(--color-hairline)";
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.currentTarget.style.borderColor = "var(--color-hairline-strong)";
                  e.currentTarget.style.backgroundColor = "var(--color-canvas-soft)";
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

            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={isDownloading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                fontSize: "13px",
                fontWeight: 500,
                color: isDownloading ? "var(--color-ink-mute)" : "var(--color-ink)",
                backgroundColor: "var(--color-canvas-soft)",
                border: "1px solid var(--color-hairline-strong)",
                borderRadius: "6px",
                cursor: isDownloading ? "not-allowed" : "pointer",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                if (!isDownloading) {
                  e.currentTarget.style.borderColor = "var(--color-ink)";
                  e.currentTarget.style.backgroundColor = "var(--color-hairline)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isDownloading) {
                  e.currentTarget.style.borderColor = "var(--color-hairline-strong)";
                  e.currentTarget.style.backgroundColor = "var(--color-canvas-soft)";
                }
              }}
              aria-label="Download profile card as PNG"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="var(--color-hairline-strong)" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download card
                </>
              )}
            </button>
          </div>

          <div style={{ display: "flex", gap: "20px", marginTop: "14px" }}>
            <span style={{ fontSize: "13px", color: "var(--color-ink-mute)" }}>
              <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>{user.followers.toLocaleString("en-US")}</strong> followers
            </span>
            <span style={{ fontSize: "13px", color: "var(--color-ink-mute)" }}>
              <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>{user.following.toLocaleString("en-US")}</strong> following
            </span>
            <span style={{ fontSize: "13px", color: "var(--color-ink-mute)" }}>
              <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>{user.public_repos}</strong> repos
            </span>
          </div>

          {updatedAt && (
            <p style={{ fontSize: "12px", color: "var(--color-ink-mute)", margin: "10px 0 0 0", lineHeight: 1.45 }}>
              Last updated {formatUpdatedAt(updatedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Badges section */}
      {(badgesList.length > 0 || isOwner) && (
        <div style={{ marginTop: "32px", borderBottom: "1px solid var(--color-hairline)", paddingBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: 0, letterSpacing: "-0.2px" }}>
              Badges
            </h2>
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsBadgeModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundColor: "#3ecf8e",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  lineHeight: 1,
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#24b47e")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3ecf8e")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add badge
              </button>
            )}
          </div>
          {badgesList.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: 0 }}>
              No badges claimed yet. Click &quot;Add badge&quot; to show your participation.
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {badgesList.map((badge) => {
                if (!badge || !badge.program || !Array.isArray(badge.years)) return null;
                const style = PROGRAM_STYLING[badge.program] || {
                  gradient: "linear-gradient(135deg, #707070 0%, #9a9a9a 100%)",
                  text: "#ffffff",
                  bg: "rgba(128, 128, 128, 0.1)",
                };
                return (
                  <div
                    key={badge.program}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 14px",
                      borderRadius: "9999px",
                      background: style.gradient,
                      color: style.text,
                      fontSize: "13px",
                      fontWeight: 600,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                      transition: "transform 0.15s",
                    }}
                  >
                    <span>{badge.program}</span>
                    <span
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.25)",
                        padding: "2px 6px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      {badge.years.join(", ")}
                    </span>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBadge(badge.program)}
                        title={`Remove ${badge.program} badge`}
                        aria-label={`Remove ${badge.program} badge`}
                        style={{
                          background: "none",
                          border: "none",
                          color: "rgba(255, 255, 255, 0.8)",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          fontSize: "16px",
                          marginLeft: "4px",
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)")}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Repos */}
      <div style={{ marginTop: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 12px 0", flexWrap: "wrap", gap: "12px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: 0, letterSpacing: "-0.2px" }}>
            Popular repositories
          </h2>
          <div role="group" aria-label="Sort popular repositories" style={{ display: "flex", gap: "6px" }}>
            {(["stars", "forks", "updated"] as const).map((option) => (
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

        {repos.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: 0 }}>
            No public repositories yet.
          </p>
        ) : (
          <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {[...repos].sort((a, b) => {
              if (repoSort === "forks") return b.forks_count - a.forks_count;
              if (repoSort === "updated") return (b.pushed_at || "").localeCompare(a.pushed_at || "");
              return b.stargazers_count - a.stargazers_count;
            }).filter((repo) => !repoFilter || repo.name.toLowerCase().includes(repoFilter.toLowerCase()) || (repo.description || "").toLowerCase().includes(repoFilter.toLowerCase())).map((repo) => (
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
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-hairline-strong)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-hairline)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {repo.name}
                </p>
                <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: 0, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", minHeight: "38px" }}>
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
                      <span style={{ width: "10px", height: "10px", borderRadius: "9999px", backgroundColor: LANG_COLORS[repo.language] ?? "#9a9a9a", flexShrink: 0 }} />
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
              style={{ fontSize: "13px", color: "var(--color-ink-mute)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-mute)")}
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

      {/* Contribution stats */}
      <div style={{ marginTop: "44px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: "0 0 16px 0", letterSpacing: "-0.2px" }}>
          Contribution stats
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          {[
            { label: "Contributions", value: stats.totalContributions },
            { label: "Commits", value: stats.totalCommits },
            { label: "Pull Requests", value: stats.totalPRs },
            { label: "Issues", value: stats.totalIssues },
            { label: "Reviews", value: stats.totalReviews },
            { label: "Stars", value: totalStars },
            { label: "Forks", value: totalForks },
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
                border: "1px solid var(--color-hairline)",
                borderRadius: "12px",
                backgroundColor: "var(--color-canvas-soft)",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.5px" }}>
                {item.value.toLocaleString("en-US")}
              </span>
              <span style={{ fontSize: "12px", color: "var(--color-ink-mute)", marginTop: "4px" }}>{item.label}</span>
              {item.label === "Contributor score" && (
                <Link
                  href="/score-explained"
                  style={{ fontSize: "11px", color: "var(--color-ink-mute-2)", marginTop: "4px", textDecoration: "none" }}
                >
                  Score explained →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      {techStack.length > 0 && (
        <div style={{ marginTop: "44px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: "0 0 16px 0", letterSpacing: "-0.2px" }}>
            Tech stack
          </h2>
          {(() => {
            const totalRepoCount = techStack.reduce((sum, t) => sum + t.repoCount, 0);
            if (totalRepoCount === 0) return null;
            const summary = techStack
              .map((t) => `${t.language} ${Math.round((t.repoCount / totalRepoCount) * 100)}%`)
              .join(", ");
            return (
              <div
                role="img"
                aria-label={`Language breakdown: ${summary}`}
                style={{
                  display: "flex",
                  width: "100%",
                  height: "8px",
                  borderRadius: "9999px",
                  overflow: "hidden",
                  marginBottom: "16px",
                  backgroundColor: "var(--color-canvas-soft)",
                }}
              >
                {techStack.map(({ language, repoCount }, i) => (
                  <div
                    key={language}
                    style={{
                      width: `${(repoCount / totalRepoCount) * 100}%`,
                      backgroundColor: LANG_COLORS[language] ?? "#9a9a9a",
                      borderTopLeftRadius: i === 0 ? "9999px" : 0,
                      borderBottomLeftRadius: i === 0 ? "9999px" : 0,
                      borderTopRightRadius: i === techStack.length - 1 ? "9999px" : 0,
                      borderBottomRightRadius: i === techStack.length - 1 ? "9999px" : 0,
                    }}
                  />
                ))}
              </div>
            );
          })()}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {techStack.map(({ language, repoCount }) => (
              <span
                key={language}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  color: "var(--color-ink)",
                  backgroundColor: "var(--color-canvas-soft)",
                }}
              >
                <span style={{ width: "10px", height: "10px", backgroundColor: LANG_COLORS[language] ?? "#9a9a9a", borderRadius: "9999px", flexShrink: 0, display: "inline-block" }}></span>{language}
                <span style={{ color: "var(--color-ink-mute)", fontSize: "12px" }}>×{repoCount}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Organizations */}
      {orgs.length > 0 && (
        <div style={{ marginTop: "44px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: "0 0 16px 0", letterSpacing: "-0.2px" }}>
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
                style={{ display: "inline-flex", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--color-hairline)", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3ecf8e")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
              >
                <Image src={org.avatarUrl} alt={org.login} width={36} height={36} style={{ display: "block" }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Contribution heatmap with year navigation */}
      {heatmap.length > 0 && (
        <div style={{ marginTop: "44px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: "0 0 16px 0", letterSpacing: "-0.2px" }}>
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
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  color: "var(--color-ink-mute)",
                  backgroundColor: "var(--color-canvas-soft)",
                }}
              >
                <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>
                  {value} {value === 1 ? "day" : "days"}
                </strong>
                {label}
              </span>
            ))}
          </div>
          <div
            style={{
              overflowX: "auto",
              padding: "16px",
              border: "1px solid var(--color-hairline)",
              borderRadius: "12px",
              backgroundColor: "var(--color-canvas-soft)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", minWidth: "max-content" }}>
              {/* Month labels */}
              <div style={{ display: "flex", gap: "3px", marginBottom: "4px", fontSize: "12px", color: "var(--color-ink-mute)" }}>
                {heatmap.map((week, wi) => {
                  const month = new Date(week.days[0].date).toLocaleString('en-US', { month: 'short' });
                  const show = wi === 0 || month !== new Date(heatmap[wi - 1].days[0].date).toLocaleString('en-US', { month: 'short' });
                  return (
                    <span key={wi} style={{ width: "11px", textAlign: "center", flexShrink: 0 }}>{show ? month : ""}</span>
                  );
                })}
              </div>
              {/* Weeks grid */}
              <div style={{ display: "flex", gap: "3px" }}>
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
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", margin: "10px 0 0 0" }}>
            <span style={{ fontSize: "12px", color: "var(--color-ink-mute)", marginRight: "2px" }}>Less</span>
            {["var(--color-hairline)", "#9be9a8", "#40c463", "#30a14e", "#216e39"].map((shade) => (
              <span
                key={shade}
                aria-hidden="true"
                style={{ width: "11px", height: "11px", borderRadius: "2px", backgroundColor: shade.startsWith("var") ? "rgba(128, 128, 128, 0.1)" : shade, flexShrink: 0 }}
              />
            ))}
            <span style={{ fontSize: "12px", color: "var(--color-ink-mute)", marginLeft: "2px" }}>More</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--color-ink-mute)", margin: "10px 0 0 0" }}>
            This chart shows an estimate of contribution activity. Exact daily counts are not available for public profiles.
          </p>
        </div>
      )}

      {/* Back to top */}
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

      {/* Hidden profile card for download */}
      <div style={{ position: "fixed", left: "-9999px", top: "-9999px", overflow: "hidden", pointerEvents: "none" }}>
        <div
          ref={cardRef}
          style={{
            width: "600px",
            height: "300px",
            padding: "32px",
            backgroundColor: "#1c1c1c",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px" }}>
            {/* Left section: user & score */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* User */}
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  style={{ width: "64px", height: "64px", borderRadius: "9999px", border: "1px solid rgba(255, 255, 255, 0.15)", objectFit: "cover" }}
                  crossOrigin="anonymous"
                />
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.3px", lineHeight: 1.2 }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: "13px", color: "#9a9a9a", marginTop: "2px" }}>
                    @{user.login}
                  </div>
                </div>
              </div>
              {/* Score */}
              <div>
                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: "#9a9a9a", fontWeight: 600 }}>
                  Contributor Score
                </div>
                <div style={{ fontSize: "44px", fontWeight: 700, color: "#3ecf8e", marginTop: "4px", lineHeight: 1 }}>
                  {score}
                </div>
              </div>
            </div>

            {/* Right section: stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "260px" }}>
              {[
                { label: "Commits", value: stats.totalCommits },
                { label: "PRs", value: stats.totalPRs },
                { label: "Issues", value: stats.totalIssues },
                { label: "Reviews", value: stats.totalReviews },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    backgroundColor: "#202020",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ fontSize: "20px", fontWeight: 600, color: "#ffffff", lineHeight: 1.1 }}>
                    {stat.value.toLocaleString("en-US")}
                  </div>
                  <div style={{ fontSize: "11px", color: "#9a9a9a", marginTop: "4px", fontWeight: 500 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer branding */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              paddingTop: "16px",
              marginTop: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3ecf8e" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff", letterSpacing: "-0.2px" }}>OSSfolio</span>
            </div>
            <span style={{ fontSize: "11px", fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace", color: "#707070" }}>
              ossfolio.qzz.io
            </span>
          </div>
        </div>
      </div>

      {/* Add Badge Modal */}
      {isOwner && (
        <dialog
          ref={dialogRef}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            margin: 0,
            border: "1px solid var(--color-hairline)",
            borderRadius: "12px",
            padding: "24px",
            backgroundColor: "var(--color-canvas)",
            color: "var(--color-ink)",
            maxWidth: "400px",
            width: "calc(100% - 32px)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: "var(--color-ink)", letterSpacing: "-0.2px" }}>
              Add Program Badge
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="program-select" style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-ink-mute)" }}>
                Program
              </label>
              <select
                id="program-select"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-hairline-strong)",
                  backgroundColor: "var(--color-canvas)",
                  color: "var(--color-ink)",
                  fontSize: "14px",
                  width: "100%",
                }}
              >
                {["GSSoC", "Hacktoberfest", "EluSoC", "GSoC", "MLH Fellowship", "SWoC"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="year-select" style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-ink-mute)" }}>
                Year
              </label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-hairline-strong)",
                  backgroundColor: "var(--color-canvas)",
                  color: "var(--color-ink)",
                  fontSize: "14px",
                  width: "100%",
                }}
              >
                {Array.from({ length: currentYear - 2000 + 1 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setIsBadgeModalOpen(false)}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-ink)",
                  backgroundColor: "var(--color-canvas)",
                  border: "1px solid var(--color-hairline-strong)",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddBadge}
                disabled={isSavingBadge}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundColor: "#3ecf8e",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isSavingBadge ? "not-allowed" : "pointer",
                }}
              >
                {isSavingBadge ? "Saving..." : "Add"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}