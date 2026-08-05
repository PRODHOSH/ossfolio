import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CommandPaletteProvider, useCommandPalette } from "@/context/CommandPaletteContext";
import { CommandPalette } from "../CommandPalette";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

function TestConsumer() {
  const { open } = useCommandPalette();
  return (
    <button type="button" onClick={open} data-testid="open-btn">
      Open Palette
    </button>
  );
}

describe("CommandPalette Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is hidden by default and opens when triggered via context", () => {
    render(
      <CommandPaletteProvider>
        <TestConsumer />
        <CommandPalette />
      </CommandPaletteProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByTestId("open-btn"));

    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(screen.getByPlaceholderText("Type a command or search contributors...")).not.toBeNull();
  });

  it("filters navigation commands as user types query", () => {
    render(
      <CommandPaletteProvider>
        <TestConsumer />
        <CommandPalette />
      </CommandPaletteProvider>,
    );

    fireEvent.click(screen.getByTestId("open-btn"));

    const input = screen.getByPlaceholderText("Type a command or search contributors...");
    fireEvent.change(input, { target: { value: "Explore" } });

    expect(screen.getByText("Explore Contributors")).not.toBeNull();
    expect(screen.queryByText("Profile Settings")).toBeNull();
  });
});
