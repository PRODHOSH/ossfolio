import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button, buttonVariants } from "../button";
import { StatusPill, statusPillVariants } from "../status-pill";
import { ContributorBadge, contributorBadgeVariants } from "../contributor-badge";

describe("Standardized CVA Component Recipe Schemas", () => {
  describe("Button variants", () => {
    it("renders default primary green CTA button variant", () => {
      const classes = buttonVariants({ variant: "default" });
      expect(classes).toContain("bg-primary");
      expect(classes).toContain("text-on-primary");
      expect(classes).toContain("hover:bg-primary-deep");
    });

    it("renders secondary outline button variant", () => {
      const classes = buttonVariants({ variant: "outline" });
      expect(classes).toContain("border-hairline-strong");
      expect(classes).toContain("bg-canvas");
      expect(classes).toContain("text-ink");
    });

    it("renders on-dark button variant", () => {
      const classes = buttonVariants({ variant: "on-dark" });
      expect(classes).toContain("bg-canvas-night");
      expect(classes).toContain("text-on-dark");
    });

    it("renders link button variant", () => {
      const classes = buttonVariants({ variant: "link" });
      expect(classes).toContain("bg-transparent");
      expect(classes).toContain("hover:underline");
    });
  });

  describe("StatusPill variants", () => {
    it("renders green status pill variant", () => {
      const classes = statusPillVariants({ variant: "green" });
      expect(classes).toContain("bg-primary");
      expect(classes).toContain("text-on-primary");
    });

    it("renders soft neutral status pill variant", () => {
      const classes = statusPillVariants({ variant: "soft" });
      expect(classes).toContain("bg-canvas-soft");
      expect(classes).toContain("text-ink");
    });

    it("renders merged status pill variant", () => {
      const classes = statusPillVariants({ variant: "merged" });
      expect(classes).toContain("bg-primary/15");
      expect(classes).toContain("text-primary");
    });

    it("renders open status pill variant", () => {
      const classes = statusPillVariants({ variant: "open" });
      expect(classes).toContain("bg-accent-yellow/20");
    });

    it("renders closed status pill variant", () => {
      const classes = statusPillVariants({ variant: "closed" });
      expect(classes).toContain("bg-accent-tomato/15");
      expect(classes).toContain("text-accent-tomato");
    });
  });

  describe("ContributorBadge variants", () => {
    it("renders bronze contributor tier badge", () => {
      const classes = contributorBadgeVariants({ tier: "bronze" });
      expect(classes).toContain("text-[#cd7f32]");
      expect(classes).toContain("border-[#cd7f32]");
    });

    it("renders diamond contributor tier badge", () => {
      const classes = contributorBadgeVariants({ tier: "diamond" });
      expect(classes).toContain("text-[#00e1d9]");
      expect(classes).toContain("border-[#00e1d9]");
    });

    it("renders GSoC program badge gradient variant", () => {
      const classes = contributorBadgeVariants({ program: "gsoc" });
      expect(classes).toContain("bg-gradient-to-r");
      expect(classes).toContain("from-[#34A853]");
      expect(classes).toContain("to-[#4285F4]");
    });

    it("renders Hacktoberfest program badge gradient variant", () => {
      const classes = contributorBadgeVariants({ program: "hacktoberfest" });
      expect(classes).toContain("from-[#FF2201]");
      expect(classes).toContain("to-[#FF007A]");
    });
  });
});
