"use client";

import type { MergedPR, BadgeItem } from "@/types";
import { useMemo, useState } from "react";

interface TimelineEvent {
  id: string;
  type: "first_pr" | "pr" | "badge";
  title: string;
  description: string;
  date: string; // Used for chronological sorting
  displayDate: string;
  link?: string;
  meta?: string;
}

interface ContributionTimelineProps {
  mergedPRs: MergedPR[];
  badges?: BadgeItem[];
}

export function ContributionTimeline({ mergedPRs, badges = [] }: ContributionTimelineProps) {
  const PAGE_SIZE = 10;

  // 1. Gather and construct timeline events
  const events: TimelineEvent[] = [];

  // Parse PR events
  if (mergedPRs && mergedPRs.length > 0) {
    // Sort PRs chronologically ascending (oldest first) to find the absolute oldest retrieved PR
    const sortedAscPRs = [...mergedPRs].sort(
      (a, b) => new Date(a.mergedAt).getTime() - new Date(b.mergedAt).getTime()
    );

    sortedAscPRs.forEach((pr, index) => {
      const isOldest = index === 0;
      const formattedDate = new Date(pr.mergedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });

      events.push({
        id: `pr-${pr.url}`,
        type: isOldest ? "first_pr" : "pr",
        title: isOldest ? "🚀 Earliest Merged Pull Request (recent)" : "Merged Pull Request",
        description: pr.title,
        date: pr.mergedAt,
        displayDate: formattedDate,
        link: pr.url,
        meta: pr.repoName,
      });
    });
  }

  // Parse Badge events
  badges.forEach((badge) => {
    if (!badge || !badge.program || !Array.isArray(badge.years)) return;
    badge.years.forEach((year) => {
      // Use end of year date for sorting so it positions appropriately in the chronological flow
      const badgeDate = `${year}-12-31T23:59:59.999Z`;
      events.push({
        id: `badge-${badge.program}-${year}`,
        type: "badge",
        title: `🏆 Earned ${badge.program} Badge`,
        description: `Recognized for outstanding contributions to ${badge.program}`,
        date: badgeDate,
        displayDate: String(year),
      });
    });
  });

  // Sort events chronologically descending (newest first)
  const sortedEvents = useMemo(() => {
    // Mutate-free sort to avoid surprising updates across renders
    return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedPRs, badges]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleEvents = useMemo(() => sortedEvents.slice(0, visibleCount), [sortedEvents, visibleCount]);
  const hasMore = visibleCount < sortedEvents.length;


  return (
    <section style={{ marginTop: "44px" }}>
      <h2
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--color-ink)",
          margin: "0 0 20px 0",
          letterSpacing: "-0.2px",
        }}
      >
        Contribution Timeline
      </h2>

      <div
        style={{
          position: "relative",
          paddingLeft: "24px",
          marginLeft: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
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
                  left: "-31px", // Centered exactly over the 2px thread line at left: 0
                  top: "4px",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  border: `2px solid ${isHighlight ? "var(--color-primary)" : "var(--color-hairline-strong)"}`,
                  backgroundColor: isHighlight ? "var(--color-primary)" : "var(--color-canvas)",
                  boxShadow: isHighlight ? "0 0 8px var(--color-primary)" : "none",
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
                  border: `1px solid ${isHighlight ? "var(--color-hairline-strong)" : "var(--color-hairline)"}`,
                  backgroundColor: "var(--color-canvas-soft)",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-hairline-strong)";
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isHighlight
                    ? "var(--color-hairline-strong)"
                    : "var(--color-hairline)";
                  e.currentTarget.style.boxShadow = "none";
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
                      color: isHighlight ? "var(--color-primary)" : "var(--color-ink)",
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
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
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
              boxShadow: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Load More
          </button>
        </div>
      )}
      {sortedEvents.length === 0 ? null : null}
    </section>
  );
}


