"use client";

import { useState, useCallback, memo, useMemo, useEffect, useRef } from "react";
import type { HeatmapWeek } from "@/types";
import { computeStreaks } from "@/lib/mock";

interface HeatmapWithYearNavProps {
  username: string;
  initialWeeks: HeatmapWeek[];
  initialCurrentStreak: number;
  initialLongestStreak: number;
}

export type HeatmapTheme = "emerald" | "violet" | "amber" | "neon" | "ocean";

export interface HeatmapThemeDefinition {
  id: HeatmapTheme;
  name: string;
  shades: [string, string, string, string, string];
}

export const HEATMAP_THEMES: Record<HeatmapTheme, HeatmapThemeDefinition> = {
  emerald: {
    id: "emerald",
    name: "Classic Emerald",
    shades: ["rgba(128, 128, 128, 0.1)", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  },
  violet: {
    id: "violet",
    name: "Electric Violet",
    shades: ["rgba(128, 128, 128, 0.1)", "#c7d2fe", "#a5b4fc", "#6366f1", "#4338ca"],
  },
  amber: {
    id: "amber",
    name: "Solar Amber",
    shades: ["rgba(128, 128, 128, 0.1)", "#fef3c7", "#fcd34d", "#f59e0b", "#b45309"],
  },
  neon: {
    id: "neon",
    name: "Cyberpunk Neon",
    shades: ["rgba(128, 128, 128, 0.1)", "#67e8f9", "#06b6d4", "#f43f5e", "#d946ef"],
  },
  ocean: {
    id: "ocean",
    name: "Ocean Breeze",
    shades: ["rgba(128, 128, 128, 0.1)", "#99f6e4", "#2dd4bf", "#0ea5e9", "#0369a1"],
  },
};

export function getShadeForCount(
  count: number,
  theme: HeatmapTheme = "emerald",
): string {
  const shades = HEATMAP_THEMES[theme]?.shades || HEATMAP_THEMES.emerald.shades;
  if (count === 0) return shades[0];
  if (count < 3) return shades[1];
  if (count < 6) return shades[2];
  if (count < 9) return shades[3];
  return shades[4];
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
        color: selectedYear === year ? "#171717" : "var(--color-nav-mute)",
        backgroundColor:
          selectedYear === year ? "#3ecf8e" : "var(--color-canvas-soft)",
        border:
          selectedYear === year ? "none" : "1px solid var(--color-hairline)",
        borderRadius: "9999px",
        cursor: loading ? "wait" : "pointer",
        transition: "background-color 0.15s, color 0.15s",
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
  viewMode: "365" | "calendar",
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
  const [selectedTheme, setSelectedTheme] = useState<HeatmapTheme>("emerald");
  const [showCustomizer, setShowCustomizer] = useState(false);
  const customizerRef = useRef<HTMLDivElement>(null);

  // Load saved theme preference from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("heatmap_theme") as HeatmapTheme | null;
      if (savedTheme && HEATMAP_THEMES[savedTheme]) {
        setSelectedTheme(savedTheme);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSelectTheme = (theme: HeatmapTheme) => {
    setSelectedTheme(theme);
    try {
      localStorage.setItem("heatmap_theme", theme);
    } catch {
      // Ignore storage errors
    }
  };

  // Close customizer popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customizerRef.current && !customizerRef.current.contains(e.target as Node)) {
        setShowCustomizer(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchYear = useCallback(
    async (year: number) => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("heatmap_selected_year", String(year));
        }
      } catch {
        // Ignore storage errors
      }
      if (year === selectedYear && weeks.length > 0) return;
      if (year === currentYear && initialWeeks.length > 0) {
        setWeeks(initialWeeks);
        setSelectedYear(year);
        return;
      }

      setLoading(true);
      setSelectedYear(year);
      try {
        const res = await fetch(
          `/api/${encodeURIComponent(username)}/contributions?year=${year}`,
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setWeeks(data.weeks);
      } catch {
        setWeeks([]);
      } finally {
        setLoading(false);
      }
    },
    [username, selectedYear, weeks.length, initialWeeks],
  );

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      const savedYearStr = localStorage.getItem("heatmap_selected_year");
      if (savedYearStr) {
        const savedYear = parseInt(savedYearStr, 10);
        if (years.includes(savedYear) && savedYear !== currentYear) {
          fetchYear(savedYear);
        }
      }
    } catch {
      // Ignore errors
    }
  }, [fetchYear]);

  const displayedWeeks = useMemo(() => {
    return getFilteredWeeks(
      weeks,
      selectedYear,
      selectedYear === currentYear ? viewMode : "calendar",
    );
  }, [weeks, selectedYear, viewMode]);

  const { currentStreak, longestStreak } = useMemo(() => {
    const streaks = computeStreaks(displayedWeeks);
    return {
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
    };
  }, [displayedWeeks]);

  if (initialWeeks.length === 0 && weeks.length === 0) return null;

  const currentShades = HEATMAP_THEMES[selectedTheme].shades;

  return (
    <div style={{ marginTop: "44px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "0 0 16px 0",
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
          Contribution activity
        </h2>
        <div
          style={{
            display: "flex",
            gap: "6px",
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

        <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
          {/* Customization Gear / Palette Button */}
          <div ref={customizerRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowCustomizer((prev) => !prev)}
              aria-label="Customize Heatmap Theme"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--color-ink)",
                backgroundColor: "var(--color-canvas-soft)",
                border: "1px solid var(--color-hairline)",
                borderRadius: "20px",
                cursor: "pointer",
              }}
            >
              <span>🎨</span> Customize
            </button>

            {/* Customization Settings Dropdown Menu */}
            {showCustomizer && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  zIndex: 50,
                  width: "240px",
                  backgroundColor: "var(--color-canvas)",
                  border: "1px solid var(--color-hairline-strong)",
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    marginBottom: "10px",
                  }}
                >
                  Color Scheme
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {(Object.keys(HEATMAP_THEMES) as HeatmapTheme[]).map((themeKey) => {
                    const themeDef = HEATMAP_THEMES[themeKey];
                    const isSelected = selectedTheme === themeKey;

                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => handleSelectTheme(themeKey)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: `1px solid ${
                            isSelected ? "var(--color-primary)" : "transparent"
                          }`,
                          backgroundColor: isSelected
                            ? "var(--color-canvas-soft)"
                            : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: isSelected ? 600 : 400,
                            color: "var(--color-ink)",
                          }}
                        >
                          {themeDef.name}
                        </span>

                        <div style={{ display: "flex", gap: "3px" }}>
                          {themeDef.shades.slice(1).map((s, idx) => (
                            <span
                              key={idx}
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "2px",
                                backgroundColor: s,
                              }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
                  color:
                    viewMode === "calendar" ? "#171717" : "var(--color-ink-mute)",
                  backgroundColor:
                    viewMode === "calendar" ? "#3ecf8e" : "transparent",
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
          <div
            key={wi}
            style={{ display: "flex", flexDirection: "column", gap: "3px" }}
          >
            {week.days.map((day, di) => {
              const bgShade = day.isPlaceholder
                ? "transparent"
                : getShadeForCount(day.count, selectedTheme);

              return (
                <div
                  key={di}
                  title={
                    day.isPlaceholder
                      ? undefined
                      : `${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`
                  }
                  style={{
                    width: "11px",
                    height: "11px",
                    borderRadius: "2px",
                    backgroundColor: bgShade,
                    flexShrink: 0,
                    pointerEvents: day.isPlaceholder ? "none" : "auto",
                  }}
                />
              );
            })}
          </div>
        ))}
        {displayedWeeks.length === 0 && !loading && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-ink-mute)",
              margin: "12px auto",
            }}
          >
            No contribution data available for {selectedYear}.
          </p>
        )}
      </div>

      {/* Footer Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "4px",
          margin: "10px 0 0 0",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "var(--color-ink-mute)",
            marginRight: "2px",
          }}
        >
          Less
        </span>
        {currentShades.map((shade) => (
          <span
            key={shade}
            aria-hidden="true"
            style={{
              width: "11px",
              height: "11px",
              borderRadius: "2px",
              backgroundColor: shade,
              flexShrink: 0,
            }}
          />
        ))}
        <span
          style={{
            fontSize: "12px",
            color: "var(--color-ink-mute)",
            marginLeft: "2px",
          }}
        >
          More
        </span>
      </div>
      <p
        style={{
          fontSize: "12px",
          color: "var(--color-ink-mute)",
          margin: "10px 0 0 0",
        }}
      >
        This chart shows an estimate of contribution activity. Exact daily
        counts are not available for public profiles.
      </p>
    </div>
  );
}

export const HeatmapWithYearNav = memo(HeatmapWithYearNavInner);
