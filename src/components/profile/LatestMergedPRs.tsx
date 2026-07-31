import { useState, useMemo } from "react";
import type { MergedPR } from "@/types";
import { StatusPill } from "@/components/ui/status-pill";

interface LatestMergedPRsProps {
  mergedPRs: MergedPR[];
}

export function LatestMergedPRs({ mergedPRs }: LatestMergedPRsProps) {
  const [filter, setFilter] = useState<"merged" | "open" | "closed">("merged");

  const filteredPRs = useMemo(() => {
    return (mergedPRs || []).filter((pr) => {
      const state = pr.state || "merged";
      return state === filter;
    });
  }, [mergedPRs, filter]);

  const selectStyle: React.CSSProperties = {
    fontSize: "12px",
    padding: "4px 8px",
    border: "1px solid var(--color-hairline)",
    borderRadius: "6px",
    backgroundColor: "var(--color-canvas-soft)",
    color: "var(--color-ink)",
    cursor: "pointer",
    outline: "none",
  };

  const getLabelText = (
    state: "merged" | "open" | "closed",
    dateStr: string,
  ) => {
    const formattedDate = new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (state === "open") {
      return `opened on ${formattedDate}`;
    }
    if (state === "closed") {
      return `closed on ${formattedDate}`;
    }
    return `merged on ${formattedDate}`;
  };

  return (
    <section style={{ marginTop: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-ink)",
            margin: 0,
          }}
        >
          Latest Pull Requests
        </h2>
        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as "merged" | "open" | "closed")
          }
          style={selectStyle}
          aria-label="Filter pull requests by status"
        >
          <option value="merged">Merged</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {filteredPRs.length === 0 ? (
        <div
          style={{
            padding: "16px",
            border: "1px solid var(--color-hairline)",
            borderRadius: "6px",
            color: "var(--color-ink-mute)",
            fontSize: "13px",
            backgroundColor: "var(--color-canvas-soft)",
          }}
        >
          No {filter} pull requests found.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {filteredPRs.map((pr) => (
            <li key={pr.url} style={{ marginBottom: "12px" }}>
              <a
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textDecoration: "none",
                  color: "var(--color-ink)",
                  backgroundColor: "var(--color-canvas-soft)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-hairline-strong)",
                  transition: "background-color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-hairline)";
                  e.currentTarget.style.borderColor = "var(--color-ink)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-canvas-soft)";
                  e.currentTarget.style.borderColor =
                    "var(--color-hairline-strong)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 500 }}>
                    {pr.title}
                  </span>
                  <StatusPill variant={pr.state || "merged"} size="micro">
                    {pr.state || "merged"}
                  </StatusPill>
                </div>
                <span
                  style={{ fontSize: "13px", color: "var(--color-ink-mute)" }}
                >
                  {pr.repoName} •{" "}
                  {getLabelText(pr.state || "merged", pr.mergedAt)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
