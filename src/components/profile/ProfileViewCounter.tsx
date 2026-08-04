"use client";

import { useEffect, useState, useRef } from "react";

interface ProfileViewCounterProps {
  username: string;
  initialViewCount?: number;
}

export function ProfileViewCounter({
  username,
  initialViewCount = 0,
}: ProfileViewCounterProps) {
  const [viewCount, setViewCount] = useState<number>(initialViewCount);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!username || hasTracked.current) return;
    hasTracked.current = true;

    async function recordView() {
      try {
        const res = await fetch(
          `/api/${encodeURIComponent(username)}/view`,
          { method: "POST" },
        );
        if (res.ok) {
          const json = await res.json();
          if (typeof json.viewCount === "number" && json.viewCount > 0) {
            setViewCount(json.viewCount);
          }
        }
      } catch (err) {
        console.error("Failed to record profile view:", err);
      }
    }

    recordView();
  }, [username]);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 500,
        color: "var(--color-ink-mute)",
        backgroundColor: "var(--color-canvas-soft)",
        border: "1px solid var(--color-hairline)",
      }}
      title={`This profile has been viewed ${viewCount.toLocaleString("en-US")} times`}
    >
      <span aria-hidden="true">👁️</span>
      <span>{viewCount.toLocaleString("en-US")} views</span>
    </span>
  );
}
