import { describe, it, expect } from "vitest";
import { fetchUserGists, FALLBACK_GISTS } from "../gists";

describe("gists module", () => {
  it("returns empty list when username is empty", async () => {
    const gists = await fetchUserGists("");
    expect(gists).toEqual([]);
  });

  it("fetches fallback gists when network is unavailable or unauthenticated", async () => {
    const gists = await fetchUserGists("octocat");
    expect(Array.isArray(gists)).toBe(true);
    expect(gists.length).toBeGreaterThan(0);

    const first = gists[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("description");
    expect(first).toHaveProperty("url");
  });

  it("contains valid fallback gist items", () => {
    expect(FALLBACK_GISTS.default.length).toBeGreaterThan(0);
    const item = FALLBACK_GISTS.default[0];
    expect(item.primaryFile?.language).toBe("TypeScript");
  });
});
