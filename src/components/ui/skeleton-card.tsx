interface SkeletonCardProps {
  lines?: number;
  height?: string;
  variant?: "card" | "list" | "profile-header";
}

export function SkeletonCard({
  lines = 3,
  height,
  variant = "card",
}: SkeletonCardProps) {
  const pulseKeyframes = `
    @keyframes sk-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
  `;

  const skeletonStyle: React.CSSProperties = {
    backgroundColor: "var(--color-hairline-cool)",
    borderRadius: "6px",
    animation: "sk-pulse 1.5s ease-in-out infinite",
    height: height || "14px",
  };

  if (variant === "profile-header") {
    return (
      <>
        <style>{pulseKeyframes}</style>
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "flex-start",
            padding: "24px",
            border: "1px solid var(--color-hairline)",
            borderRadius: "12px",
            backgroundColor: "var(--color-canvas-soft)",
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              width: "88px",
              height: "88px",
              borderRadius: "9999px",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ ...skeletonStyle, width: "200px", height: "24px" }} />
            <div style={{ ...skeletonStyle, width: "140px", height: "14px" }} />
            <div style={{ ...skeletonStyle, width: "100%", height: "14px" }} />
            <div style={{ display: "flex", gap: "12px" }}>
              <div
                style={{ ...skeletonStyle, width: "80px", height: "14px" }}
              />
              <div
                style={{ ...skeletonStyle, width: "80px", height: "14px" }}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (variant === "list") {
    return (
      <>
        <style>{pulseKeyframes}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "14px 18px",
            border: "1px solid var(--color-hairline)",
            borderRadius: "12px",
            backgroundColor: "var(--color-canvas-soft)",
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              width: "40px",
              height: "40px",
              borderRadius: "9999px",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ ...skeletonStyle, width: "160px", height: "16px" }} />
            <div style={{ ...skeletonStyle, width: "100px", height: "12px" }} />
          </div>
          <div
            style={{
              ...skeletonStyle,
              width: "60px",
              height: "40px",
              borderRadius: "8px",
            }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div
        style={{
          padding: "20px",
          border: "1px solid var(--color-hairline)",
          borderRadius: "12px",
          backgroundColor: "var(--color-canvas-soft)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              width: "44px",
              height: "44px",
              borderRadius: "9999px",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                ...skeletonStyle,
                width: "140px",
                height: "16px",
                marginBottom: "6px",
              }}
            />
            <div style={{ ...skeletonStyle, width: "100px", height: "12px" }} />
          </div>
          <div style={{ ...skeletonStyle, width: "50px", height: "40px" }} />
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...skeletonStyle,
              width: i === lines - 1 ? "60%" : "100%",
              height: "12px",
              marginBottom: "8px",
            }}
          />
        ))}
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                ...skeletonStyle,
                width: "60px",
                height: "20px",
                borderRadius: "4px",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
