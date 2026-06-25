/**
 * Twitter-specific OG image.
 *
 * Re-exports the same generator used for the Open Graph image so that
 * Twitter/X crawlers receive a dedicated `twitter:image` meta tag pointing
 * to a 1200×630 PNG. Without this file, some platforms only read `og:image`
 * and ignore `twitter:image`, resulting in inconsistent previews.
 *
 * Note: `runtime` must be declared directly here — Next.js does not allow
 * route-segment config values to be re-exported from another module.
 */
export { default, alt, size, contentType } from "./opengraph-image";

export const runtime = "edge";
