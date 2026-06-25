"use client";

import { useState, useCallback } from "react";
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

export function HeatmapWithYearNav({
  username,
  initialWeeks,
  initialCurrentStreak,
  initialLongestStreak,
}: HeatmapWithYearNavProps) {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [weeks, setWeeks] = useState(initialWeeks);
  const [currentStreak, setCurrentStreak] = useState(initialCurrentStreak);
  const [longestStreak, setLongestStreak] = useState(initialLongestStreak);
  const [loading, setLoading] = useState(false);

  const fetchYear = useCallback(
    async (year: number) => {
      if (year === selectedYear && weeks.length > 0) return;
      if (year === currentYear && initialWeeks.length > 0) {
        setWeeks(initialWeeks);
        setCurrentStreak(initialCurrentStreak);
        setLongestStreak(initialLongestStreak);
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
        const streaks = computeStreaks(data.weeks);
        setCurrentStreak(streaks.current);
        setLongestStreak(streaks.longest);
      } catch {
        setWeeks([]);
        setCurrentStreak(0);
        setLongestStreak(0);
      } finally {
        setLoading(false);
      }
    },
    [username, selectedYear, weeks.length, initialWeeks, initialCurrentStreak, initialLongestStreak]
  );

  if (initialWeeks.length === 0 && weeks.length === 0) return null;

  return (
    <div style={{ marginTop: "44px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 16px 0" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: 0, letterSpacing: "-0.2px" }}>
          Contribution activity
        </h2>
        <div style={{ display: "flex", gap: "6px" }}>
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => fetchYear(year)}
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
              }}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

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
        {weeks.map((week, wi) => (
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
        {weeks.length === 0 && !loading && (
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
