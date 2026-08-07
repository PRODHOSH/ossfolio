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

    it("should prevent incomplete URL substring spoofing", () => {
      expect(parseReferrer("https://evil-github.com")).toBe("evil-github.com");
      expect(parseReferrer("https://github.com.attacker.com")).toBe("github.com.attacker.com");
      expect(parseReferrer("https://attacker.com?ref=github.com")).toBe("attacker.com");
      expect(parseReferrer("https://evil-twitter.com")).toBe("evil-twitter.com");
      expect(parseReferrer("https://attacker.com/linkedin.com")).toBe("attacker.com");
      expect(parseReferrer("https://fakebing.com")).toBe("fakebing.com");
      expect(parseReferrer("https://fakeduckduckgo.com")).toBe("fakeduckduckgo.com");
      expect(parseReferrer("https://fakeyahoo.com")).toBe("fakeyahoo.com");
      expect(parseReferrer("https://fakereddit.com")).toBe("fakereddit.com");
      expect(parseReferrer("https://fakeycombinator.com")).toBe("fakeycombinator.com");
      expect(parseReferrer("https://fakehashnode.com")).toBe("fakehashnode.com");
      expect(parseReferrer("https://fakemedium.com")).toBe("fakemedium.com");
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
    // hashVisitorIp is async — it awaits crypto.subtle.digest. Without these
    // awaits the assertions compared two distinct Promise objects, which are
    // never `toBe`-equal regardless of what they resolve to, so the test failed
    // while reporting nothing about the hashing itself.
    it("should produce a consistent, non-empty hash string for an IP address", async () => {
      const hash1 = await hashVisitorIp("192.168.1.1");
      const hash2 = await hashVisitorIp("192.168.1.1");
      const hash3 = await hashVisitorIp("10.0.0.1");

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1.startsWith("ip_")).toBe(true);
    });
  });
});
