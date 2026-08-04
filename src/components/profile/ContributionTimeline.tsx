"use client";

import type { MergedPR, BadgeItem, Org } from "@/types";
import { useMemo, useState } from "react";

export interface RepoItem {
  name: string;
  description?: string | null;
  stars?: number;
  forks?: number;
  language?: string | null;
  url?: string;
  pushed_at?: string;
  createdAt?: string;
}

export interface ContributionTimelineProps {
  mergedPRs?: MergedPR[];
  repos?: RepoItem[];
  orgs?: Org[];
  badges?: BadgeItem[];
}

export type TimelineFilterCategory = "all" | "pr" | "repo" | "org" | "badge";

interface TimelineEvent {
  id: string;
  type: "first_pr" | "pr" | "repo" | "org" | "badge";
  category: "pr" | "repo" | "org" | "badge";
  title: string;
  description: string;
  date: string; // Used for chronological sorting
  displayDate: string;
  link?: string;
  meta?: string;
  badgeLabel?: string;
}

const CATEGORY_COLORS: Record<
  "pr" | "first_pr" | "repo" | "org" | "badge",
  { border: string; bg: string; text: string; dot: string }
> = {
  first_pr: {
    border: "#3ecf8e",
    bg: "rgba(62, 207, 142, 0.12)",
    text: "#3ecf8e",
    dot: "#3ecf8e",
  },
  pr: {
    border: "var(--color-hairline-strong)",
    bg: "var(--color-canvas-soft)",
    text: "var(--color-ink)",
    dot: "#22c55e",
  },
  repo: {
    border: "rgba(168, 85, 247, 0.4)",
    bg: "rgba(168, 85, 247, 0.08)",
    text: "#a855f7",
    dot: "#a855f7",
  },
  org: {
    border: "rgba(59, 130, 246, 0.4)",
    bg: "rgba(59, 130, 246, 0.08)",
    text: "#3b82f6",
    dot: "#3b82f6",
  },
  badge: {
    border: "rgba(245, 158, 11, 0.4)",
    bg: "rgba(245, 158, 11, 0.08)",
    text: "#f59e0b",
    dot: "#f59e0b",
  },
};

export function ContributionTimeline({
  mergedPRs = [],
  repos = [],
  orgs = [],
  badges = [],
}: ContributionTimelineProps) {
  const PAGE_SIZE = 10;
  const [activeFilter, setActiveFilter] = useState<TimelineFilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const mergedOnlyPRs = useMemo(() => {
    return (mergedPRs || []).filter((pr) => !pr.state || pr.state === "merged");
  }, [mergedPRs]);

  // Gather and construct timeline events
  const allEvents = useMemo(() => {
    const eventsList: TimelineEvent[] = [];

    // 1. Parse PR events
    if (mergedOnlyPRs && mergedOnlyPRs.length > 0) {
      const sortedAscPRs = [...mergedOnlyPRs].sort(
        (a, b) => new Date(a.mergedAt).getTime() - new Date(b.mergedAt).getTime(),
      );

      sortedAscPRs.forEach((pr, index) => {
        const isOldest = index === 0;
        const formattedDate = pr.mergedAt
          ? new Date(pr.mergedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })
          : "Recent";

        eventsList.push({
          id: `pr-${pr.url || index}`,
          type: isOldest ? "first_pr" : "pr",
          category: "pr",
          title: isOldest ? "🚀 First Merged Pull Request" : "Merged Pull Request",
          description: pr.title,
          date: pr.mergedAt || new Date().toISOString(),
          displayDate: formattedDate,
          link: pr.url,
          meta: pr.repoName,
          badgeLabel: "PR",
        });
      });
    }

    // 2. Parse Repository events
    repos.forEach((repo, idx) => {
      if (!repo || !repo.name) return;
      const repoDate = repo.pushed_at || repo.createdAt || new Date().toISOString();
      const formattedDate = new Date(repoDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });

      eventsList.push({
        id: `repo-${repo.name}-${idx}`,
        type: "repo",
        category: "repo",
        title: `📦 Created / Contributed to ${repo.name}`,
        description: repo.description || `Repository project written in ${repo.language || "code"}`,
        date: repoDate,
        displayDate: formattedDate,
        link: repo.url,
        meta: repo.stars ? `⭐ ${repo.stars.toLocaleString("en-US")} stars` : repo.language || undefined,
        badgeLabel: "Repo",
      });
    });

    // 3. Parse Organization events
    orgs.forEach((org, idx) => {
      if (!org || !org.login) return;
      // Use fallback chronological anchor if exact join date isn't provided
      const orgDate = new Date(Date.now() - (idx + 1) * 30 * 24 * 3600 * 1000).toISOString();
      eventsList.push({
        id: `org-${org.login}-${idx}`,
        type: "org",
        category: "org",
        title: `🏢 Joined Organization: ${org.name || org.login}`,
        description: `Member of ${org.name || org.login} open-source organization on GitHub`,
        date: orgDate,
        displayDate: `@${org.login}`,
        link: org.url,
        meta: org.login,
        badgeLabel: "Org",
      });
    });

    // 4. Parse Badge / Milestone events
    badges.forEach((badge) => {
      if (!badge || !badge.program || !Array.isArray(badge.years)) return;
      badge.years.forEach((year) => {
        const badgeDate = `${year}-12-31T23:59:59.999Z`;
        eventsList.push({
          id: `badge-${badge.program}-${year}`,
          type: "badge",
          category: "badge",
          title: `🏆 Earned ${badge.program} Badge (${year})`,
          description: `Recognized for outstanding contributions to ${badge.program}`,
          date: badgeDate,
          displayDate: String(year),
          badgeLabel: "Milestone",
        });
      });
    });

    // Sort all events chronologically descending (newest first)
    return eventsList.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [mergedOnlyPRs, repos, orgs, badges]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    return {
      all: allEvents.length,
      pr: allEvents.filter((e) => e.category === "pr").length,
      repo: allEvents.filter((e) => e.category === "repo").length,
      org: allEvents.filter((e) => e.category === "org").length,
      badge: allEvents.filter((e) => e.category === "badge").length,
    };
  }, [allEvents]);

  // Filtered and searched events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesCategory =
        activeFilter === "all" || event.category === activeFilter;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        (event.meta && event.meta.toLowerCase().includes(q))
      );
    });
  }, [allEvents, activeFilter, searchQuery]);

  const visibleEvents = useMemo(
    () => filteredEvents.slice(0, visibleCount),
    [filteredEvents, visibleCount],
  );

  const hasMore = visibleCount < filteredEvents.length;

  const filters: Array<{ key: TimelineFilterCategory; label: string; count: number }> = [
    { key: "all", label: "All Activities", count: categoryCounts.all },
    { key: "pr", label: "Pull Requests", count: categoryCounts.pr },
    { key: "repo", label: "Repositories", count: categoryCounts.repo },
    { key: "org", label: "Organizations", count: categoryCounts.org },
    { key: "badge", label: "Milestones", count: categoryCounts.badge },
  ];

  return (
    <section style={{ marginTop: "44px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
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
          Contribution Timeline
        </h2>

        {/* Search Filter Input */}
        <div style={{ position: "relative", minWidth: "200px" }}>
          <input
            type="text"
            placeholder="Search timeline..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            style={{
              width: "100%",
              padding: "6px 12px 6px 30px",
              fontSize: "13px",
              color: "var(--color-ink)",
              backgroundColor: "var(--color-canvas-soft)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "6px",
              outline: "none",
            }}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-ink-mute)",
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Filter Category Control Chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
        role="tablist"
        aria-label="Filter contribution timeline by event category"
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveFilter(filter.key);
                setVisibleCount(PAGE_SIZE);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--color-ink)" : "var(--color-ink-mute)",
                backgroundColor: isActive
                  ? "var(--color-canvas-soft)"
                  : "transparent",
                border: "1px solid",
                borderColor: isActive
                  ? "var(--color-hairline-strong)"
                  : "var(--color-hairline)",
                borderRadius: "20px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>{filter.label}</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: "10px",
                  backgroundColor: isActive
                    ? "var(--color-primary)"
                    : "var(--color-canvas-soft)",
                  color: isActive ? "#ffffff" : "var(--color-ink-mute)",
                }}
              >
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline Event Feed */}
      <div
        style={{
          position: "relative",
          paddingLeft: "24px",
          marginLeft: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Timeline vertical thread line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "8px",
            bottom: "8px",
            width: "2px",
            backgroundColor: "var(--color-hairline-strong)",
            opacity: 0.8,
          }}
        />

        {visibleEvents.map((event) => {
          const styling = CATEGORY_COLORS[event.type] || CATEGORY_COLORS.pr;
          const isHighlight = event.type === "first_pr" || event.type === "badge";

          return (
            <div
              key={event.id}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {/* Timeline marker node dot */}
              <div
                style={{
                  position: "absolute",
                  left: "-31px",
                  top: "6px",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  border: `2px solid ${styling.dot}`,
                  backgroundColor: isHighlight
                    ? styling.dot
                    : "var(--color-canvas)",
                  boxShadow: isHighlight ? `0 0 8px ${styling.dot}` : "none",
                  zIndex: 2,
                  transition: "all 0.2s ease",
                }}
              />

              {/* Event Content card */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px",
                  borderRadius: "8px",
                  border: `1px solid ${styling.border}`,
                  backgroundColor: styling.bg,
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: styling.text,
                    }}
                  >
                    {event.title}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--color-ink-mute)",
                      fontFamily: "ui-monospace, Menlo, Monaco, monospace",
                    }}
                  >
                    {event.displayDate}
                  </span>
                </div>

                {event.link ? (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "13px",
                      color: "var(--color-ink)",
                      textDecoration: "none",
                      fontWeight: 500,
                      marginBottom: "4px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                      e.currentTarget.style.color = "var(--color-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                      e.currentTarget.style.color = "var(--color-ink)";
                    }}
                  >
                    {event.description}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ flexShrink: 0 }}
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ) : (
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--color-ink)",
                      marginBottom: "4px",
                    }}
                  >
                    {event.description}
                  </span>
                )}

                {event.meta && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--color-ink-mute)",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {event.meta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div style={{ marginTop: "20px", paddingLeft: "8px" }}>
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--color-ink)",
              backgroundColor: "var(--color-canvas)",
              border: "1px solid var(--color-hairline-strong)",
              borderRadius: "8px",
              padding: "10px 16px",
              cursor: "pointer",
              transition: "transform 0.05s ease, box-shadow 0.2s ease",
            }}
          >
            Load More ({filteredEvents.length - visibleEvents.length} remaining)
          </button>
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <div
          style={{
            marginTop: "16px",
            padding: "32px",
            border: "1px solid var(--color-hairline)",
            borderRadius: "12px",
            backgroundColor: "var(--color-canvas)",
            textAlign: "center",
            color: "var(--color-ink-mute)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 500,
              color: "var(--color-ink)",
            }}
          >
            No events match the selected criteria
          </p>
          <p
            style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "var(--color-ink-mute)",
            }}
          >
            Try selecting a different filter category or clearing the search query.
          </p>
        </div>
      ) : null}
    </section>
  );
}
