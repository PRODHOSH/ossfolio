"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { SimilarProfile } from "@/lib/db";
import { LANG_COLORS } from "@/lib/languages";

interface SimilarProfilesProps {
  username: string;
  currentUserScore: number;
}

// ─── Skeleton placeholder card ────────────────────────────────────────────────
function SimilarProfileSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid var(--color-hairline)",
        backgroundColor: "var(--color-canvas-soft)",
        minWidth: "180px",
        flex: "0 0 auto",
      }}
      aria-hidden="true"
    >
      {/* Avatar skeleton */}
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "var(--color-hairline)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      {/* Name skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          style={{
            height: "14px",
            width: "80%",
            borderRadius: "6px",
            backgroundColor: "var(--color-hairline)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: "11px",
            width: "55%",
            borderRadius: "6px",
            backgroundColor: "var(--color-hairline)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      {/* Tags skeleton */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {[50, 40, 55].map((w) => (
          <div
            key={w}
            style={{
              height: "18px",
              width: `${w}px`,
              borderRadius: "99px",
              backgroundColor: "var(--color-hairline)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Individual profile card ───────────────────────────────────────────────────
function SimilarProfileCard({
  profile,
  index,
}: {
  profile: SimilarProfile;
  index: number;
}) {
  const displayName = profile.name || profile.username;
  const displayLanguages = (profile.top_languages ?? []).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
    >
      <Link
        href={`/${profile.username}`}
        style={{ textDecoration: "none", display: "block" }}
        aria-label={`View ${displayName}'s profile`}
      >
        <div
          className="similar-profile-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--color-hairline)",
            backgroundColor: "var(--color-canvas-soft)",
            minWidth: "180px",
            maxWidth: "220px",
            flex: "0 0 auto",
            cursor: "pointer",
            transition:
              "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle top accent line */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "2px",
              background:
                "linear-gradient(90deg, var(--color-primary) 0%, transparent 100%)",
              opacity: 0.6,
            }}
          />

          {/* Avatar + Score badge */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Image
              src={
                profile.avatar_url ||
                `https://avatars.githubusercontent.com/${profile.username}`
              }
              alt={displayName}
              width={44}
              height={44}
              unoptimized
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                border: "2px solid var(--color-hairline)",
                objectFit: "cover",
              }}
            />

            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--color-primary)",
                backgroundColor: "rgba(62, 207, 142, 0.1)",
                border: "1px solid rgba(62, 207, 142, 0.2)",
                borderRadius: "99px",
                padding: "2px 8px",
                letterSpacing: "0.3px",
                whiteSpace: "nowrap",
              }}
            >
              {profile.score.toLocaleString("en-US")}
            </span>
          </div>

          {/* Name + handle */}
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--color-ink)",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--color-ink-mute)",
                marginTop: "2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              @{profile.username}
            </div>
          </div>

          {/* Shared language pills */}
          {displayLanguages.length > 0 && (
            <div
              style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}
              aria-label={`Languages: ${displayLanguages.join(", ")}`}
            >
              {displayLanguages.map((lang) => {
                const dot = (LANG_COLORS as Record<string, string>)[lang] ?? "#8b8b8b";
                return (
                  <span
                    key={lang}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      fontWeight: 500,
                      color: "var(--color-ink-mute)",
                      backgroundColor: "var(--color-canvas)",
                      border: "1px solid var(--color-hairline)",
                      borderRadius: "99px",
                      padding: "2px 7px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: dot,
                        flexShrink: 0,
                      }}
                    />
                    {lang}
                  </span>
                );
              })}
            </div>
          )}

          {/* Match reason chip */}
          {(profile.shared_org_count > 0 ||
            profile.shared_language_count > 0) && (
            <div
              style={{
                fontSize: "10px",
                color: "var(--color-ink-mute)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0, color: "var(--color-primary)" }}
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {profile.shared_org_count > 0
                ? `${profile.shared_org_count} shared org${profile.shared_org_count > 1 ? "s" : ""}`
                : `${profile.shared_language_count} shared lang${profile.shared_language_count > 1 ? "s" : ""}`}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main exported component ───────────────────────────────────────────────────
export function SimilarProfiles({ username }: SimilarProfilesProps) {
  const [profiles, setProfiles] = useState<SimilarProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/similar-profiles/${username}`);
        if (cancelled) return;
        if (!res.ok) {
          setIsLoading(false);
          return;
        }
        const json = await res.json();
        if (!cancelled && Array.isArray(json.profiles)) {
          setProfiles(json.profiles);
        }
      } catch {
        // Silent fail — the section simply won't appear.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Show skeletons while loading.
  if (isLoading) {
    return (
      <section
        aria-label="Similar profiles loading"
        style={{ marginTop: "44px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              height: "16px",
              width: "160px",
              borderRadius: "6px",
              backgroundColor: "var(--color-hairline)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
            aria-hidden="true"
          />
        </div>
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px" }}>
          {[0, 1, 2].map((i) => (
            <SimilarProfileSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  // Render nothing if no results (don't pollute the page with an empty section).
  if (profiles.length === 0) return null;

  return (
    <section
      aria-label="Similar profiles — you might also like"
      style={{ marginTop: "44px" }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--color-ink)",
            margin: 0,
          }}
        >
          You might also like
          <span
            style={{
              fontSize: "12px",
              fontWeight: 400,
              color: "var(--color-ink-mute)",
              marginLeft: "8px",
            }}
          >
            similar contributors
          </span>
        </h2>
      </div>

      {/* Horizontally scrollable card row */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          paddingBottom: "8px",
          // Hide scrollbar visually but keep it functional.
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <AnimatePresence>
          {profiles.map((profile, i) => (
            <SimilarProfileCard key={profile.username} profile={profile} index={i} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
