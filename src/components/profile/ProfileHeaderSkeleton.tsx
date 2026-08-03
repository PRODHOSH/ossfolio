/**
 * ProfileHeaderSkeleton
 *
 * Loading placeholder for the profile header block in ProfileView.
 * Mirrors the header layout (avatar + info column: name, username, bio,
 * links, follower counts) using Tailwind `animate-pulse` blocks so the wait
 * for GitHub data doesn't feel broken.
 */

export function ProfileHeaderSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading profile header"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "24px",
        flexWrap: "wrap",
        padding: "24px",
        marginBottom: "40px",
        background: "var(--color-canvas-soft)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Avatar — 88×88 circle matching ProfileView's Image dimensions */}
      <div
        className="bg-neutral-800 animate-pulse rounded-full"
        style={{ width: 88, height: 88, flexShrink: 0 }}
        aria-hidden="true"
      />

      <div style={{ flex: 1, minWidth: "200px" }}>
        {/* Display name — h1 24px */}
        <div
          className="bg-neutral-800 animate-pulse rounded"
          style={{ width: 180, height: 24 }}
          aria-hidden="true"
        />
        {/* @username — 14px muted */}
        <div
          className="bg-neutral-800 animate-pulse rounded"
          style={{ width: 110, height: 14, marginTop: 8 }}
          aria-hidden="true"
        />
        {/* Bio — two lines */}
        <div
          className="bg-neutral-800 animate-pulse rounded"
          style={{ width: "90%", height: 14, marginTop: 12 }}
          aria-hidden="true"
        />
        <div
          className="bg-neutral-800 animate-pulse rounded"
          style={{ width: "65%", height: 14, marginTop: 6 }}
          aria-hidden="true"
        />

        {/* Location / website / twitter / github link row */}
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: 14 }}
        >
          {[88, 110, 78, 68].map((w, i) => (
            <div
              key={i}
              className="bg-neutral-800 animate-pulse rounded"
              style={{ width: w, height: 13 }}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Followers · following · repos row */}
        <div style={{ display: "flex", gap: "20px", marginTop: 14 }}>
          {[72, 72, 56].map((w, i) => (
            <div
              key={i}
              className="bg-neutral-800 animate-pulse rounded"
              style={{ width: w, height: 13 }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

