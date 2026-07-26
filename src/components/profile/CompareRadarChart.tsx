"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from "recharts";
import { buildRadarData, isRadarEmpty, type RadarMetricInput } from "@/lib/radar-metrics";

interface CompareRadarChartProps {
  userA: RadarMetricInput;
  userB: RadarMetricInput;
}

/**
 * Palette per DESIGN.md: a single emerald primary is the only chromatic event,
 * everything else stays on the monochrome grey ladder. Contributor A takes the
 * emerald, contributor B the ink-mute grey.
 *
 * Referenced as design tokens rather than literal hex so the chart follows the
 * theme: `--color-ink-mute` resolves to #707070 in light mode and #a3a3a3 in
 * dark, where the lighter grey is what stays legible. The existing recharts
 * usage in CompareCharts.tsx already passes `var(--color-*)` into SVG stroke
 * props, so this follows a pattern the codebase has proven works.
 */
const COLOR_A = "var(--color-primary)";
const COLOR_B = "var(--color-ink-mute)";

interface TooltipPayloadEntry {
  payload?: {
    metric?: string;
    aRaw?: number;
    bRaw?: number;
  };
}

interface RadarTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  usernameA: string;
  usernameB: string;
}

/**
 * Reports the raw metric values rather than the normalised percentages the
 * chart plots. The normalisation exists to make the shape readable; a reader
 * hovering an axis wants the real number.
 */
export const RadarTooltip = ({
  active,
  payload,
  usernameA,
  usernameB,
}: RadarTooltipProps) => {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "var(--color-ink)",
  };

  const swatch = (color: string): React.CSSProperties => ({
    width: "8px",
    height: "8px",
    borderRadius: "2px",
    backgroundColor: color,
    flexShrink: 0,
  });

  return (
    <div
      style={{
        backgroundColor: "var(--color-canvas)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "8px",
        padding: "10px 12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--color-ink)",
          margin: "0 0 6px 0",
        }}
      >
        {point.metric}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={rowStyle}>
          <span style={swatch(COLOR_A)} />
          <span>
            {usernameA}: <strong>{(point.aRaw ?? 0).toLocaleString("en-US")}</strong>
          </span>
        </div>
        <div style={rowStyle}>
          <span style={swatch(COLOR_B)} />
          <span>
            {usernameB}: <strong>{(point.bRaw ?? 0).toLocaleString("en-US")}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Multi-axis comparison of two contributors.
 *
 * A bar chart ranks each metric independently; a radar makes the overall shape
 * legible, so a reviewer-heavy contributor and a commit-heavy one produce
 * visibly different polygons rather than two similar-looking bar groups.
 */
export function CompareRadarChart({ userA, userB }: CompareRadarChartProps) {
  const data = buildRadarData(userA, userB);
  const empty = isRadarEmpty(data);

  return (
    <div
      style={{
        border: "1px solid var(--color-hairline)",
        borderRadius: "12px",
        padding: "24px",
        backgroundColor: "var(--color-canvas-soft)",
      }}
    >
      <h3
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--color-ink)",
          margin: "0 0 4px 0",
        }}
      >
        Contribution Profile Shape
      </h3>
      <p
        style={{
          fontSize: "13px",
          color: "var(--color-ink-mute)",
          margin: "0 0 20px 0",
        }}
      >
        Each axis is scaled against the higher of the two contributors, so the
        leader on a metric reaches the edge. Hover any axis for raw totals.
      </p>

      {empty ? (
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-ink-mute)",
            textAlign: "center",
            padding: "48px 0",
            margin: 0,
          }}
        >
          No contribution data available to compare.
        </p>
      ) : (
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="72%">
              <PolarGrid stroke="var(--color-hairline)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: "var(--color-ink-mute)", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Tooltip
                content={
                  <RadarTooltip
                    usernameA={userA.username}
                    usernameB={userB.username}
                  />
                }
              />
              <Legend verticalAlign="bottom" height={32} />
              <Radar
                name={userA.username}
                dataKey="a"
                stroke={COLOR_A}
                fill={COLOR_A}
                fillOpacity={0.28}
              />
              <Radar
                name={userB.username}
                dataKey="b"
                stroke={COLOR_B}
                fill={COLOR_B}
                fillOpacity={0.18}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p
        style={{
          fontSize: "11px",
          color: "var(--color-ink-mute-2)",
          margin: "12px 0 0 0",
        }}
      >
        Repo Stars counts stargazers across each contributor&apos;s top
        repositories, measured identically for both.
      </p>
    </div>
  );
}
