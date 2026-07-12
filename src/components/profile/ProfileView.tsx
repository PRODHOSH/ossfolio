"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import type { MergedPR } from '@/types';
import { LatestMergedPRs } from '@/components/profile/LatestMergedPRs';
import { ContributionTimeline } from '@/components/profile/ContributionTimeline';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import type { ContributorStats, Org, TechEntry, HeatmapWeek, BadgeItem } from "@/types";
import { toPng } from "html-to-image";
import { supabase } from "@/lib/supabase";
import { LANG_COLORS } from "@/lib/languages";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { OrganizationSection } from "@/components/profile/OrganizationSection";
import { ProfileReposSection } from "@/components/profile/ProfileReposSection";
import { ProfileBadgeModal } from "@/components/profile/ProfileBadgeModal";
import * as Tooltip from "@radix-ui/react-tooltip";

// Code-split the contribution heatmap out of the initial ProfileView bundle.
// ProfileView is a client component, so `ssr: false` is valid here; the heatmap
// is client-only anyway (it fetches per-year data after mount). The SkeletonCard
// fallback reserves the heatmap's vertical space so lazy-loading causes no
// layout shift (CLS).
const HeatmapWithYearNav = dynamic(
  () => import("@/components/profile/HeatmapWithYearNav").then((mod) => mod.HeatmapWithYearNav),
  {
    ssr: false,
    loading: () => (
      <div style={{ marginTop: "44px" }} role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading contribution activity…</span>
        <SkeletonCard variant="card" lines={7} />
      </div>
    ),
  },
);

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


/** Full program names, shown on hover/focus — the badge itself only has room for the short name. */
const PROGRAM_FULL_NAMES: Record<string, string> = {
  GSoC: "Google Summer of Code",
  GSSoC: "GirlScript Summer of Code",
  SWoC: "Social Winter of Code",
  Hacktoberfest: "Hacktoberfest",
  EluSoC: "EduLinkUp Season of Code",
};

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
  updatedAt: string | null;
  badges: BadgeItem[];
  profileId: string | null;
  rateLimited?: boolean;
  mergedPRs: MergedPR[];
}

function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return n.toLocaleString("en-US");
}

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

function ProfileFreshness({ username, updatedAt }: { username: string; updatedAt?: string }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(updatedAt);
  const [relativeTime, setRelativeTime] = useState("...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      if (!lastRefresh) return "Unknown";
      const diff = Date.now() - new Date(lastRefresh).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };
    const id = setTimeout(() => setRelativeTime(compute()), 0);
    const interval = setInterval(() => setRelativeTime(compute()), 60000);
    return () => { clearTimeout(id); clearInterval(interval); };
  }, [lastRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/${username}/refresh`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLastRefresh(data.refreshedAt);
        router.refresh();
      } else {
        const payload = await res.json().catch(() => ({ error: "Refresh failed" }));
        if (res.status === 429 && payload.retryAfterSeconds) {
          setErrorMsg(`Try again in ${Math.ceil(payload.retryAfterSeconds / 60)} min`);
        } else {
          setErrorMsg(payload.error || "Refresh failed");
        }
      }
    } catch {
      setErrorMsg("Network error");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
      <span style={{ fontSize: "12px", color: "var(--color-ink-mute)" }}>
        Updated {relativeTime}
      </span>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          fontSize: "11px",
          padding: "2px 8px",
          borderRadius: "6px",
          border: "1px solid var(--color-hairline-cool)",
          background: "var(--color-canvas-soft)",
          color: "var(--color-primary)",
          cursor: refreshing ? "not-allowed" : "pointer",
          opacity: refreshing ? 0.6 : 1,
        }}
        aria-label="Refresh profile data"
      >
        {refreshing ? "Refreshing..." : "Refresh"}
      </button>
      {errorMsg && (
        <span style={{ fontSize: "11px", color: "var(--color-error, #dc2626)" }}>{errorMsg}</span>
      )}
    </div>
  );
}

function ProfileDownloadCard({
  user,
  stats,
  score,
  displayName,
}: {
  user: GitHubUser;
  stats: ContributorStats;
  score: number;
  displayName: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: { transform: "scale(1)", transformOrigin: "top left" },
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

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
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
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <Image
                  src={user.avatar_url}
                  alt={displayName}
                  width={64}
                  height={64}
                  unoptimized
                  style={{ width: "64px", height: "64px", borderRadius: "9999px", border: "1px solid rgba(255, 255, 255, 0.15)", objectFit: "cover" }}
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
              <div>
                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: "#9a9a9a", fontWeight: 600 }}>
                  Contributor Score
                </div>
                <div style={{ fontSize: "44px", fontWeight: 700, color: "#3ecf8e", marginTop: "4px", lineHeight: 1 }}>
                  {score.toLocaleString("en-US")}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "260px" }}>
              {[
                { label: "Commits", value: stats.totalCommits },
                { label: "PRs", value: stats.totalPRs },
                { label: "Issues", value: stats.totalIssues },
                { label: "Reviews", value: stats.totalReviews },
              ].map((stat) => (
                <div key={stat.label} style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "12px 14px", backgroundColor: "#202020", display: "flex", flexDirection: "column", justifyContent: "center" }}>
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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "16px", marginTop: "16px" }}>
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
    </>
  );
}

interface FilterTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  dotColor?: string;
}

function FilterTab({ label, isActive, onClick, dotColor }: FilterTabProps) {
  return (
      <button
        type="button"
        aria-pressed="false"
        data-aria-pressed={isActive}


        onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        fontSize: "13px",
        fontWeight: isActive ? 600 : 400,
        color: isActive ? "var(--color-ink)" : "var(--color-ink-mute)",
        backgroundColor: isActive ? "var(--color-canvas-soft)" : "transparent",
        border: "1px solid",
        borderColor: isActive ? "var(--color-hairline-strong)" : "transparent",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--color-ink)";
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "var(--color-canvas-soft)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = "var(--color-ink-mute)";
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      {dotColor && (
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: dotColor,
            display: "inline-block",
          }}
        />
      )}
      {label}
    </button>
  );
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
  mergedPRs,
  customLinks = [],
  customizationLoaded = false,
}: {
  user: GitHubUser;
  repos: GitHubRepo[];
} &
  ProfileExtras &
  {
    rateLimited?: boolean;
    customLinks?: Array<{ label: string; url: string }>;
    customizationLoaded?: boolean;
  }) {
  const [copied, setCopied] = useState(false);
  const [repoSort, setRepoSort] = useState<"stars" | "forks" | "updated">("stars");
  const [isDownloading, setIsDownloading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [repoFilter, setRepoFilter] = useState("");
  const [activeLanguage, setActiveLanguage] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<"repos" | "stats" | "prs" | "timeline">("repos");

  const profileTabs = [
    { key: "repos" as const, label: "Repos" },
    { key: "stats" as const, label: "Stats" },
    { key: "prs" as const, label: "PRs" },
    { key: "timeline" as const, label: "Timeline" },
  ];

  const tabTransition = { duration: 0.18, ease: [0.25, 0.1, 0.25, 1.0] as const };
  const tabInitial = { opacity: 0, y: 6 };
  const tabAnimate = { opacity: 1, y: 0, transition: tabTransition };
  const tabExit = { opacity: 0, y: -6, transition: { duration: 0.12, ease: "easeIn" as const } };

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const keys = profileTabs.map((t) => t.key);
      const currentIndex = keys.indexOf(activeTab);
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % keys.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + keys.length) % keys.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = keys.length - 1;
      }

      if (nextIndex !== null && nextIndex !== currentIndex) {
        const nextKey = keys[nextIndex];
        setActiveTab(nextKey);
        // Focus the destination button by its stable DOM id
        const btn = document.getElementById(`profile-tab-${nextKey}`);
        if (btn) (btn as HTMLButtonElement).focus();
      }
    },
    [activeTab],
  );

  const uniqueLanguages = useMemo(() => {
    return Array.from(
      new Set(
        repos
          .map((r) => r.language)
          .filter((l): l is string => typeof l === "string" && l.trim() !== "")
      )
    ).sort();
  }, [repos]);

  const filteredRepos = useMemo(() => {
    return [...repos]
      .sort((a, b) => {
        if (repoSort === "forks") return b.forks_count - a.forks_count;
        if (repoSort === "updated") return (b.pushed_at || "").localeCompare(a.pushed_at || "");
        return b.stargazers_count - a.stargazers_count;
      })
      .filter((repo) => !repoFilter || repo.name.toLowerCase().includes(repoFilter.toLowerCase()) || (repo.description || "").toLowerCase().includes(repoFilter.toLowerCase()))
      .filter((repo) => activeLanguage === "All" || repo.language === activeLanguage);
  }, [repos, repoSort, repoFilter, activeLanguage]);

  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  useKeyboardShortcuts({ onSlash: focusSearch });

  const [showBackToTop, setShowBackToTop] = useState(false);
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(updatedAt);
  const [relativeTime, setRelativeTime] = useState("...");

  useEffect(() => {
    const compute = () => {
      if (!lastRefresh) return "Unknown";
      const diff = Date.now() - new Date(lastRefresh).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };
    const initialUpdate = setTimeout(() => setRelativeTime(compute()), 0);
    const interval = setInterval(() => setRelativeTime(compute()), 60000);
    return () => {
      clearInterval(interval);
      clearTimeout(initialUpdate);
    };
  }, [lastRefresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/${user.login}/refresh`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLastRefresh(data.refreshedAt);
        router.refresh();
      } else {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Refresh failed");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const isOwner = !!(
    authUser && (
      (profileId && authUser.id === profileId) ||
      (!profileId && authUser.user_metadata?.user_name?.toLowerCase() === user.login?.toLowerCase())
    )
  );

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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

  const handleRemoveBadge = async (program: string) => {
    if (!profileId) {
      alert("Please sync your profile first before removing badges.");
      return;
    }
    const confirmRemove = confirm(`Are you sure you want to remove the ${program} badge?`);
    if (!confirmRemove) return;

    try {
      const updatedList = badgesList.filter((b) => b.program !== program);
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: profileId,
          username: user.login,
          badges: updatedList,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        alert(`Failed to remove badge: ${error.message}`);
      } else {
        setBadgesList(updatedList);
      }
    } catch (err) {
      console.error("Error removing badge:", err);
    }
  };

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

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

          <div style={{ fontSize: "12px", color: "var(--color-ink-mute)", marginTop: "8px" }}>
            Updated {relativeTime}
          </div>

          {(() => {
            let tierName = "Bronze Contributor";
            let tierColor = "#cd7f32";
            let tierBg = "rgba(205, 127, 50, 0.15)";
            if (score >= 1000) {
              tierName = "Diamond Contributor";
              tierColor = "#00e1d9";
              tierBg = "rgba(0, 225, 217, 0.15)";
            } else if (score >= 500) {
              tierName = "Platinum Contributor";
              tierColor = "#e5e4e2";
              tierBg = "rgba(229, 228, 226, 0.15)";
            } else if (score >= 250) {
              tierName = "Gold Contributor";
              tierColor = "#ffd700";
              tierBg = "rgba(255, 215, 0, 0.15)";
            } else if (score >= 100) {
              tierName = "Silver Contributor";
              tierColor = "#c0c0c0";
              tierBg = "rgba(192, 192, 192, 0.15)";
            }
            return (
              <div style={{ marginTop: "12px", display: "inline-flex", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: tierColor, backgroundColor: tierBg, border: `1px solid ${tierColor}`, padding: "3px 8px", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  {tierName}
                </span>
              </div>
            );
          })()}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "14px", alignItems: "center" }}>
            {user.location && (
              <span style={{ fontSize: "14px", color: "var(--color-ink-mute)", display: "flex", alignItems: "center", gap: "5px" }}>
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
            >
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>

          <div style={{ marginTop: "14px" }}>
            <ProfileActions
              username={user.login}
              score={score}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          </div>

          <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ProfileDownloadCard user={user} stats={stats} score={score} displayName={displayName} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search repositories..."
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              style={{
                padding: "7px 14px",
                fontSize: "13px",
                border: "1px solid var(--color-hairline-strong)",
                borderRadius: "6px",
                backgroundColor: "var(--color-canvas-soft)",
                color: "var(--color-ink)",
                outline: "none",
              }}
              aria-label="Search repositories"
            />
          </div>

          <div style={{ display: "flex", gap: "20px", marginTop: "14px" }}>
            <span style={{ fontSize: "13px", color: "var(--color-ink-mute)" }}>
              <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>{formatCount(user.followers)}</strong> followers
            </span>
            <span style={{ fontSize: "13px", color: "var(--color-ink-mute)" }}>
              <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>{formatCount(user.following)}</strong> following
            </span>
            <span style={{ fontSize: "13px", color: "var(--color-ink-mute)" }}>
              <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>{formatCount(user.public_repos)}</strong> repos
            </span>
          </div>

          {/* Custom profile links (from Supabase custom_links) */}
          <div style={{ marginTop: "18px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink-mute)", margin: 0, letterSpacing: "-0.2px" }}>
              Links
            </h2>

            {!customizationLoaded ? (
              isOwner ? (
                <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: "8px 0 0 0" }}>
                  Loading your saved links...
                </p>
              ) : null
            ) : customLinks.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                {customLinks.map((l) => (
                  <a
                    key={`${l.label}-${l.url}`}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "13px",
                      color: "var(--color-ink-mute)",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      border: "1px solid var(--color-hairline)",
                      borderRadius: "9999px",
                      backgroundColor: "var(--color-canvas-soft)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-mute)")}
                    aria-label={`${l.label} (opens in a new tab)`}
                  >
                    {l.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 3h7v7" />
                      <path d="M10 14L21 3" />
                      <path d="M21 14v7H3V3h7" />
                    </svg>
                  </a>
                ))}
              </div>
            ) : isOwner ? (
              <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: "8px 0 0 0" }}>
                No custom links saved yet.
              </p>
            ) : null}
          </div>

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
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add badge
              </button>
            )}
          </div>
          {badgesList.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: 0 }}>No badges claimed yet. Click &quot;Add badge&quot; to show your participation.</p>
          ) : (
            <Tooltip.Provider delayDuration={200}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {badgesList.map((badge) => {
                if (!badge || !badge.program || !Array.isArray(badge.years)) return null;
                const style = PROGRAM_STYLING[badge.program] || {
                  gradient: "linear-gradient(135deg, #707070 0%, #9a9a9a 100%)",
                  text: "#ffffff",
                  bg: "rgba(128, 128, 128, 0.1)",
                };
                const fullName = PROGRAM_FULL_NAMES[badge.program] ?? badge.program;
                return (
                  <Tooltip.Root key={badge.program}>
                    <Tooltip.Trigger asChild>
                  <div
                    tabIndex={0}
                    aria-label={fullName}
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
                    }}
                  >
                    <span>{badge.program}</span>
                    <span style={{ backgroundColor: "rgba(255, 255, 255, 0.25)", padding: "2px 6px", borderRadius: "9999px", fontSize: "11px", fontWeight: 500 }}>
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
                      >
                        &times;
                      </button>
                    )}
                  </div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="top"
                        sideOffset={6}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 500,
                          lineHeight: 1.4,
                          color: "var(--color-on-primary)",
                          backgroundColor: "var(--color-ink)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 50,
                        }}
                      >
                        {fullName}
                        <Tooltip.Arrow style={{ fill: "var(--color-ink)" }} />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                );
              })}
            </div>
            </Tooltip.Provider>
          )}
        </div>
      )}

      {/* Tab navigation */}
      <div
        role="tablist"
        aria-label="Profile sections"
        style={{
          display: "flex",
          gap: "4px",
          marginTop: "40px",
          borderBottom: "1px solid var(--color-hairline)",
          paddingBottom: "0",
          position: "relative",
        }}
      >
        {profileTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`profile-tab-${tab.key}`}
            aria-selected={activeTab === tab.key}
            aria-controls={`profile-tabpanel-${tab.key}`}
            tabIndex={activeTab === tab.key ? 0 : -1}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={handleTabKeyDown}
            style={{
              position: "relative",
              padding: "10px 18px",
              fontSize: "13px",
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "var(--color-ink)" : "var(--color-ink-mute)",
              background: "none",
              border: "none",
              borderBottom: "2px solid",
              borderBottomColor: activeTab === tab.key ? "#3ecf8e" : "transparent",
              cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease",
              marginBottom: "-1px",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.color = "var(--color-ink)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.color = "var(--color-ink-mute)";
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content with animated transitions */}
      <AnimatePresence mode="wait">
        {activeTab === "repos" && (
          <motion.div
            key="repos"
            role="tabpanel"
            id="profile-tabpanel-repos"
            aria-labelledby="profile-tab-repos"
            initial={tabInitial}
            animate={tabAnimate}
            exit={tabExit}
          >
      {/* Repos */}
      <div style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 12px 0", flexWrap: "wrap", gap: "12px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: 0, letterSpacing: "-0.2px" }}>
            Popular repositories
          </h2>
          <div role="group" aria-label="Sort popular repositories" style={{ display: "flex", gap: "6px" }}>
            {(["stars", "forks", "updated"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={repoSort === option ? "true" : "false"}
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
          <div style={{ padding: "40px", border: "1px dashed var(--color-hairline-strong)", borderRadius: "12px", textAlign: "center", backgroundColor: "var(--color-canvas-soft)", margin: "16px 0" }}>
            <svg style={{ margin: "0 auto 12px", color: "var(--color-ink-mute-2)" }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
              <path d="M12 18H12.01" />
            </svg>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>No public repositories found</p>
            <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: "4px 0 0 0" }}>Create public repositories on GitHub to display them here.</p>
          </div>
        ) : (
          <>
            {uniqueLanguages.length > 0 && (
              <div
                role="group"
                aria-label="Filter popular repositories by language"
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                  borderBottom: "1px solid var(--color-hairline)",
                  paddingBottom: "12px",
                }}
              >
                <FilterTab
                  label="All"
                  isActive={activeLanguage === "All"}
                  onClick={() => setActiveLanguage("All")}
                />
                {uniqueLanguages.map((lang) => (
                  <FilterTab
                    key={lang}
                    label={lang}
                    isActive={activeLanguage === lang}
                    onClick={() => setActiveLanguage(lang)}
                    dotColor={LANG_COLORS[lang] ?? "#9a9a9a"}
                  />
                ))}
              </div>
            )}

            {filteredRepos.length === 0 ? (
              <div style={{ padding: "40px", border: "1px dashed var(--color-hairline-strong)", borderRadius: "12px", textAlign: "center", backgroundColor: "var(--color-canvas-soft)", margin: "16px 0" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>No matching repositories found</p>
                <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: "4px 0 0 0" }}>Try adjusting your search or language filter.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
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
            )}

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
          </motion.div>
        )}

        {activeTab === "stats" && (
          <motion.div
            key="stats"
            role="tabpanel"
            id="profile-tabpanel-stats"
            aria-labelledby="profile-tab-stats"
            initial={tabInitial}
            animate={tabAnimate}
            exit={tabExit}
          >
      {/* Contribution stats */}
      <div style={{ marginTop: "24px" }}>
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
          </motion.div>
        )}

        {activeTab === "prs" && (
          <motion.div
            key="prs"
            role="tabpanel"
            id="profile-tabpanel-prs"
            aria-labelledby="profile-tab-prs"
            initial={tabInitial}
            animate={tabAnimate}
            exit={tabExit}
            style={{ marginTop: "24px" }}
          >
            <LatestMergedPRs mergedPRs={mergedPRs} />
          </motion.div>
        )}

        {activeTab === "timeline" && (
          <motion.div
            key="timeline"
            role="tabpanel"
            id="profile-tabpanel-timeline"
            aria-labelledby="profile-tab-timeline"
            initial={tabInitial}
            animate={tabAnimate}
            exit={tabExit}
          >
      {/* Contribution Timeline */}
      <ContributionTimeline mergedPRs={mergedPRs} badges={badgesList} />
          </motion.div>
        )}
      </AnimatePresence>

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
      <OrganizationSection orgs={orgs} />

      {/* Contribution heatmap with year navigation */}
      <HeatmapWithYearNav
        username={user.login}
        initialWeeks={heatmap}
        initialCurrentStreak={currentStreak}
        initialLongestStreak={longestStreak}
      />

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
            zIndex: 50,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}

      {/* Badge Modal */}
      {isOwner && (
        <ProfileBadgeModal
          open={isBadgeModalOpen}
          onClose={() => setIsBadgeModalOpen(false)}
          badgesList={badgesList}
          onBadgesUpdate={setBadgesList}
          profileId={profileId}
          username={user.login}
        />
      )}
    </div>
  );
}
