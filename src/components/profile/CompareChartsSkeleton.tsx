"use client";

export function CompareChartsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading comparison bar charts"
      style={{
        marginTop: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <style>{`
        @keyframes sk-bar-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Metric Breakdown Card */}
      <div
        style={{
          border: "1px solid var(--color-hairline)",
          borderRadius: "12px",
          padding: "24px",
          backgroundColor: "var(--color-canvas-soft)",
        }}
      >
        <div
          style={{
            width: "220px",
            height: "20px",
            borderRadius: "4px",
            backgroundColor: "var(--color-hairline-strong)",
            marginBottom: "20px",
            opacity: 0.6,
          }}
        />

        <div
          style={{
            width: "100%",
            height: "300px",
            borderRadius: "8px",
            backgroundColor: "var(--color-canvas)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          {[60, 85, 45, 70].map((h, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-end",
                height: "100%",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: `${h}%`,
                  borderRadius: "4px 4px 0 0",
                  backgroundColor: "var(--color-primary)",
                  opacity: 0.3,
                  animation: "sk-bar-pulse 1.8s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  width: "24px",
                  height: `${h * 0.7}%`,
                  borderRadius: "4px 4px 0 0",
                  backgroundColor: "var(--color-hairline-strong)",
                  opacity: 0.3,
                  animation: "sk-bar-pulse 1.8s ease-in-out infinite 0.2s",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Score Delta Card Skeleton */}
      <div
        style={{
          border: "1px solid var(--color-hairline)",
          borderRadius: "12px",
          padding: "24px",
          backgroundColor: "var(--color-canvas-soft)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              width: "160px",
              height: "20px",
              borderRadius: "4px",
              backgroundColor: "var(--color-hairline-strong)",
              marginBottom: "8px",
              opacity: 0.6,
            }}
          />
          <div
            style={{
              width: "200px",
              height: "14px",
              borderRadius: "4px",
              backgroundColor: "var(--color-hairline)",
              opacity: 0.4,
            }}
          />
        </div>
        <div
          style={{
            width: "80px",
            height: "32px",
            borderRadius: "6px",
            backgroundColor: "var(--color-hairline-strong)",
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  );
}
