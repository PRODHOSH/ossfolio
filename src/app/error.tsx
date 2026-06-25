"use client";

/**
 * src/app/error.tsx
 *
 * Global error boundary for unhandled runtime errors. Catches exceptions
 * that bubble past page-level boundaries and renders a recovery UI.
 * Inline styles only, matching the DESIGN.md palette:
 *   canvas #ffffff | ink #171717 | ink-mute #707070 | primary #3ecf8e
 */

import type { CSSProperties } from "react";
import Link from "next/link";

const primaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "130px",
  padding: "10px 28px",
  borderRadius: "8px",
  backgroundColor: "#3ecf8e",
  color: "#171717",
  fontSize: "16px",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "28rem" }}>
        <p
          style={{
            fontSize: "72px",
            fontWeight: 700,
            lineHeight: 1,
            color: "#3ecf8e",
          }}
        >
          500
        </p>
        <h1
          style={{
            marginTop: "16px",
            fontSize: "24px",
            fontWeight: 600,
            color: "#171717",
          }}
        >
          Something went wrong
        </h1>
        <p style={{ marginTop: "12px", fontSize: "16px", color: "#707070" }}>
          An unexpected error occurred. You can try again or head back to the
          home page.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "28px",
          }}
        >
          <button onClick={reset} style={primaryButton}>
            Try again
          </button>
          <Link href="/" style={{...primaryButton, backgroundColor: "transparent", border: "1px solid #e2e2e2", color: "#171717", textDecoration: "none"}}>
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
