"use client";

import { useState } from "react";
import { SCORE_WEIGHTS, STAR_CAP, getScoreBreakdown } from "@/lib/score";

export function ScoreCalculator() {
  const [commits, setCommits] = useState(10);
  const [prs, setPrs] = useState(2);
  const [issues, setIssues] = useState(2);
  const [reviews, setReviews] = useState(1);
  const [stars, setStars] = useState(5);

  const breakdown = getScoreBreakdown(
    {
      totalCommits: commits,
      totalPRs: prs,
      totalIssues: issues,
      totalReviews: reviews,
    },
    stars
  );

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "12px",
  };

  const labelStyle = {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--color-ink)",
    minWidth: "140px",
  };

  const inputStyle = {
    flex: 1,
    accentColor: "#3ecf8e",
    cursor: "pointer",
  };

  const valueStyle = {
    fontSize: "14px",
    fontWeight: 600,
    color: "#3ecf8e",
    minWidth: "40px",
    textAlign: "right" as const,
  };

  return (
    <div
      style={{
        marginTop: "32px",
        padding: "24px",
        border: "1px solid var(--color-hairline)",
        borderRadius: "12px",
        backgroundColor: "var(--color-canvas-soft)",
      }}
    >
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "16px" }}>
        Interactive Score Calculator
      </h3>

      <div style={rowStyle}>
        <span style={labelStyle}>Commits ({SCORE_WEIGHTS.COMMIT}x)</span>
        <input
          type="range"
          min="0"
          max="200"
          value={commits}
          onChange={(e) => setCommits(Number(e.target.value))}
          style={inputStyle}
        />
        <span style={valueStyle}>{commits}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>PRs ({SCORE_WEIGHTS.PR}x)</span>
        <input
          type="range"
          min="0"
          max="50"
          value={prs}
          onChange={(e) => setPrs(Number(e.target.value))}
          style={inputStyle}
        />
        <span style={valueStyle}>{prs}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Issues ({SCORE_WEIGHTS.ISSUE}x)</span>
        <input
          type="range"
          min="0"
          max="50"
          value={issues}
          onChange={(e) => setIssues(Number(e.target.value))}
          style={inputStyle}
        />
        <span style={valueStyle}>{issues}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Reviews ({SCORE_WEIGHTS.REVIEW}x)</span>
        <input
          type="range"
          min="0"
          max="50"
          value={reviews}
          onChange={(e) => setReviews(Number(e.target.value))}
          style={inputStyle}
        />
        <span style={valueStyle}>{reviews}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Stars ({SCORE_WEIGHTS.STAR}x, cap {STAR_CAP})</span>
        <input
          type="range"
          min="0"
          max="1000"
          value={stars}
          onChange={(e) => setStars(Number(e.target.value))}
          style={inputStyle}
        />
        <span style={valueStyle}>{stars}</span>
      </div>

      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid var(--color-hairline)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-ink)" }}>
          Simulated Score
        </span>
        <span style={{ fontSize: "28px", fontWeight: 700, color: "#3ecf8e" }}>
          {breakdown.total}
        </span>
      </div>
    </div>
  );
}
