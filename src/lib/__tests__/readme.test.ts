import { describe, it, expect } from "vitest";
import { sanitizeMarkdownContent, isSafeUrl } from "../readme";

describe("readme module", () => {
  describe("isSafeUrl", () => {
    it("allows valid http, https, and relative URLs", () => {
      expect(isSafeUrl("https://example.com")).toBe(true);
      expect(isSafeUrl("http://example.com/image.png")).toBe(true);
      expect(isSafeUrl("mailto:user@example.com")).toBe(true);
      expect(isSafeUrl("/path/to/resource")).toBe(true);
      expect(isSafeUrl("#section")).toBe(true);
    });

    it("blocks dangerous javascript: and vbscript: URLs", () => {
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeUrl("JAVASCRIPT:alert('xss')")).toBe(false);
      expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    });
  });

  describe("sanitizeMarkdownContent", () => {
    it("strips dangerous script and iframe tags", () => {
      const input = "## Hello\n<script>alert('XSS')</script>\n<iframe src='http://evil.com'></iframe>";
      const sanitized = sanitizeMarkdownContent(input);
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("<iframe>");
      expect(sanitized).toContain("## Hello");
    });

    it("strips inline event handlers", () => {
      const input = "<img src='x' onerror='alert(1)' />";
      const sanitized = sanitizeMarkdownContent(input);
      expect(sanitized).not.toContain("onerror");
    });

    it("enforces max length truncation", () => {
      const longInput = "a".repeat(15000);
      const sanitized = sanitizeMarkdownContent(longInput, 500);
      expect(sanitized.length).toBe(500);
    });
  });
});
