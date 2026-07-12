"use client";

import { useState, useCallback, memo, useMemo } from "react";
import type { HeatmapWeek } from "@/types";
import { computeStreaks } from "@/lib/mock";

interface HeatmapWithYearNavProps {
  username: string;
  initialWeeks: HeatmapWeek[];
  initialCurrentStreak: number;
  initialLongestStreak: number;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const YearButton = memo(function YearButton({
  year,
  selectedYear,
  loading,
  onClick,
}: {
  year: number;
  selectedYear: number;
  loading: boolean;
  onClick: (year: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(year)}
      disabled={loading}
      style={{
        padding: "4px 10px",
        fontSize: "12px",
        fontWeight: selectedYear === year ? 600 : 400,
        color: selectedYear === year ? "#171717" : "var(--color-ink-mute)",
        backgroundColor: selectedYear === year ? "#3ecf8e" : "var(--color-canvas-soft)",
        border: selectedYear === year ? "none" : "1px solid var(--color-hairline)",
        borderRadius: "9999px",
        cursor: loading ? "wait" : "pointer",
        transition: "background-color 0.15s, color 0.15s",
        // Hold the pill's natural width so the strip scrolls instead of squashing.
        flexShrink: 0,
      }}
    >
      {year}
    </button>
  );
});

const StreakBadge = memo(function StreakBadge({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span
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
  );
});

interface DisplayedDay {
  date: string;
  count: number;
  color: string;
  isPlaceholder?: boolean;
}

interface DisplayedWeek {
  days: DisplayedDay[];
}

function getFilteredWeeks(
  weeks: HeatmapWeek[],
  selectedYear: number,
  viewMode: "365" | "calendar"
): DisplayedWeek[] {
  if (viewMode === "365" && selectedYear === currentYear) {
    return weeks as DisplayedWeek[];
  }

  const yearStr = `${selectedYear}-`;

  return weeks
    .map((week) => {
      const days: DisplayedDay[] = week.days.map((day) => {
        if (day.date.startsWith(yearStr)) {
          return day;
        }
        return {
          ...day,
          count: 0,
          color: "transparent",
          isPlaceholder: true,
        };
      });

      return { ...week, days };
    })
    .filter((week) => week.days.some((day) => !day.isPlaceholder));
}

function HeatmapWithYearNavInner({
  username,
  initialWeeks,
  initialCurrentStreak,
  initialLongestStreak,
}: HeatmapWithYearNavProps) {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [weeks, setWeeks] = useState(initialWeeks);
  const [viewMode, setViewMode] = useState<"365" | "calendar">("365");
  const [loading, setLoading] = useState(false);

  const fetchYear = useCallback(
    async (year: number) => {
      if (year === selectedYear && weeks.length > 0) return;
      if (year === currentYear && initialWeeks.length > 0) {
        setWeeks(initialWeeks);
        setSelectedYear(year);
        return;
      }

      setLoading(true);
      setSelectedYear(year);
      try {
        const res = await fetch(`/api/${encodeURIComponent(username)}/contributions?year=${year}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setWeeks(data.weeks);
      } catch {
        setWeeks([]);
      } finally {
        setLoading(false);
      }
    },
    [username, selectedYear, weeks.length, initialWeeks]
  );

  const displayedWeeks = useMemo(() => {
    return getFilteredWeeks(weeks, selectedYear, selectedYear === currentYear ? viewMode : "calendar");
  }, [weeks, selectedYear, viewMode]);

  const { currentStreak, longestStreak } = useMemo(() => {
    const streaks = computeStreaks(displayedWeeks);
    return {
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
    };
  }, [displayedWeeks]);

  if (initialWeeks.length === 0 && weeks.length === 0) return null;

  return (
    <div style={{ marginTop: "44px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 16px 0" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: 0, letterSpacing: "-0.2px" }}>
          Contribution activity
        </h2>
        <div
          style={{
            display: "flex",
            gap: "6px",
            // Keep the years on one row and let the strip scroll horizontally on
            // narrow screens rather than squashing the buttons. `minWidth: 0` is
            // required because this div is itself a flex item — without it the
            // default `min-width: auto` prevents it from shrinking below its
            // content, so `overflowX` would never engage.
            flexWrap: "nowrap",
            overflowX: "auto",
            minWidth: 0,
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {years.map((year) => (
            <YearButton
              key={year}
              year={year}
              selectedYear={selectedYear}
              loading={loading}
              onClick={fetchYear}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          margin: "0 0 12px 0",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <StreakBadge label="Current streak" value={currentStreak} />
          <StreakBadge label="Longest streak" value={longestStreak} />
        </div>

        {/* Toggle switch for Last 365 Days vs Calendar Year */}
        {selectedYear === currentYear && (
          <div
            style={{
              display: "inline-flex",
              backgroundColor: "var(--color-canvas-soft)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "20px",
              padding: "2px",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("365")}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: viewMode === "365" ? 600 : 400,
                color: viewMode === "365" ? "#171717" : "var(--color-ink-mute)",
                backgroundColor: viewMode === "365" ? "#3ecf8e" : "transparent",
                border: "none",
                borderRadius: "9999px",
                cursor: "pointer",
                transition: "background-color 0.15s, color 0.15s",
              }}
            >
              Last 365 Days
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              style={{
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: viewMode === "calendar" ? 600 : 400,
                color: viewMode === "calendar" ? "#171717" : "var(--color-ink-mute)",
                backgroundColor: viewMode === "calendar" ? "#3ecf8e" : "transparent",
                border: "none",
                borderRadius: "9999px",
                cursor: "pointer",
                transition: "background-color 0.15s, color 0.15s",
              }}
            >
              {currentYear} Year
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "3px",
          overflowX: "auto",
          padding: "16px",
          border: "1px solid var(--color-hairline)",
          borderRadius: "12px",
          backgroundColor: "var(--color-canvas-soft)",
          opacity: loading ? 0.5 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {displayedWeeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {week.days.map((day, di) => (
              <div
                key={di}
                title={day.isPlaceholder ? undefined : `${day.count} contributions on ${day.date}`}
                style={{
                  width: "11px",
                  height: "11px",
                  borderRadius: "2px",
                  backgroundColor: day.isPlaceholder ? "transparent" : day.color,
                  flexShrink: 0,
                  pointerEvents: day.isPlaceholder ? "none" : "auto",
                }}
              />
            ))}
          </div>
        ))}
        {displayedWeeks.length === 0 && !loading && (
          <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: "12px auto" }}>
            No contribution data available for {selectedYear}.
          </p>
        )}
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
  );
}

export const HeatmapWithYearNav = memo(HeatmapWithYearNavInner);
