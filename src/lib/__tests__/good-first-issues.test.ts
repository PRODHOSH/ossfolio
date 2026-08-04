import { describe, it, expect } from "vitest";
import {
  fetchGoodFirstIssues,
  FALLBACK_GOOD_FIRST_ISSUES,
} from "../good-first-issues";

describe("good-first-issues module", () => {
  it("fetches list of beginner open source issues", async () => {
    const issues = await fetchGoodFirstIssues(undefined, 10);
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);

    const first = issues[0];
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("url");
    expect(first).toHaveProperty("repoName");
    expect(first).toHaveProperty("labels");
  });

  it("filters issues by language correctly", async () => {
    const pythonIssues = await fetchGoodFirstIssues("Python", 10);
    expect(
      pythonIssues.every((i) => i.language?.toLowerCase() === "python"),
    ).toBe(true);

    const tsIssues = await fetchGoodFirstIssues("TypeScript", 10);
    expect(
      tsIssues.every((i) => i.language?.toLowerCase() === "typescript"),
    ).toBe(true);
  });

  it("contains valid fallback issues when network is unavailable", () => {
    expect(FALLBACK_GOOD_FIRST_ISSUES.length).toBeGreaterThan(0);
    const reactIssue = FALLBACK_GOOD_FIRST_ISSUES.find(
      (i) => i.repoName === "shadcn-ui/ui",
    );
    expect(reactIssue).toBeDefined();
    expect(reactIssue?.labels).toContain("good first issue");
  });
});
