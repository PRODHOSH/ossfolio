export const MAX_README_LENGTH = 10000;

/**
 * Escapes HTML meta-characters (&, <, >, ", ') to prevent HTML element injection.
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates whether a URL uses a safe protocol for markdown links/images.
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();

  // Disallow dangerous URL schemes: javascript:, vbscript:, and unapproved data: URIs
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("data:")
  ) {
    // Only allow data: URIs for safe raster image mime types (png, jpeg, jpg, gif, webp)
    if (trimmed.startsWith("data:")) {
      return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(trimmed);
    }
    return false;
  }

  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#")
  );
}

const DANGEROUS_TAG_NAMES = [
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "style",
  "applet",
  "meta",
  "link",
  "base",
];

/**
 * Sanitizes raw Markdown content by stripping dangerous HTML tags,
 * scripts, inline JS event handlers, and enforcing URL protocol safety.
 */
export function sanitizeMarkdownContent(
  rawMarkdown: unknown,
  maxLength = MAX_README_LENGTH,
): string {
  if (typeof rawMarkdown !== "string") return "";

  let cleaned = rawMarkdown.trim();

  // Enforce max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  // Iteratively strip <script> tags to prevent multi-character bypasses (e.g. <scr<script>ipt>)
  // and handle script end tags with trailing spaces (e.g. </script  >).
  let prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    // Strip <script...> ... </script...>
    cleaned = cleaned.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
    // Strip unclosed or opening <script...> tags
    cleaned = cleaned.replace(/<script\b[^>]*>/gi, "");
    // Strip standalone </script...> tags
    cleaned = cleaned.replace(/<\/script\s*>/gi, "");
  }

  // Iteratively strip dangerous tags using tag-specific patterns to prevent ReDoS
  prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    for (const tag of DANGEROUS_TAG_NAMES) {
      const containerRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi");
      cleaned = cleaned.replace(containerRegex, "");
      const singleRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
      cleaned = cleaned.replace(singleRegex, "");
      const closeRegex = new RegExp(`<\\/${tag}\\s*>`, "gi");
      cleaned = cleaned.replace(closeRegex, "");
    }
  }

  // Iteratively strip inline JS event handlers (on*="...") to prevent multi-character bypasses (e.g. oonerror=)
  prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(['"])(.*?)\1/gi, "");
    cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*[^>\s]+/gi, "");
  }

  // Strip javascript: hrefs and srcs
  prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(/href\s*=\s*(['"])javascript:[\s\S]*?\1/gi, 'href="#"');
    cleaned = cleaned.replace(/src\s*=\s*(['"])javascript:[\s\S]*?\1/gi, 'src=""');
  }

  return cleaned;
}

