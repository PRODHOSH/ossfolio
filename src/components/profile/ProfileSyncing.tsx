"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Shown the first time a profile is viewed, while its snapshot is being built in
 * the background. The server has already kicked off the sync via `after()`; this
 * just re-renders the route until the snapshot lands, then unmounts itself when the
 * real profile takes its place.
 *
 * Polling stops after `MAX_ATTEMPTS` rather than spinning forever, so a profile that
 * can't be synced (GitHub down, a rate limit that outlasts the window) ends in an
 * honest "try again" rather than an endless spinner.
 */
const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 12; // ~30s

export function ProfileSyncing({ username }: { username: string }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  const gaveUp = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (gaveUp) return;

    const timer = setTimeout(() => {
      setAttempts((n) => n + 1);
      // Re-runs the server component. Once the snapshot exists, the profile renders
      // instead of this component.
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [attempts, gaveUp, router]);

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
          {!gaveUp && (
            <div
              aria-hidden="true"
              style={{
                width: "28px",
                height: "28px",
                margin: "0 auto 20px auto",
                borderRadius: "50%",
                border: "2px solid var(--color-hairline-strong)",
                borderTopColor: "var(--color-primary)",
                animation: "ossfolio-spin 0.8s linear infinite",
              }}
            />
          )}

          <h1 style={{ fontSize: "22px", fontWeight: 500, margin: "0 0 12px 0" }}>
            {gaveUp ? "Still working on it" : "Building this profile"}
          </h1>

          <p
            style={{ fontSize: "15px", color: "var(--color-ink-mute)", margin: 0 }}
            role="status"
            aria-live="polite"
          >
            {gaveUp ? (
              <>
                We haven&apos;t been able to finish fetching <strong>@{username}</strong> from
                GitHub yet. This usually means GitHub is rate-limiting us — please try again in
                a few minutes.
              </>
            ) : (
              <>
                We&apos;re fetching <strong>@{username}</strong>&apos;s data from GitHub for the
                first time. This page will update on its own in a moment.
              </>
            )}
          </p>

          {gaveUp && (
            <button
              type="button"
              onClick={() => {
                setAttempts(0);
                router.refresh();
              }}
              style={{
                marginTop: "20px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "8px",
                cursor: "pointer",
                color: "var(--color-on-primary)",
                backgroundColor: "var(--color-primary)",
                border: "1px solid var(--color-primary-deep)",
              }}
            >
              Try again
            </button>
          )}
        </div>
      </main>
      <Footer />

      <style>{`
        @keyframes ossfolio-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="ossfolio-spin"] { animation: none !important; }
        }
      `}</style>
    </>
  );
}
