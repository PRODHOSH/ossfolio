import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation - OSSfolio",
  description:
    "Interactive reference for the OSSfolio public read API, including rate " +
    "limiting and conditional request behaviour.",
};

/**
 * Interactive viewer for /api/openapi.json.
 *
 * The renderer is loaded from a CDN rather than bundled. It is only ever needed
 * on this page, and pulling a documentation UI into the application bundle
 * would cost every other route in the app for something an integrator visits
 * once. Nothing here runs during the build.
 */
export default function ApiDocsPage() {
  return (
    <main style={{ minHeight: "100vh" }}>
      <script
        id="api-reference"
        data-url="/api/openapi.json"
        // Matches the site's light-canvas commitment in DESIGN.md rather than
        // defaulting to the renderer's dark theme.
        data-configuration='{"theme":"default","darkMode":false,"hideDownloadButton":false}'
      />
      <script
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
        async
      />
      <noscript>
        <div style={{ padding: "24px" }}>
          <h1>API Documentation</h1>
          <p>
            The interactive viewer needs JavaScript. The specification itself is
            available at <a href="/api/openapi.json">/api/openapi.json</a>.
          </p>
        </div>
      </noscript>
    </main>
  );
}
