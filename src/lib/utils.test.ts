import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("should merge tailwind classes properly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("should handle conditional classes", () => {
    expect(cn("bg-red-500", true && "text-white", false && "p-4")).toBe(
      "bg-red-500 text-white"
    );
  });

  it("should resolve tailwind conflicts", () => {
    expect(cn("p-4 p-8")).toBe("p-8");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("should handle arrays and falsy values", () => {
    expect(cn("base-class", ["array-class"], null, undefined, 0, false, "last-class")).toBe(
      "base-class array-class last-class"
    );
  });
});
