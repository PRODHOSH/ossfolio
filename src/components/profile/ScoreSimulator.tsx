"use client";

import { useState } from "react";
import { SCORE_WEIGHTS, STAR_CAP, getScoreBreakdown } from "@/lib/score";

export function ScoreSimulator() {
  const [commits, setCommits] = useState(25);
  const [prs, setPrs] = useState(8);
  const [issues, setIssues] = useState(12);
  const [reviews, setReviews] = useState(5);
  const [stars, setStars] = useState(150);

  const breakdown = getScoreBreakdown(
    {
      totalCommits: commits,
      totalPRs: prs,
      totalIssues: issues,
      totalReviews: reviews,
    },
    stars
  );

  return (
    <div
      style={{
        border: "1px solid var(--color-hairline)",
        borderRadius: "12px",
        padding: "28px",
        backgroundColor: "var(--color-canvas)",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <div>
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--color-ink)", margin: "0 0 8px 0" }}>
          Interactive Score Simulator & Breakdown
        </h2>
        <p style={{ fontSize: "14px", color: "var(--color-ink-mute)", margin: 0 }}>
          Adjust the sliders below to see how each contribution type contributes to the overall profile score.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
              <span>Commits ({SCORE_WEIGHTS.COMMIT} pt each)</span>
              <span style={{ fontWeight: 600 }}>{commits}</span>
            </label>
            <input
              type="range"
              min="0"
              max="500"
              value={commits}
              onChange={(e) => setCommits(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#3ecf8e" }}
            />
          </div>

          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
              <span>PRs ({SCORE_WEIGHTS.PR} pts each)</span>
              <span style={{ fontWeight: 600 }}>{prs}</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={prs}
              onChange={(e) => setPrs(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#3ecf8e" }}
            />
          </div>

          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
              <span>Issues ({SCORE_WEIGHTS.ISSUE} pts each)</span>
              <span style={{ fontWeight: 600 }}>{issues}</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={issues}
              onChange={(e) => setIssues(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#3ecf8e" }}
            />
          </div>

          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
              <span>Code Reviews ({SCORE_WEIGHTS.REVIEW} pts each)</span>
              <span style={{ fontWeight: 600 }}>{reviews}</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={reviews}
              onChange={(e) => setReviews(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#3ecf8e" }}
            />
          </div>

          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
              <span>Stars ({SCORE_WEIGHTS.STAR} pts each, capped at {STAR_CAP})</span>
              <span style={{ fontWeight: 600 }}>{stars}</span>
            </label>
            <input
              type="range"
              min="0"
              max="2000"
              value={stars}
              onChange={(e) => setStars(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#3ecf8e" }}
            />
          </div>
        </div>

        <div
          style={{
            borderLeft: "1px solid var(--color-hairline)",
            paddingLeft: "32px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "16px" }}>
              Score Breakdown Contribution
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              <li style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--color-ink-mute)" }}>Commits Contribution</span>
                <span style={{ fontWeight: 500 }}>+{breakdown.commitsContribution} pts</span>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--color-ink-mute)" }}>PRs Contribution</span>
                <span style={{ fontWeight: 500 }}>+{breakdown.prsContribution} pts</span>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--color-ink-mute)" }}>Issues Contribution</span>
                <span style={{ fontWeight: 500 }}>+{breakdown.issuesContribution} pts</span>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--color-ink-mute)" }}>Reviews Contribution</span>
                <span style={{ fontWeight: 500 }}>+{breakdown.reviewsContribution} pts</span>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--color-ink-mute)" }}>Stars Contribution {stars > STAR_CAP && "(capped)"}</span>
                <span style={{ fontWeight: 500 }}>+{breakdown.starsContribution.toFixed(1)} pts</span>
              </li>
            </ul>
          </div>

          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--color-hairline)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)" }}>Total Score</span>
              <span style={{ fontSize: "36px", fontWeight: 700, color: "#3ecf8e" }}>{breakdown.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
