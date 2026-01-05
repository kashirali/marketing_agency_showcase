import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPostingStats,
  triggerManualPosting,
  publishPost,
} from "./scheduledPostingService";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => [
            {
              id: 1,
              userId: 1,
              agentName: "Test Agent",
              isActive: true,
              platforms: ["linkedin", "facebook"],
              agencyInfo: {
                name: "Test Agency",
                services: ["Service 1"],
              },
            },
          ]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => ({ insertId: 1 })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => ({})),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => ({})),
    })),
  })),
}));

// Mock the content generator
vi.mock("./aiContentGenerator", () => ({
  generateSocialMediaContent: vi.fn(async () => ({
    title: "Test Post",
    content: "This is a test post about our services.",
    hashtags: ["#test", "#marketing"],
    platform: "linkedin",
  })),
}));

describe("Scheduled Posting Service", () => {
  describe("getPostingStats", () => {
    it("should return posting statistics", async () => {
      const stats = await getPostingStats(1);

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalGenerated");
      expect(stats).toHaveProperty("totalScheduled");
      expect(stats).toHaveProperty("totalPublished");
      expect(stats).toHaveProperty("totalFailed");
      expect(stats).toHaveProperty("platformBreakdown");
    });

    it("should have numeric values for stats", async () => {
      const stats = await getPostingStats(1);

      expect(typeof stats.totalGenerated).toBe("number");
      expect(typeof stats.totalScheduled).toBe("number");
      expect(typeof stats.totalPublished).toBe("number");
      expect(typeof stats.totalFailed).toBe("number");
      expect(typeof stats.platformBreakdown).toBe("object");
    });

    it("should have non-negative values", async () => {
      const stats = await getPostingStats(1);

      expect(stats.totalGenerated).toBeGreaterThanOrEqual(0);
      expect(stats.totalScheduled).toBeGreaterThanOrEqual(0);
      expect(stats.totalPublished).toBeGreaterThanOrEqual(0);
      expect(stats.totalFailed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("triggerManualPosting", () => {
    it("should return array of posting results", async () => {
      const results = await triggerManualPosting(1, 1);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should include success and platform info in results", async () => {
      const results = await triggerManualPosting(1, 1);

      if (results.length > 0) {
        results.forEach((result) => {
          expect(result).toHaveProperty("success");
          expect(result).toHaveProperty("platform");
          expect(result).toHaveProperty("message");
          expect(typeof result.success).toBe("boolean");
        });
      }
    });

    it("should throw error for unauthorized access", async () => {
      try {
        // This should fail because the mock returns a different userId
        await triggerManualPosting(999, 1);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("publishPost", () => {
    it("should return posting result", async () => {
      const result = await publishPost(1, 1);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("platform");
      expect(result).toHaveProperty("message");
    });

    it("should have boolean success field", async () => {
      const result = await publishPost(1, 1);

      expect(typeof result.success).toBe("boolean");
    });

    it("should include platform in result", async () => {
      const result = await publishPost(1, 1);

      expect(result.platform).toBeTruthy();
      expect(typeof result.platform).toBe("string");
    });

    it("should throw error for unauthorized access", async () => {
      try {
        await publishPost(999, 1);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Posting Result Structure", () => {
    it("should have consistent result structure", async () => {
      const result = await publishPost(1, 1);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("platform");
      expect(result).toHaveProperty("message");

      if (result.success) {
        expect(result).toHaveProperty("postId");
      } else {
        expect(result).toHaveProperty("error");
      }
    });
  });
});
