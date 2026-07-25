export function ImpactNetworkSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading contribution network visualization"
      style={{
        width: "100%",
        height: "500px",
        borderRadius: "12px",
        border: "1px solid var(--color-hairline)",
        backgroundColor: "var(--color-canvas-soft)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        marginTop: "24px",
      }}
    >
      <style>{`
        @keyframes sk-network-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.98); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
      `}</style>
      
      {/* Central skeleton node */}
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "#3ecf8e",
          opacity: 0.5,
          animation: "sk-network-pulse 2s ease-in-out infinite",
          boxShadow: "0 0 20px rgba(62, 207, 142, 0.4)",
        }}
      />
      
      {/* Orbiting skeleton node shapes */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          gap: "80px",
          alignItems: "center",
          animation: "sk-network-pulse 2s ease-in-out infinite 0.3s",
        }}
      >
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#60a5fa", opacity: 0.4 }} />
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#c084fc", opacity: 0.4 }} />
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#fbbf24", opacity: 0.4 }} />
      </div>

      <div style={{ marginTop: "32px", textAlign: "center" }}>
        <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-ink)", margin: 0 }}>
          Building Contribution Impact Network...
        </p>
        <p style={{ fontSize: "12px", color: "var(--color-ink-mute)", marginTop: "4px" }}>
          Connecting repositories, organizations & collaborators
        </p>
      </div>
    </div>
  );
}
