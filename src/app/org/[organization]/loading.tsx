import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function OrganizationLoading() {
  return (
    <>
      <Navbar />
      <main
        style={{
          backgroundColor: "var(--color-canvas)",
          color: "var(--color-ink)",
          minHeight: "100vh",
          transition: "background-color 0.2s ease, color 0.2s ease",
        }}
      >
        <div
          style={{ maxWidth: "72rem", margin: "0 auto", padding: "56px 20px" }}
        >
          {/* Header Skeleton */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginBottom: "48px",
            }}
          >
            <div
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "12px",
                backgroundColor: "var(--color-hairline-cool)",
                animation: "sk-pulse 1.5s ease-in-out infinite",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  width: "240px",
                  height: "32px",
                  backgroundColor: "var(--color-hairline-cool)",
                  borderRadius: "6px",
                  animation: "sk-pulse 1.5s ease-in-out infinite",
                  marginBottom: "12px",
                }}
              />
              <div
                style={{
                  width: "400px",
                  height: "16px",
                  backgroundColor: "var(--color-hairline-cool)",
                  borderRadius: "6px",
                  animation: "sk-pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Grid Skeleton */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: "140px",
                  backgroundColor: "var(--color-canvas-soft)",
                  borderRadius: "12px",
                  border: "1px solid var(--color-hairline)",
                  animation: "sk-pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <style>{`@keyframes sk-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </>
  );
}
