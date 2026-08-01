/**
 * TopReposSkeleton
 *
 * Loading placeholder for the "Popular repositories" grid in ProfileView.
 * Mirrors the heading + repeat(auto-fill, minmax(280px, 1fr)) grid of repo
 * cards, each with a name, description lines, and a language/stars/forks row.
 */

const REPO_CARD_COUNT = 6;

export function TopReposSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading popular repositories"
    >
      {/* Heading */}
      <div
        className="bg-neutral-800 animate-pulse rounded"
        style={{ width: 158, height: 16, margin: "0 0 16px 0" }}
        aria-hidden="true"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {Array.from({ length: REPO_CARD_COUNT }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: "20px",
              border: "1px solid var(--color-hairline)",
              borderRadius: "12px",
              backgroundColor: "var(--color-canvas-soft)",
            }}
          >
            {/* Repo name */}
            <div
              className="bg-neutral-800 animate-pulse rounded"
              style={{ width: "55%", height: 14 }}
              aria-hidden="true"
            />
            {/* Description — two lines */}
            <div
              className="bg-neutral-800 animate-pulse rounded"
              style={{ width: "92%", height: 12 }}
              aria-hidden="true"
            />
            <div
              className="bg-neutral-800 animate-pulse rounded"
              style={{ width: "75%", height: 12 }}
              aria-hidden="true"
            />
            {/* Language / stars / forks row */}
            <div style={{ display: "flex", gap: "12px", marginTop: 4 }}>
              {[52, 38, 38].map((w, j) => (
                <div
                  key={j}
                  className="bg-neutral-800 animate-pulse rounded"
                  style={{ width: w, height: 12 }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

