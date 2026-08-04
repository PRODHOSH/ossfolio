export const MAX_README_LENGTH = 10000;

/**
 * Validates whether a URL uses a safe protocol for markdown links/images.
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("data:text/html")
  ) {
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

  // Strip script, iframe, object, embed, form, input, style tags
  cleaned = cleaned.replace(
    /<script\b[^<]*>([\s\S]*?)<\/script>/gi,
    "",
  );
  cleaned = cleaned.replace(
    /<(iframe|object|embed|form|input|style)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    "",
  );
  cleaned = cleaned.replace(/<(iframe|object|embed|form|input|style)[^>]*\/>/gi, "");

  // Strip inline JS event handlers (on*="...")
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(['"])(.*?)\1/gi, "");
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*[^>\s]+/gi, "");

  // Strip javascript: hrefs and srcs
  cleaned = cleaned.replace(/href\s*=\s*(['"])javascript:[\s\S]*?\1/gi, 'href="#"');
  cleaned = cleaned.replace(/src\s*=\s*(['"])javascript:[\s\S]*?\1/gi, 'src=""');

  return cleaned;
}
