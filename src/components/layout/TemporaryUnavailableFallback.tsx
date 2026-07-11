import type { ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function TemporaryUnavailableFallback({
  heading,
  message,
}: {
  heading: ReactNode;
  message: ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main
        style={{
          backgroundColor: "var(--color-canvas)",
          color: "var(--color-ink)",
          minHeight: "100vh",
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
      >
        <div
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            padding: "96px 20px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "22px", fontWeight: 500, margin: "0 0 12px 0" }}>
            {heading}
          </h1>
          <p style={{ fontSize: "15px", color: "var(--color-ink-mute)", margin: 0 }}>{message}</p>
        </div>
      </main>
      <Footer />
    </>
  );
}

