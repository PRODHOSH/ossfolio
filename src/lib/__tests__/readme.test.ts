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

    it("blocks dangerous javascript:, vbscript:, and unapproved data: URLs", () => {
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeUrl("JAVASCRIPT:alert('xss')")).toBe(false);
      expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
      expect(isSafeUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
      expect(isSafeUrl("data:text/javascript,alert(1)")).toBe(false);
    });

    it("allows safe raster image data URIs", () => {
      expect(isSafeUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")).toBe(true);
    });
  });

  describe("sanitizeMarkdownContent", () => {
    it("strips dangerous script and iframe tags including end tags with spaces and nested bypasses", () => {
      const input = "## Hello\n<script>alert('XSS')</script >\n<scr<script>ipt>alert(2)</script>\n<iframe src='http://evil.com'></iframe>\n<ifr<iframe>ame src='test'></iframe  >";
      const sanitized = sanitizeMarkdownContent(input);
      expect(sanitized).not.toContain("<script");
      expect(sanitized).not.toContain("<iframe");
      expect(sanitized).not.toContain("alert");
      expect(sanitized).toContain("## Hello");
    });

    it("strips inline event handlers and handles nested event handler bypasses", () => {
      const input = "<img src='x' onerror='alert(1)' />\n<img src='x' oonerror='alert(2)' />";
      const sanitized = sanitizeMarkdownContent(input);
      expect(sanitized).not.toContain("onerror");
    });

    it("handles repetitive '>;' without ReDoS performance degradation", () => {
      const repeated = ">;".repeat(5000);
      const input = `<iframe src="test">${repeated}</iframe>`;
      const start = Date.now();
      const sanitized = sanitizeMarkdownContent(input);
      const duration = Date.now() - start;
      expect(sanitized).toBe("");
      expect(duration).toBeLessThan(1000);
    });

    it("enforces max length truncation", () => {
      const longInput = "a".repeat(15000);
      const sanitized = sanitizeMarkdownContent(longInput, 500);
      expect(sanitized.length).toBe(500);
    });
  });
});

