import { describe, it, expect } from "vitest";
import {
  fetchTrendingProjects,
  FALLBACK_TRENDING_PROJECTS,
} from "../trending-projects";

describe("trending-projects data layer", () => {
  it("returns fallback curated trending projects when database is empty or unavailable", async () => {
    const projects = await fetchTrendingProjects(6);

    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBe(6);

    const first = projects[0];
    expect(first).toHaveProperty("repoName");
    expect(first).toHaveProperty("stars");
    expect(first).toHaveProperty("url");
    expect(first).toHaveProperty("topics");
    expect(first).toHaveProperty("seekingContributors");
  });

  it("respects the requested limit parameter", async () => {
    const projects = await fetchTrendingProjects(3);
    expect(projects.length).toBe(3);
  });

  it("contains valid default repository entries", () => {
    const reactProject = FALLBACK_TRENDING_PROJECTS.find(
      (p) => p.repoName === "facebook/react",
    );
    expect(reactProject).toBeDefined();
    expect(reactProject?.language).toBe("JavaScript");
    expect(reactProject?.stars).toBeGreaterThan(100000);
    expect(reactProject?.seekingContributors).toBe(true);
  });
});
