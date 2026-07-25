import { describe, it, expect } from "vitest";
import { parseReferrer, parseDeviceType, hashVisitorIp } from "../analytics-tracker";

describe("analytics-tracker helpers", () => {
  describe("parseReferrer", () => {
    it("should return Direct for empty or null referrers", () => {
      expect(parseReferrer(null)).toBe("Direct");
      expect(parseReferrer("")).toBe("Direct");
      expect(parseReferrer("   ")).toBe("Direct");
    });

    it("should recognize major social platforms & search engines", () => {
      expect(parseReferrer("https://github.com/user/repo")).toBe("GitHub");
      expect(parseReferrer("https://t.co/xyz123")).toBe("Twitter / X");
      expect(parseReferrer("https://x.com/post/123")).toBe("Twitter / X");
      expect(parseReferrer("https://www.linkedin.com/feed/")).toBe("LinkedIn");
      expect(parseReferrer("https://www.google.com/search?q=ossfolio")).toBe("Search Engine");
      expect(parseReferrer("https://news.ycombinator.com/item?id=123")).toBe("Hacker News");
      expect(parseReferrer("https://dev.to/article")).toBe("Tech Blogs");
    });

    it("should extract domain name for unmapped web sites", () => {
      expect(parseReferrer("https://blog.mywebsite.com/posts/1")).toBe("blog.mywebsite.com");
    });
  });

  describe("parseDeviceType", () => {
    it("should identify mobile devices", () => {
      expect(
        parseDeviceType(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
        )
      ).toBe("mobile");
      expect(
        parseDeviceType(
          "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 Mobile Safari/537.36"
        )
      ).toBe("mobile");
    });

    it("should identify tablet devices", () => {
      expect(
        parseDeviceType("Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15")
      ).toBe("tablet");
    });

    it("should default to desktop for unknown or desktop user agents", () => {
      expect(
        parseDeviceType(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0"
        )
      ).toBe("desktop");
      expect(parseDeviceType(null)).toBe("desktop");
    });
  });

  describe("hashVisitorIp", () => {
    it("should produce a consistent, non-empty hash string for an IP address", () => {
      const hash1 = hashVisitorIp("192.168.1.1");
      const hash2 = hashVisitorIp("192.168.1.1");
      const hash3 = hashVisitorIp("10.0.0.1");

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1.startsWith("ip_")).toBe(true);
    });
  });
});
