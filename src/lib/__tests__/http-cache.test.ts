import { describe, it, expect } from "vitest";
import { computeETag, isNotModified } from "@/lib/http-cache";

describe("computeETag", () => {
  it("wraps the digest in double quotes, as the entity-tag grammar requires", async () => {
    const tag = await computeETag("hello");
    expect(tag.startsWith('"')).toBe(true);
    expect(tag.endsWith('"')).toBe(true);
  });

  it("is a strong validator — no weak prefix", async () => {
    const tag = await computeETag("hello");
    expect(tag.startsWith("W/")).toBe(false);
  });

  it("is deterministic for identical input", async () => {
    expect(await computeETag("same")).toBe(await computeETag("same"));
  });

  it("changes when the payload changes by a single character", async () => {
    expect(await computeETag('{"score":100}')).not.toBe(
      await computeETag('{"score":101}'),
    );
  });

  it("matches the known SHA-256 of a fixed input, truncated to 32 hex chars", async () => {
    // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(await computeETag("hello")).toBe('"2cf24dba5fb0a30e26e83b2ac5b9e29e"');
  });

  it("handles an empty payload without throwing", async () => {
    expect(await computeETag("")).toMatch(/^"[0-9a-f]{32}"$/);
  });

  it("handles non-ASCII payloads (UTF-8 encoded, not code units)", async () => {
    expect(await computeETag('{"name":"José 日本"}')).toMatch(/^"[0-9a-f]{32}"$/);
  });
});

describe("isNotModified", () => {
  const ETAG = '"abc123"';

  it("returns false when the header is absent", () => {
    expect(isNotModified(null, ETAG)).toBe(false);
    expect(isNotModified(undefined, ETAG)).toBe(false);
  });

  it("returns false for an empty or whitespace-only header", () => {
    expect(isNotModified("", ETAG)).toBe(false);
    expect(isNotModified("   ", ETAG)).toBe(false);
  });

  it("matches an identical strong tag", () => {
    expect(isNotModified('"abc123"', ETAG)).toBe(true);
  });

  it("does not match a different tag", () => {
    expect(isNotModified('"different"', ETAG)).toBe(false);
  });

  it("matches a weak tag against a strong one — If-None-Match uses weak comparison", () => {
    expect(isNotModified('W/"abc123"', ETAG)).toBe(true);
  });

  it("matches when the current tag appears anywhere in a list", () => {
    expect(isNotModified('"other", "abc123", "more"', ETAG)).toBe(true);
    expect(isNotModified('"abc123","second"', ETAG)).toBe(true);
    expect(isNotModified('"first","second"', ETAG)).toBe(false);
  });

  it("matches a weak tag inside a list", () => {
    expect(isNotModified('"other", W/"abc123"', ETAG)).toBe(true);
  });

  it("tolerates irregular whitespace around list members", () => {
    expect(isNotModified('   "other" ,    "abc123"   ', ETAG)).toBe(true);
  });

  it("treats * as a match, per RFC 9110", () => {
    expect(isNotModified("*", ETAG)).toBe(true);
    expect(isNotModified("  *  ", ETAG)).toBe(true);
  });

  it("does not treat a bare * inside a list as a wildcard", () => {
    // `*` is only meaningful as the entire field value. As a list member it is
    // not a valid entity-tag and must not silently match everything.
    expect(isNotModified('"other", *', ETAG)).toBe(false);
  });

  it("is quote-sensitive — an unquoted value is not a valid entity-tag", () => {
    expect(isNotModified("abc123", ETAG)).toBe(false);
  });

  it("does not match on empty list members produced by stray commas", () => {
    expect(isNotModified(",,,", ETAG)).toBe(false);
  });

  it("treats a comma inside a quoted tag as content, not a delimiter", () => {
    // `etagc` admits %x23-7E and 0x2C sits in that range, so "a,b" is one
    // entity-tag rather than two. RFC 9110 §8.8.3.
    expect(isNotModified('"a,b"', '"a,b"')).toBe(true);
  });

  it("still splits on commas that sit between quoted tags", () => {
    expect(isNotModified('"a,b", "abc123"', '"abc123"')).toBe(true);
    expect(isNotModified('"a,b","c,d"', '"c,d"')).toBe(true);
  });

  it("does not let a quoted comma cause a false match", () => {
    expect(isNotModified('"a,b"', '"a"')).toBe(false);
    expect(isNotModified('"a,b"', '"b"')).toBe(false);
  });

  it("handles a quoted comma alongside a weak validator", () => {
    expect(isNotModified('W/"a,b"', '"a,b"')).toBe(true);
  });

  it("round-trips against a real computed tag", async () => {
    const tag = await computeETag('{"username":"octocat"}');
    expect(isNotModified(tag, tag)).toBe(true);
    expect(isNotModified(`W/${tag}`, tag)).toBe(true);
    expect(isNotModified('"stale"', tag)).toBe(false);
  });
});
