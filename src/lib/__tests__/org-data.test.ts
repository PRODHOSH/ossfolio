import { describe, it, expect } from "vitest";
import { calculateTeamScore, type OrgMember } from "../org-data";

describe("org-data module", () => {
  describe("calculateTeamScore", () => {
    it("should return default base score when members array is empty", () => {
      const score = calculateTeamScore([], 0);
      expect(score).toBe(60);
    });

    it("should calculate correct team score based on average member score and star bonus", () => {
      const members: OrgMember[] = [
        { login: "user1", avatarUrl: "", role: "owner", score: 90, contributions: 100 },
        { login: "user2", avatarUrl: "", role: "member", score: 80, contributions: 50 },
      ];
      // Avg score = 85. Star bonus = Math.min(25, 200/50 = 4) = 4 -> 89
      const score = calculateTeamScore(members, 200);
      expect(score).toBe(89);
    });

    it("should clamp team score to maximum of 99", () => {
      const members: OrgMember[] = [
        { login: "user1", avatarUrl: "", role: "owner", score: 98, contributions: 500 },
      ];
      const score = calculateTeamScore(members, 10000);
      expect(score).toBe(99);
    });
  });
});
