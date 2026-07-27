"use client";

export function ProfileAnalyticsChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading traffic analytics chart"
      style={{
        width: "100%",
        height: "220px",
        borderRadius: "8px",
        backgroundColor: "var(--color-canvas, #121212)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes sk-area-pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 150"
        preserveAspectRatio="none"
        style={{
          opacity: 0.4,
          animation: "sk-area-pulse 1.8s ease-in-out infinite",
        }}
      >
        <path
          d="M 0,110 Q 100,40 200,90 T 400,30 L 400,150 L 0,150 Z"
          fill="rgba(62, 207, 142, 0.15)"
        />
        <path
          d="M 0,110 Q 100,40 200,90 T 400,30"
          fill="none"
          stroke="#3ecf8e"
          strokeWidth="2"
        />
      </svg>
      <span
        style={{
          position: "absolute",
          fontSize: "12px",
          color: "var(--color-ink-mute, #94a3b8)",
          fontWeight: 500,
        }}
      >
        Loading Chart Engine...
      </span>
    </div>
  );
}
