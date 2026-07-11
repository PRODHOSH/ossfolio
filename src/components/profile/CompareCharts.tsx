"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface CompareChartsProps {
  userA: {
    username: string;
    commits: number;
    prs: number;
    issues: number;
    reviews: number;
    score: number;
  };
  userB: {
    username: string;
    commits: number;
    prs: number;
    issues: number;
    reviews: number;
    score: number;
  };
}

export function CompareCharts({ userA, userB }: CompareChartsProps) {
  const data = [
    {
      name: "Commits",
      [userA.username]: userA.commits,
      [userB.username]: userB.commits,
    },
    {
      name: "PRs",
      [userA.username]: userA.prs,
      [userB.username]: userB.prs,
    },
    {
      name: "Issues",
      [userA.username]: userA.issues,
      [userB.username]: userB.issues,
    },
    {
      name: "Reviews",
      [userA.username]: userA.reviews,
      [userB.username]: userB.reviews,
    },
  ];

  return (
    <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "24px", backgroundColor: "var(--color-canvas-soft)" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "20px" }}>
          Metric Breakdown Comparison
        </h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="var(--color-ink-mute)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--color-ink-mute)" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-canvas)",
                  borderColor: "var(--color-hairline)",
                  borderRadius: "8px",
                  color: "var(--color-ink)",
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey={userA.username} fill="#3ecf8e" radius={[4, 4, 0, 0]} />
              <Bar dataKey={userB.username} fill="#6b01c2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "24px", backgroundColor: "var(--color-canvas-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: "0 0 6px 0" }}>
            Score Delta Analysis
          </h3>
          <p style={{ fontSize: "14px", color: "var(--color-ink-mute)", margin: 0 }}>
            {userA.username} ({userA.score} pts) vs {userB.username} ({userB.score} pts)
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "24px", fontWeight: 700, color: userA.score >= userB.score ? "#3ecf8e" : "#6b01c2" }}>
            {userA.score >= userB.score
              ? `+${(((userA.score - userB.score) / (userB.score || 1)) * 100).toFixed(0)}%`
              : `+${(((userB.score - userA.score) / (userA.score || 1)) * 100).toFixed(0)}%`}
          </span>
          <p style={{ fontSize: "11px", color: "var(--color-ink-mute-2)", margin: "2px 0 0 0" }}>
            relative margin of lead
          </p>
        </div>
      </div>
    </div>
  );
}
