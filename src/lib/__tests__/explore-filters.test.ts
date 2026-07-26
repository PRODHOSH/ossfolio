import { describe, it, expect } from "vitest";
import {
  normalizeLanguage,
  normalizeScoreTier,
  buildExploreQuery,
  hasActiveFilters,
  describeFilters,
  SCORE_TIERS,
  type ExploreFilters,
} from "../explore-filters";
import { POPULAR_LANGUAGES } from "../languages";

const filters = (over: Partial<ExploreFilters> = {}): ExploreFilters => ({
  type: "users",
  q: "",
  sortBy: "score",
  lang: null,
  minScore: 0,
  page: 1,
  ...over,
});

describe("normalizeLanguage", () => {
  it("accepts an offered language", () => {
    expect(normalizeLanguage("TypeScript")).toBe("TypeScript");
  });

  it("accepts every offered language", () => {
    for (const lang of POPULAR_LANGUAGES) {
      expect(normalizeLanguage(lang), lang).toBe(lang);
    }
  });

  it("returns canonical casing for a lowercased URL", () => {
    // `top_languages @> array[lang]` is case-sensitive, so a bookmarked
    // ?lang=typescript must still resolve to the stored "TypeScript".
    expect(normalizeLanguage("typescript")).toBe("TypeScript");
    expect(normalizeLanguage("RUST")).toBe("Rust");
  });

  it("handles languages with punctuation", () => {
    expect(normalizeLanguage("c++")).toBe("C++");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeLanguage("  Go  ")).toBe("Go");
  });

  it("rejects a language that is not offered", () => {
    expect(normalizeLanguage("COBOL")).toBeNull();
    expect(normalizeLanguage("Brainfuck")).toBeNull();
  });

  it("rejects empty, whitespace and non-string input", () => {
    expect(normalizeLanguage("")).toBeNull();
    expect(normalizeLanguage("   ")).toBeNull();
    expect(normalizeLanguage(null)).toBeNull();
    expect(normalizeLanguage(undefined)).toBeNull();
    expect(normalizeLanguage(42)).toBeNull();
    expect(normalizeLanguage(["Go"])).toBeNull();
  });

  it("does not pass through injection-shaped input", () => {
    expect(normalizeLanguage("Go'); drop table profiles;--")).toBeNull();
    expect(normalizeLanguage("%")).toBeNull();
  });
});

describe("normalizeScoreTier", () => {
  it("accepts every offered tier", () => {
    for (const tier of SCORE_TIERS) {
      expect(normalizeScoreTier(String(tier.value)), tier.label).toBe(tier.value);
    }
  });

  it("falls back to no filter for an unoffered number", () => {
    expect(normalizeScoreTier("750")).toBe(0);
    expect(normalizeScoreTier("999999")).toBe(0);
  });

  it("falls back to no filter for nonsense rather than erroring", () => {
    expect(normalizeScoreTier("abc")).toBe(0);
    expect(normalizeScoreTier("")).toBe(0);
    expect(normalizeScoreTier(null)).toBe(0);
    expect(normalizeScoreTier(undefined)).toBe(0);
    expect(normalizeScoreTier(500)).toBe(0);
  });

  it("rejects negative values", () => {
    expect(normalizeScoreTier("-100")).toBe(0);
  });

  it("trims whitespace", () => {
    expect(normalizeScoreTier(" 500 ")).toBe(500);
  });
});

describe("buildExploreQuery", () => {
  it("omits defaults so shared URLs stay readable", () => {
    expect(buildExploreQuery(filters())).toEqual({});
  });

  it("includes an active language", () => {
    expect(buildExploreQuery(filters({ lang: "Rust" }))).toEqual({
      lang: "Rust",
    });
  });

  it("includes an active score tier as a string", () => {
    expect(buildExploreQuery(filters({ minScore: 500 }))).toEqual({
      minScore: "500",
    });
  });

  it("omits a zero score tier", () => {
    expect(buildExploreQuery(filters({ minScore: 0 }))).toEqual({});
  });

  it("preserves the search query when changing language", () => {
    const result = buildExploreQuery(filters({ q: "alice" }), { lang: "Go" });
    expect(result).toEqual({ q: "alice", lang: "Go" });
  });

  it("preserves a non-default sort when changing language", () => {
    const result = buildExploreQuery(filters({ sortBy: "prs" }), {
      lang: "Python",
    });
    expect(result).toEqual({ sortBy: "prs", lang: "Python" });
  });

  it("preserves a non-default type when changing language", () => {
    const result = buildExploreQuery(filters({ type: "organizations" }), {
      lang: "Java",
    });
    expect(result.type).toBe("organizations");
  });

  it("preserves language when changing score tier, and vice versa", () => {
    expect(
      buildExploreQuery(filters({ lang: "Rust" }), { minScore: 1000 }),
    ).toEqual({ lang: "Rust", minScore: "1000" });
    expect(
      buildExploreQuery(filters({ minScore: 1000 }), { lang: "Rust" }),
    ).toEqual({ lang: "Rust", minScore: "1000" });
  });

  it("clears a filter when the patch sets it empty", () => {
    expect(buildExploreQuery(filters({ lang: "Rust" }), { lang: null })).toEqual(
      {},
    );
    expect(
      buildExploreQuery(filters({ minScore: 500 }), { minScore: 0 }),
    ).toEqual({});
  });

  it("never carries pagination into a filter link", () => {
    // Staying on page 4 while narrowing to two pages would look like a broken
    // filter rather than the end of the list.
    const result = buildExploreQuery(filters({ page: 4, lang: "Go" }), {
      lang: "Rust",
    });
    expect(result).not.toHaveProperty("page");
  });

  it("carries every active filter together", () => {
    const result = buildExploreQuery(
      filters({
        type: "organizations",
        q: "alice",
        sortBy: "prs",
        lang: "Rust",
        minScore: 500,
      }),
    );
    expect(result).toEqual({
      type: "organizations",
      q: "alice",
      sortBy: "prs",
      lang: "Rust",
      minScore: "500",
    });
  });
});

describe("hasActiveFilters", () => {
  it("is false for the default view", () => {
    expect(hasActiveFilters(filters())).toBe(false);
  });

  it("is true for any active filter", () => {
    expect(hasActiveFilters(filters({ lang: "Go" }))).toBe(true);
    expect(hasActiveFilters(filters({ minScore: 100 }))).toBe(true);
    expect(hasActiveFilters(filters({ q: "alice" }))).toBe(true);
  });

  it("ignores sort and type, which are views rather than filters", () => {
    expect(hasActiveFilters(filters({ sortBy: "prs" }))).toBe(false);
    expect(hasActiveFilters(filters({ type: "organizations" }))).toBe(false);
  });
});

describe("describeFilters", () => {
  it("is empty when nothing is filtered", () => {
    expect(describeFilters(filters())).toBe("");
  });

  it("names the language", () => {
    expect(describeFilters(filters({ lang: "Rust" }))).toBe("Rust");
  });

  it("describes the score tier", () => {
    expect(describeFilters(filters({ minScore: 500 }))).toBe("score 500+");
  });

  it("joins multiple filters", () => {
    expect(
      describeFilters(filters({ lang: "Go", minScore: 100, q: "alice" })),
    ).toBe("Go · score 100+ · matching “alice”");
  });
});
