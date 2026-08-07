import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function SettingsLoading() {
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
          style={{ maxWidth: "56rem", margin: "0 auto", padding: "56px 20px" }}
        >
          {/* Header Skeleton */}
          <div style={{ marginBottom: "48px" }}>
            <div
              style={{
                width: "160px",
                height: "32px",
                backgroundColor: "var(--color-hairline-cool)",
                borderRadius: "6px",
                animation: "sk-pulse 1.5s ease-in-out infinite",
                marginBottom: "8px",
              }}
            />
            <div
              style={{
                width: "320px",
                height: "16px",
                backgroundColor: "var(--color-hairline-cool)",
                borderRadius: "6px",
                animation: "sk-pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* Form Fields Skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                  style={{
                    width: "120px",
                    height: "16px",
                    backgroundColor: "var(--color-hairline-cool)",
                    borderRadius: "4px",
                    animation: "sk-pulse 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    height: "44px",
                    backgroundColor: "var(--color-canvas-soft)",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: "8px",
                    animation: "sk-pulse 1.5s ease-in-out infinite",
                  }}
                />
              </div>
            ))}

            {/* Button Skeleton */}
            <div
              style={{
                width: "120px",
                height: "44px",
                backgroundColor: "var(--color-hairline-cool)",
                borderRadius: "8px",
                animation: "sk-pulse 1.5s ease-in-out infinite",
                marginTop: "16px",
              }}
            />
          </div>
        </div>
      </main>
      <Footer />
      <style>{`@keyframes sk-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </>
  );
}
