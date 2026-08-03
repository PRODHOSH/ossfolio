import { ProfileHeaderSkeleton } from "@/components/profile/ProfileHeaderSkeleton";
import { StatsGridSkeleton } from "@/components/profile/StatsGridSkeleton";
import { TopReposSkeleton } from "@/components/profile/TopReposSkeleton";

/**
 * ProfileSkeleton
 *
 * Composes the section-level loading skeletons (header, popular repos,
 * contribution stats) plus placeholder blocks for tech stack, organizations,
 * and the contribution heatmap — mirroring the full ProfileView layout so the
 * page holds its shape while GitHub data is fetched.
 */
export function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading profile"
      style={{ maxWidth: "56rem", margin: "0 auto", padding: "48px 20px 80px" }}
    >
      <ProfileHeaderSkeleton />

      <TopReposSkeleton />

      <div style={{ marginTop: "44px" }}>
        <StatsGridSkeleton />
      </div>

      {/* Tech stack */}
      <div style={{ marginTop: "44px" }}>
        <div
          className="bg-neutral-800 animate-pulse rounded"
          style={{ width: 96, height: 16, marginBottom: 16 }}
          aria-hidden="true"
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[72, 90, 68, 80, 64, 88, 74, 66].map((w, i) => (
            <div
              key={i}
              className="bg-neutral-800 animate-pulse rounded-full"
              style={{ width: w, height: 28 }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      {/* Organizations */}
      <div style={{ marginTop: "44px" }}>
        <div
          className="bg-neutral-800 animate-pulse rounded"
          style={{ width: 118, height: 16, marginBottom: 16 }}
          aria-hidden="true"
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {[80, 96, 72, 88, 76].map((w, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px 6px 6px",
                border: "1px solid var(--color-hairline)",
                borderRadius: "8px",
                backgroundColor: "var(--color-canvas-soft)",
              }}
            >
              <div
                className="bg-neutral-800 animate-pulse rounded-full"
                style={{ width: 36, height: 36 }}
                aria-hidden="true"
              />
              <div
                className="bg-neutral-800 animate-pulse rounded"
                style={{ width: w, height: 13 }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Contribution heatmap */}
      <div style={{ marginTop: "44px" }}>
        <div
          className="bg-neutral-800 animate-pulse rounded"
          style={{ width: 178, height: 16, marginBottom: 16 }}
          aria-hidden="true"
        />
        <div
          className="bg-neutral-800 animate-pulse rounded"
          style={{ width: "100%", height: 88 }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

