/**
 * StatsGridSkeleton
 *
 * Loading placeholder for the "Contribution stats" grid in ProfileView.
 * Mirrors the heading + repeat(auto-fit, minmax(140px, 1fr)) grid of stat
 * cards, each with a number block and a label block.
 */

const STAT_CARD_COUNT = 8;

export function StatsGridSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading contribution stats">
      {/* Heading */}
      <div
        className="bg-neutral-800 animate-pulse rounded"
        style={{ width: 148, height: 16, margin: '0 0 16px 0' }}
        aria-hidden="true"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        {Array.from({ length: STAT_CARD_COUNT }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px 12px',
              border: '1px solid var(--color-hairline)',
              borderRadius: '12px',
              backgroundColor: 'var(--color-canvas-soft)',
              textAlign: 'center',
            }}
          >
            {/* Stat number */}
            <div
              className="bg-neutral-800 animate-pulse rounded"
              style={{ width: '55%', height: 24 }}
              aria-hidden="true"
            />
            {/* Stat label */}
            <div
              className="bg-neutral-800 animate-pulse rounded"
              style={{ width: '80%', height: 12, marginTop: 8 }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
