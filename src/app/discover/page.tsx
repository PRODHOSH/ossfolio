import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DiscoverContent } from "./content";

export const metadata: Metadata = {
  title: "Discover Contributors",
  description:
    "Search and discover open-source contributors by username, programming language, or contribution score. Find developers making an impact across GitHub.",
  openGraph: {
    title: "Discover Contributors - OSSfolio",
    description: "Find and connect with top open-source contributors on OSSfolio.",
  },
};

export default function DiscoverPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" style={{ backgroundColor: "var(--color-canvas)", color: "var(--color-ink)", minHeight: "100vh", transition: "background-color 0.2s ease, color 0.2s ease" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "56px 20px" }}>
          <header style={{ marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 500,
                color: "var(--color-ink)",
                letterSpacing: "-0.42px",
                margin: 0,
              }}
            >
              Discover Contributors
            </h1>
            <p style={{ fontSize: "15px", color: "var(--color-ink-mute)", margin: "8px 0 0 0" }}>
              Search profiles by name, username, or language. Filter by score and sort by what matters
              to you.
            </p>
          </header>
          <Suspense fallback={<DiscoverSkeleton />}>
            {/* DiscoverContent houses DiscoverPagination which uses Framer Motion layout animations */}
            <DiscoverContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

function DiscoverSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ height: "48px", borderRadius: "8px", backgroundColor: "var(--color-hairline-cool)" }} />
      <div style={{ height: "40px", borderRadius: "6px", backgroundColor: "var(--color-hairline-cool)", width: "60%" }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
          marginTop: "8px",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: "180px",
              borderRadius: "12px",
              backgroundColor: "var(--color-canvas-soft)",
              border: "1px solid var(--color-hairline)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
