"use client";

import Image from "next/image";
import type { Org } from "@/types";

interface OrganizationSectionProps {
  orgs: Org[];
}

export function OrganizationSection({ orgs }: OrganizationSectionProps) {
  if (!orgs || orgs.length === 0) return null;

  return (
    <div style={{ marginTop: "44px" }}>
      <h2
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--color-ink)",
          margin: "0 0 16px 0",
          letterSpacing: "-0.2px",
        }}
      >
        Organizations
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {orgs.map((org) => {
          const hasStats =
            org.stats &&
            ((org.stats.prsCount && org.stats.prsCount > 0) ||
              (org.stats.issuesCount && org.stats.issuesCount > 0));

          if (hasStats) {
            return (
              <a
                key={org.login}
                href={org.url}
                target="_blank"
                rel="noopener noreferrer"
                title={org.name ?? org.login}
                aria-label={`Organization ${org.name ?? org.login} (opens in a new tab)`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "6px 12px 6px 8px",
                  borderRadius: "10px",
                  backgroundColor: "var(--color-canvas-soft)",
                  border: "1px solid var(--color-hairline)",
                  textDecoration: "none",
                  transition: "border-color 0.15s, transform 0.15s",
                }}
              >
                <Image
                  src={org.avatarUrl}
                  alt={org.login}
                  width={28}
                  height={28}
                  style={{ borderRadius: "6px", display: "block" }}
                />

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--color-ink)",
                      lineHeight: 1.2,
                    }}
                  >
                    {org.name || org.login}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      color: "var(--color-ink-mute)",
                      marginTop: "2px",
                    }}
                  >
                    {org.stats?.prsCount && (
                      <span>🔀 {org.stats.prsCount} PR{org.stats.prsCount === 1 ? "" : "s"}</span>
                    )}
                    {org.stats?.prsCount && org.stats?.issuesCount ? <span>·</span> : null}
                    {org.stats?.issuesCount && (
                      <span>🐛 {org.stats.issuesCount} Issue{org.stats.issuesCount === 1 ? "" : "s"}</span>
                    )}
                  </div>
                </div>
              </a>
            );
          }

          return (
            <a
              key={org.login}
              href={org.url}
              target="_blank"
              rel="noopener noreferrer"
              title={org.name ?? org.login}
              aria-label={`Organization ${org.name ?? org.login} (opens in a new tab)`}
              style={{
                display: "inline-flex",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid var(--color-hairline)",
                transition: "border-color 0.15s",
              }}
            >
              <Image
                src={org.avatarUrl}
                alt={org.login}
                width={36}
                height={36}
                style={{ display: "block" }}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
