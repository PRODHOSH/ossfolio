'use client';

export function CompareRadarChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading contribution profile radar chart"
      style={{
        border: '1px solid var(--color-hairline)',
        borderRadius: '12px',
        padding: '24px',
        backgroundColor: 'var(--color-canvas-soft)',
      }}
    >
      <style>{`
        @keyframes sk-radar-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.98); }
          50% { opacity: 0.7; transform: scale(1.01); }
        }
      `}</style>

      {/* Title skeleton */}
      <div
        style={{
          width: '210px',
          height: '20px',
          borderRadius: '4px',
          backgroundColor: 'var(--color-hairline-strong)',
          marginBottom: '8px',
          opacity: 0.6,
        }}
      />

      {/* Description skeleton */}
      <div
        style={{
          width: '80%',
          height: '14px',
          borderRadius: '4px',
          backgroundColor: 'var(--color-hairline)',
          marginBottom: '20px',
          opacity: 0.5,
        }}
      />

      {/* Chart container skeleton (360px height to prevent layout shift) */}
      <div
        style={{
          width: '100%',
          height: '360px',
          borderRadius: '8px',
          border: '1px stroke var(--color-hairline)',
          backgroundColor: 'var(--color-canvas)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            border: '2px dashed var(--color-hairline-strong)',
            backgroundColor: 'rgba(62, 207, 142, 0.05)',
            animation: 'sk-radar-pulse 2s ease-in-out infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '2px dashed var(--color-primary)',
              opacity: 0.4,
            }}
          />
        </div>
      </div>

      {/* Footnote skeleton */}
      <div
        style={{
          width: '60%',
          height: '12px',
          borderRadius: '4px',
          backgroundColor: 'var(--color-hairline)',
          marginTop: '12px',
          opacity: 0.4,
        }}
      />
    </div>
  );
}
