"use client";

import { useEffect, useState } from "react";
import type { GistItem } from "@/types";
import { LANG_COLORS } from "@/lib/languages";

interface GistListProps {
  username: string;
}

export function GistList({ username }: GistListProps) {
  const [gists, setGists] = useState<GistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    async function loadGists() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/${encodeURIComponent(username)}/gists`);
        if (res.ok) {
          const json = await res.json();
          setGists(json.gists || []);
        }
      } catch (err) {
        console.error("Failed to load user gists:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadGists();
  }, [username]);

  if (!isLoading && gists.length === 0) return null;

  return (
    <div style={{ marginTop: "36px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-ink)",
            margin: 0,
            letterSpacing: "-0.2px",
          }}
        >
          Public Gists & Snippets
        </h3>
        <span style={{ fontSize: "12px", color: "var(--color-ink-mute)" }}>
          {gists.length} public {gists.length === 1 ? "snippet" : "snippets"}
        </span>
      </div>

      {isLoading && (
        <div style={{ fontSize: "13px", color: "var(--color-ink-mute)", padding: "12px 0" }}>
          Loading public gists...
        </div>
      )}

      {!isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "12px",
          }}
        >
          {gists.map((gist) => {
            const lang = gist.primaryFile?.language;
            const langColor = (lang && LANG_COLORS[lang]) || "var(--color-ink-mute)";

            return (
              <div
                key={gist.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "14px",
                  borderRadius: "12px",
                  backgroundColor: "var(--color-canvas-soft)",
                  border: "1px solid var(--color-hairline)",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        fontFamily: "ui-monospace, Menlo, Monaco, monospace",
                      }}
                    >
                      {gist.primaryFile?.filename || "snippet"}
                    </span>

                    {lang && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          color: "var(--color-ink-mute)",
                          fontWeight: 500,
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: langColor,
                          }}
                        />
                        {lang}
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--color-ink-mute)",
                      lineHeight: 1.4,
                      margin: "0 0 12px 0",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {gist.description || "No description provided."}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "var(--color-ink-mute)",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--color-hairline)",
                    marginTop: "auto",
                  }}
                >
                  <span>
                    📄 {gist.filesCount} file{gist.filesCount === 1 ? "" : "s"} · 💬 {gist.commentsCount}
                  </span>

                  <a
                    href={gist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-primary)",
                      textDecoration: "none",
                    }}
                  >
                    View Gist ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
