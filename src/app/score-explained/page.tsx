import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScoreSimulator } from "@/components/profile/ScoreSimulator";

export const metadata: Metadata = {
  title: "How Your Score Is Calculated",
  description:
    "A plain-language breakdown of the OSSfolio contributor score: the activities it counts, the points each one is worth, what it measures, and what it does not. Use the interactive calculator to estimate your score.",
  openGraph: {
    title: "How Your Score Is Calculated - OSSfolio",
    description:
      "A plain-language breakdown of the OSSfolio contributor score: the activities it counts, the points each one is worth, what it measures, and what it does not. Use the interactive calculator to estimate your score.",
  },
};

// Mirrors the weights in src/lib/score.ts so the page reads from the same source
// of truth that the leaderboard and profile cards use. If the formula in
// score.ts ever changes, update this table to match.
const SCORE_ROWS: { activity: string; points: string; note: string }[] = [
  { activity: "Commit", points: "1 pt", note: "Each commit you author" },
  { activity: "Pull Request", points: "3 pts", note: "Each PR you open" },
  { activity: "Issue", points: "2 pts", note: "Each issue you open" },
  { activity: "Code Review", points: "2 pts", note: "Each review you leave" },
  {
    activity: "Star earned",
    points: "0.1 pt",
    note: "Per star on your repos, capped at 1,000 stars",
  },
];

export default function ScoreExplainedPage() {
  const sectionTitleStyle = {
    fontSize: "18px",
    fontWeight: 500,
    color: "var(--color-ink)",
    margin: "0 0 8px 0",
  };
  const paragraphStyle = {
    fontSize: "15px",
    lineHeight: 1.55,
    color: "var(--color-ink-mute)",
    margin: "0 0 12px 0",
  };
  const cellBase = {
    padding: "12px 16px",
    borderBottom: "1px solid var(--color-hairline)",
    textAlign: "left" as const,
  };

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "var(--color-canvas)", color: "var(--color-ink)", minHeight: "100vh", transition: "background-color 0.2s ease, color 0.2s ease" }}>
        <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "56px 20px" }}>
          {/* Header */}
          <header style={{ marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 600,
                color: "var(--color-ink)",
                letterSpacing: "-0.42px",
                margin: 0,
              }}
            >
              How your score is calculated
            </h1>
            <p style={{ fontSize: "15px", color: "var(--color-ink-mute)", margin: "8px 0 0 0", lineHeight: 1.55 }}>
              Your contributor score is a single number that sums up your open-source
              activity. It is built from public GitHub data using the simple, fixed
              formula below - no hidden weighting, no manual adjustments.
            </p>
          </header>

          {/* Formula table */}
          <section style={{ marginBottom: "40px" }}>
            <h2 style={sectionTitleStyle}>The formula</h2>
            <p style={paragraphStyle}>
              Every activity is worth a fixed number of points. Your total is the sum
              of all of them, rounded to the nearest whole number.
            </p>
            <div
              style={{
                border: "1px solid var(--color-hairline)",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "var(--color-canvas-soft)"
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...cellBase, color: "var(--color-ink-mute-2)", fontWeight: 500 }}>
                      Activity
                    </th>
                    <th
                      style={{
                        ...cellBase,
                        color: "var(--color-ink-mute-2)",
                        fontWeight: 500,
                        width: "90px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Points
                    </th>
                    <th
                      style={{
                        ...cellBase,
                        color: "var(--color-ink-mute-2)",
                        fontWeight: 500,
                      }}
                    >
                      What counts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SCORE_ROWS.map((row, i) => {
                    const isLast = i === SCORE_ROWS.length - 1;
                    const rowCell = isLast
                      ? { ...cellBase, borderBottom: "none" }
                      : cellBase;
                    return (
                      <tr key={row.activity}>
                        <td style={{ ...rowCell, color: "var(--color-ink)", fontWeight: 500 }}>
                          {row.activity}
                        </td>
                        <td
                          style={{
                            ...rowCell,
                            color: "var(--color-primary)",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.points}
                        </td>
                        <td style={{ ...rowCell, color: "var(--color-ink-mute)" }}>{row.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "13px", color: "var(--color-ink-mute-2)", margin: "12px 0 0 0" }}>
              Example: 40 commits, 10 PRs, 6 issues, 4 reviews, and 300 stars works out
              to 40 + 30 + 12 + 8 + 30 = 120 points.
            </p>

            {/* Score Simulator Component */}
            <ScoreSimulator />
          </section>

          {/* What it measures */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={sectionTitleStyle}>What the score measures</h2>
            <p style={paragraphStyle}>
              The score rewards consistent, varied participation. Opening pull requests
              and issues counts for more than raw commits because they usually represent
              more complete units of work, and reviews count because helping other people
              ship is real contribution too. Stars add a small amount so that widely-used
              work is recognised, but they are capped so a single popular repo cannot
              dominate your number.
            </p>
          </section>

          {/* What it does not measure */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={sectionTitleStyle}>What it does not measure</h2>
            <p style={paragraphStyle}>
              It is not a measure of code quality, seniority, or how important any single
              contribution was. A large refactor and a one-line fix both count as one
              commit. Private contributions are not included, because the score is built
              only from public GitHub activity. Think of it as a rough signal of activity
              over time, not a ranking of skill.
            </p>
          </section>

          {/* How it will evolve */}
          <section style={{ marginBottom: "40px" }}>
            <h2 style={sectionTitleStyle}>How it will evolve</h2>
            <p style={paragraphStyle}>
              This formula is intentionally simple while OSSfolio is early. As the
              project grows the weights may be tuned, and signals like review depth or
              recency could be added so the score better reflects sustained
              contribution. Any change to how scores are calculated will be reflected
              on this page.
            </p>
          </section>

          {/* Back link */}
          <p style={{ margin: 0 }}>
            <Link
              href="/explore"
              style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-ink)", textDecoration: "underline" }}
            >
              View the leaderboard
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

