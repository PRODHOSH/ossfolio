import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Embed & Badge Documentation | OSSfolio",
  description: "Learn how to embed OSSfolio contribution widgets, heatmaps, and SVG badges in your GitHub README, blog, or portfolio.",
};

export default function EmbedDocsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#090d16",
        color: "#f8fafc",
        padding: "40px 20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#ffffff", marginBottom: "12px" }}>
          OSSfolio Embed &amp; Badge Integration Guide
        </h1>
        <p style={{ fontSize: "16px", color: "#94a3b8", lineHeight: 1.6, marginBottom: "32px" }}>
          Showcase your open-source contributor score, merged PRs, and contribution heatmap anywhere across the web:
          in your GitHub profile README, personal portfolio, Notion documents, or blog posts.
        </p>

        {/* Section 1: GitHub README SVG Badges */}
        <section
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: "32px",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "12px" }}>
            1. Dynamic GitHub README Badges
          </h2>
          <p style={{ fontSize: "14px", color: "#cbd5e1", marginBottom: "16px" }}>
            Embed lightweight, auto-updating SVG badges directly into your Markdown files or GitHub profile README.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#818cf8", marginBottom: "6px" }}>
              Score Shield Badge
            </h3>
            <pre
              style={{
                backgroundColor: "#030712",
                padding: "14px",
                borderRadius: "10px",
                overflowX: "auto",
                fontSize: "13px",
                color: "#4ade80",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <code>{`[![OSSfolio Score](https://ossfolio.qzz.io/api/badge/YOUR_USERNAME?type=score&theme=dark)](https://ossfolio.qzz.io/YOUR_USERNAME)`}</code>
            </pre>
          </div>

          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#818cf8", marginBottom: "6px" }}>
              Stats Banner Badge
            </h3>
            <pre
              style={{
                backgroundColor: "#030712",
                padding: "14px",
                borderRadius: "10px",
                overflowX: "auto",
                fontSize: "13px",
                color: "#4ade80",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <code>{`[![OSSfolio Stats](https://ossfolio.qzz.io/api/badge/YOUR_USERNAME?type=stats&theme=neon)](https://ossfolio.qzz.io/YOUR_USERNAME)`}</code>
            </pre>
          </div>
        </section>

        {/* Section 2: HTML iframe Embed */}
        <section
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: "32px",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "12px" }}>
            2. Responsive Iframe Widget
          </h2>
          <p style={{ fontSize: "14px", color: "#cbd5e1", marginBottom: "16px" }}>
            Embed an interactive contribution card with stats and mini activity graph on your website or blog.
          </p>

          <pre
            style={{
              backgroundColor: "#030712",
              padding: "14px",
              borderRadius: "10px",
              overflowX: "auto",
              fontSize: "13px",
              color: "#4ade80",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <code>{`<iframe
  src="https://ossfolio.qzz.io/embed/YOUR_USERNAME?theme=dark&compact=false&showHeatmap=true"
  width="100%"
  height="220"
  frameborder="0"
  style="border: none; border-radius: 14px; overflow: hidden;"
  title="OSSfolio Contributor Card"
></iframe>`}</code>
          </pre>
        </section>

        {/* Section 3: Data Export API */}
        <section
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", marginBottom: "12px" }}>
            3. Programmatic Data Export API (JSON / CSV)
          </h2>
          <p style={{ fontSize: "14px", color: "#cbd5e1", marginBottom: "16px" }}>
            Export raw contribution statistics and pull request details programmatically:
          </p>

          <ul style={{ fontSize: "14px", color: "#a5b4fc", lineHeight: 1.8 }}>
            <li>
              <strong>JSON Format:</strong> <code>GET /api/export/YOUR_USERNAME?format=json</code>
            </li>
            <li>
              <strong>CSV Format:</strong> <code>GET /api/export/YOUR_USERNAME?format=csv</code>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
