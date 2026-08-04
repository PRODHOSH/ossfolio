import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageTreemap } from "../LanguageTreemap";
import { calculateLanguageTreemapData } from "@/lib/language-treemap";
import type { TechEntry } from "@/types";

const mockTechStack: TechEntry[] = [
  { language: "TypeScript", repoCount: 9 },
  { language: "Python", repoCount: 6 },
  { language: "Rust", repoCount: 3 },
  { language: "Go", repoCount: 2 },
];

describe("Language Treemap Data Calculation", () => {
  it("calculates language shares and percentage proportions accurately", () => {
    const data = calculateLanguageTreemapData(mockTechStack);

    expect(data.length).toBe(4);

    const tsItem = data.find((d) => d.language === "TypeScript");
    expect(tsItem).toBeDefined();
    expect(tsItem?.percentage).toBe(45); // 9 / 20 = 45%

    const pythonItem = data.find((d) => d.language === "Python");
    expect(pythonItem?.percentage).toBe(30); // 6 / 20 = 30%
  });
});

describe("LanguageTreemap Component", () => {
  it("renders proportional treemap blocks and percentage badges", () => {
    render(<LanguageTreemap techStack={mockTechStack} />);

    expect(screen.getByText("Contribution Languages Treemap")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });
});
