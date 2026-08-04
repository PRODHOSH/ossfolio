/**
 * End-to-end coverage of the conditional-caching path on
 * `GET /api/v1/users/[username]`.
 *
 * Lives under `src/lib/__tests__/` rather than beside the route on purpose. The
 * App Router treats directories under `src/app` as route segments, and putting a
 * `__tests__` folder inside one puts test files into the routing tree's scan
 * path. Keeping them here sidesteps that entirely, and matches where every other
 * suite in this repo already lives.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub the DB so the handler runs without Supabase.
const profile = {
  username: "octocat", name: "The Octocat", avatar_url: "https://a", github_url: "https://g",
  bio: null, headline: null, score: 1234, followers: 10, top_languages: ["TypeScript"],
  total_commits: 1, total_prs: 2, total_issues: 3, total_reviews: 4,
  badges: [], last_refreshed_at: "2026-07-26T00:00:00.000Z",
};
vi.mock("@/lib/db", () => ({
  getPublicProfileByUsername: vi.fn(async () => ({ data: profile, error: null })),
}));

import { GET } from "@/app/api/v1/users/[username]/route";
import { NextRequest } from "next/server";

const call = (headers: Record<string, string> = {}) =>
  GET(
    new NextRequest("https://ossfolio.dev/api/v1/users/octocat", { headers }),
    { params: Promise.resolve({ username: "octocat" }) },
  );

describe("GET /api/v1/users/[username] — conditional caching", () => {
  beforeEach(() => vi.clearAllMocks());

  it("200 carries a quoted ETag alongside the existing Cache-Control", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toMatch(/^"[0-9a-f]{32}"$/);
    expect(res.headers.get("cache-control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600",
    );
  });

  it("the ETag matches a hash of the exact body the client receives", async () => {
    const res = await call();
    const text = await res.text();
    const { computeETag } = await import("@/lib/http-cache");
    expect(res.headers.get("etag")).toBe(await computeETag(text));
  });

  it("replaying the ETag yields 304 with a genuinely empty body", async () => {
    const first = await call();
    const etag = first.headers.get("etag")!;
    const second = await call({ "if-none-match": etag });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe("");
  });

  it("304 still carries ETag, Cache-Control and CORS", async () => {
    const etag = (await call()).headers.get("etag")!;
    const res = await call({ "if-none-match": etag });
    expect(res.headers.get("etag")).toBe(etag);
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("a weak validator also yields 304", async () => {
    const etag = (await call()).headers.get("etag")!;
    expect((await call({ "if-none-match": `W/${etag}` })).status).toBe(304);
  });

  it("a stale ETag falls through to a full 200", async () => {
    const res = await call({ "if-none-match": '"0000000000000000000000000000dead"' });
    expect(res.status).toBe(200);
    // The route wraps its payload with createApiResponse, so profile fields
    // live under `data` rather than at the top level.
    expect((await res.json()).data.username).toBe("octocat");
  });

  it("the ETag is stable across repeated identical requests", async () => {
    expect((await call()).headers.get("etag")).toBe((await call()).headers.get("etag"));
  });

  it("200 body matches the public contract exactly — no field added or dropped", async () => {
    // Deep equality rather than a partial match: this endpoint is a versioned
    // public contract, so a field appearing or disappearing should fail here and
    // force a deliberate decision, not slip through unnoticed.
    const body = await (await call()).json();
    expect(body.data).toEqual({
      username: "octocat",
      name: "The Octocat",
      avatar_url: "https://a",
      github_url: "https://g",
      bio: null,
      headline: null,
      score: 1234,
      followers: 10,
      top_languages: ["TypeScript"],
      stats: { commits: 1, prs: 2, issues: 3, reviews: 4 },
      badges: [],
      last_refreshed_at: "2026-07-26T00:00:00.000Z",
    });
  });
});
