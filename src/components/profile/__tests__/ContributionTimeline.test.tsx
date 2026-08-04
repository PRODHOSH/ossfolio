import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContributionTimeline } from "../ContributionTimeline";
import type { MergedPR, BadgeItem, Org } from "@/types";

const mockMergedPRs: MergedPR[] = [
  {
    title: "Fix bug in authentication flow",
    url: "https://github.com/ossfolio/ossfolio/pull/42",
    repoName: "ossfolio/ossfolio",
    mergedAt: "2026-05-15T12:00:00Z",
    state: "merged",
  },
  {
    title: "Add dark mode toggle",
    url: "https://github.com/ossfolio/ossfolio/pull/10",
    repoName: "ossfolio/ossfolio",
    mergedAt: "2026-01-10T12:00:00Z",
    state: "merged",
  },
];

const mockRepos = [
  {
    name: "react-cool-library",
    description: "A super cool React library",
    stars: 150,
    language: "TypeScript",
    url: "https://github.com/octocat/react-cool-library",
    pushed_at: "2026-04-01T12:00:00Z",
  },
];

const mockOrgs: Org[] = [
  {
    login: "vercel",
    name: "Vercel",
    avatarUrl: "https://github.com/vercel.png",
    url: "https://github.com/vercel",
  },
];

const mockBadges: BadgeItem[] = [
  {
    program: "Hacktoberfest",
    years: [2025],
  },
];

describe("ContributionTimeline", () => {
  it("renders timeline title and all activity events by default", () => {
    render(
      <ContributionTimeline
        mergedPRs={mockMergedPRs}
        repos={mockRepos}
        orgs={mockOrgs}
        badges={mockBadges}
      />,
    );

    expect(screen.getByText("Contribution Timeline")).toBeInTheDocument();
    expect(screen.getByText("Fix bug in authentication flow")).toBeInTheDocument();
    expect(screen.getByText(/Created \/ Contributed to react-cool-library/)).toBeInTheDocument();
    expect(screen.getByText(/Joined Organization: Vercel/)).toBeInTheDocument();
    expect(screen.getByText(/Earned Hacktoberfest Badge \(2025\)/)).toBeInTheDocument();
  });

  it("filters events when selecting category tabs", () => {
    render(
      <ContributionTimeline
        mergedPRs={mockMergedPRs}
        repos={mockRepos}
        orgs={mockOrgs}
        badges={mockBadges}
      />,
    );

    // Click 'Pull Requests' filter tab
    const prsTab = screen.getByRole("tab", { name: /Pull Requests/i });
    fireEvent.click(prsTab);

    expect(screen.getByText("Fix bug in authentication flow")).toBeInTheDocument();
    expect(
      screen.queryByText(/Joined Organization: Vercel/),
    ).not.toBeInTheDocument();

    // Click 'Organizations' filter tab
    const orgsTab = screen.getByRole("tab", { name: /Organizations/i });
    fireEvent.click(orgsTab);

    expect(screen.getByText(/Joined Organization: Vercel/)).toBeInTheDocument();
    expect(
      screen.queryByText("Fix bug in authentication flow"),
    ).not.toBeInTheDocument();
  });

  it("filters events by search query", () => {
    render(
      <ContributionTimeline
        mergedPRs={mockMergedPRs}
        repos={mockRepos}
        orgs={mockOrgs}
        badges={mockBadges}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search timeline...");
    fireEvent.change(searchInput, { target: { value: "dark mode" } });

    expect(screen.getByText("Add dark mode toggle")).toBeInTheDocument();
    expect(
      screen.queryByText("Fix bug in authentication flow"),
    ).not.toBeInTheDocument();
  });

  it("shows empty state message when no events match the filter", () => {
    render(
      <ContributionTimeline
        mergedPRs={mockMergedPRs}
        repos={mockRepos}
        orgs={mockOrgs}
        badges={mockBadges}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search timeline...");
    fireEvent.change(searchInput, { target: { value: "nonexistent query xyz" } });

    expect(
      screen.getByText("No events match the selected criteria"),
    ).toBeInTheDocument();
  });
});
