/**
 * Truncates a string safely while respecting UTF-16 surrogate pairs
 * to prevent breaking multi-byte characters.
 */
export function safeTruncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const chars = Array.from(str);
  if (chars.length <= maxLength) return str;
  return chars.slice(0, maxLength).join('');
}

export function stripHtml(str: string): string {
  return str.replace(/[<>&"'`\/]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case "'":
        return '&#x27;';
      case '`':
        return '&#x60;';
      case '/':
        return '&#x2F;';
      default:
        return c;
    }
  });
}

export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  const truncated = safeTruncate(trimmed, maxLength);
  return stripHtml(truncated);
}
