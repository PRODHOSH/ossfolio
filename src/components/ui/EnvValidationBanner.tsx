"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/env";

export function EnvValidationBanner() {
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setTimeout(() => setConfigured(false), 0);
    }
  }, []);

  if (configured) return null;

  return (
    <div
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderBottom: "1px solid rgba(239, 68, 68, 0.2)",
        padding: "12px 20px",
        textAlign: "center",
        fontSize: "13px",
        color: "var(--color-ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      <span>⚠️</span>
      <span>
        <strong>Supabase Credentials Missing:</strong> Copy <code>.env.example</code> to <code>.env.local</code> and fill in your Supabase variables.
      </span>
      <a
        href="https://github.com/PRODHOSH/ossfolio/blob/main/CONTRIBUTING.md#local-setup"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#3ecf8e", fontWeight: 600, textDecoration: "underline" }}
      >
        Read setup guide
      </a>
    </div>
  );
}
