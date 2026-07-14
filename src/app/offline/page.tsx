export default function OfflinePage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "40px 20px",
        backgroundColor: "var(--color-canvas)",
        color: "var(--color-ink)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>&#x1F4F6;</div>
      <h1 style={{ fontSize: "24px", fontWeight: 600, margin: "0 0 8px 0" }}>
        You are offline
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "var(--color-ink-mute)",
          maxWidth: "400px",
          margin: "0 0 24px 0",
          lineHeight: 1.5,
        }}
      >
        Check your internet connection and try again. Your profile data will
        update automatically when you reconnect.
      </p>
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--color-on-primary)",
          backgroundColor: "var(--color-primary)",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        Try again
      </a>
    </main>
  );
}
