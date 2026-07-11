"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";

const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "improvement", label: "Most Improved" },
  { value: "contributions", label: "Contributions" },
  { value: "followers", label: "Followers" },
] as const;

const POPULAR_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "Ruby",
  "PHP",
  "Swift",
];

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [minScoreInput, setMinScoreInput] = useState(searchParams.get("min_score") || "");
  const debouncedQuery = useDebounce(query, 300);
  const debouncedMinScore = useDebounce(minScoreInput, 500);
  const initialRender = useRef(true);

  const lang = searchParams.get("lang") || "";
  const sort = searchParams.get("sort") || "score";
  const minScore = searchParams.get("min_score") || "";

  const pushParams = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams();
      const merged = { q: debouncedQuery, lang, sort, min_score: debouncedMinScore, ...overrides };
      Object.entries(merged).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });
      router.replace(`/discover?${params.toString()}`);
    },
    [debouncedQuery, lang, sort, debouncedMinScore, router]
  );

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    pushParams({ q: debouncedQuery, page: "" });
  }, [debouncedQuery, pushParams]);

  useEffect(() => {
    if (initialRender.current) return;
    pushParams({ min_score: debouncedMinScore, page: "" });
  }, [debouncedMinScore, pushParams]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontSize: "15px",
    padding: "12px 16px",
    border: "1px solid var(--color-hairline)",
    borderRadius: "6px",
    outline: "none",
    backgroundColor: "var(--color-canvas-soft)",
    color: "var(--color-ink)",
  };

  const selectStyle: React.CSSProperties = {
    fontSize: "14px",
    padding: "8px 12px",
    border: "1px solid var(--color-hairline)",
    borderRadius: "6px",
    backgroundColor: "var(--color-canvas)",
    color: "var(--color-ink)",
    cursor: "pointer",
  };

  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}
    >
      <input
        type="text"
        placeholder="Search by username, name, or language..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={inputStyle}
        aria-label="Search profiles"
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <select
          value={lang}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("lang", e.target.value);
            params.delete("page");
            router.replace(`/discover?${params.toString()}`);
          }}
          style={selectStyle}
          aria-label="Filter by language"
        >
          <option value="">All Languages</option>
          {POPULAR_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("sort", e.target.value);
            params.delete("page");
            router.replace(`/discover?${params.toString()}`);
          }}
          style={selectStyle}
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min score"
          value={minScoreInput}
          onChange={(e) => setMinScoreInput(e.target.value)}
          min={0}
          style={{ ...selectStyle, width: "100px" }}
          aria-label="Minimum score filter"
        />

        {(query || lang || minScore) && (
          <button
            onClick={() => {
              setQuery("");
              setMinScoreInput("");
              router.replace("/discover");
            }}
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--color-ink-mute)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    </form>
  );
}
