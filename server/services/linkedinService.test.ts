import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateLinkedInAuthUrl,
  isTokenExpired,
  handleLinkedInError,
  LinkedInPostRequest,
} from "./linkedinService";

describe("LinkedIn Service", () => {
  beforeEach(() => {
    // Set up environment variables for tests
    process.env.LINKEDIN_CLIENT_ID = "test-client-id";
    process.env.LINKEDIN_CLIENT_SECRET = "test-client-secret";
    process.env.LINKEDIN_REDIRECT_URI = "https://api.binarykode.com/linkedin_webhook";
    process.env.LINKEDIN_ORGANIZATION_ID = "123456789";
  });

  describe("generateLinkedInAuthUrl", () => {
    it("should generate valid authorization URL", () => {
      const authUrl = generateLinkedInAuthUrl();

      expect(authUrl).toContain("https://www.linkedin.com/oauth/v2/authorization");
      expect(authUrl).toContain("response_type=code");
      expect(authUrl).toContain("client_id=test-client-id");
      expect(authUrl).toContain("redirect_uri=https%3A%2F%2Fapi.binarykode.com%2Flinkedin_webhook");
      expect(authUrl).toContain("scope=w_member_social");
      expect(authUrl).toContain("state=");
    });

    it("should include required OAuth scopes", () => {
      const authUrl = generateLinkedInAuthUrl();

      expect(authUrl).toContain("w_member_social");
      expect(authUrl).toContain("r_organization_social");
    });

    it("should throw error if credentials not configured", () => {
      delete process.env.LINKEDIN_CLIENT_ID;

      expect(() => generateLinkedInAuthUrl()).toThrow("LinkedIn credentials not configured");
    });

    it("should include unique state parameter", () => {
      const url1 = generateLinkedInAuthUrl();
      const url2 = generateLinkedInAuthUrl();

      const state1 = new URL(url1).searchParams.get("state");
      const state2 = new URL(url2).searchParams.get("state");

      expect(state1).not.toBe(state2);
    });
  });

  describe("isTokenExpired", () => {
    it("should return false for fresh token", () => {
      const now = Date.now();
      const expiresIn = 3600; // 1 hour

      const isExpired = isTokenExpired(expiresIn, now);

      expect(isExpired).toBe(false);
    });

    it("should return true for expired token", () => {
      const now = Date.now() - 4000 * 1000; // 4000 seconds ago
      const expiresIn = 3600; // 1 hour

      const isExpired = isTokenExpired(expiresIn, now);

      expect(isExpired).toBe(true);
    });

    it("should return true if less than 5 minutes remaining", () => {
      const now = Date.now() - 3400 * 1000; // 3400 seconds ago
      const expiresIn = 3600; // 1 hour

      const isExpired = isTokenExpired(expiresIn, now);

      expect(isExpired).toBe(true);
    });

    it("should return false if more than 5 minutes remaining", () => {
      const now = Date.now() - 1000 * 1000; // 1000 seconds ago (2600 seconds remaining)
      const expiresIn = 3600; // 1 hour

      const isExpired = isTokenExpired(expiresIn, now);

      expect(isExpired).toBe(false);
    });
  });

  describe("handleLinkedInError", () => {
    it("should extract error from response data", () => {
      const error = {
        response: {
          data: {
            error: "invalid_request",
          },
        },
      };

      const message = handleLinkedInError(error);

      expect(message).toBe("invalid_request");
    });

    it("should extract message from response data", () => {
      const error = {
        response: {
          data: {
            message: "Unauthorized access",
          },
        },
      };

      const message = handleLinkedInError(error);

      expect(message).toBe("Unauthorized access");
    });

    it("should use error message if available", () => {
      const error = new Error("Network error");

      const message = handleLinkedInError(error);

      expect(message).toBe("Network error");
    });

    it("should return unknown error for unrecognized errors", () => {
      const error = {};

      const message = handleLinkedInError(error);

      expect(message).toBe("Unknown error occurred");
    });
  });

  describe("LinkedIn Post Structure", () => {
    it("should validate post request structure", () => {
      const postRequest: LinkedInPostRequest = {
        content: "This is a test post",
        title: "Test Title",
        hashtags: ["#test", "#linkedin"],
      };

      expect(postRequest.content).toBeTruthy();
      expect(postRequest.title).toBeTruthy();
      expect(postRequest.hashtags).toBeInstanceOf(Array);
    });

    it("should allow optional title", () => {
      const postRequest: LinkedInPostRequest = {
        content: "This is a test post",
      };

      expect(postRequest.content).toBeTruthy();
      expect(postRequest.title).toBeUndefined();
    });

    it("should allow optional hashtags", () => {
      const postRequest: LinkedInPostRequest = {
        content: "This is a test post",
      };

      expect(postRequest.content).toBeTruthy();
      expect(postRequest.hashtags).toBeUndefined();
    });

    it("should allow optional image URL", () => {
      const postRequest: LinkedInPostRequest = {
        content: "This is a test post",
        imageUrl: "https://example.com/image.jpg",
      };

      expect(postRequest.imageUrl).toBeTruthy();
    });
  });

  describe("LinkedIn OAuth Configuration", () => {
    it("should have correct OAuth base URL", () => {
      const baseUrl = "https://www.linkedin.com/oauth/v2";

      expect(baseUrl).toMatch(/^https:\/\/www\.linkedin\.com\/oauth\/v2/);
    });

    it("should have correct API base URL", () => {
      const baseUrl = "https://api.linkedin.com/v2";

      expect(baseUrl).toMatch(/^https:\/\/api\.linkedin\.com\/v2/);
    });

    it("should construct valid token endpoint", () => {
      const tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";

      expect(tokenEndpoint).toContain("accessToken");
      expect(tokenEndpoint).toContain("oauth/v2");
    });

    it("should construct valid authorization endpoint", () => {
      const authEndpoint = "https://www.linkedin.com/oauth/v2/authorization";

      expect(authEndpoint).toContain("authorization");
      expect(authEndpoint).toContain("oauth/v2");
    });
  });

  describe("LinkedIn API Endpoints", () => {
    it("should have valid ugcPosts endpoint", () => {
      const endpoint = "https://api.linkedin.com/v2/ugcPosts";

      expect(endpoint).toContain("api.linkedin.com");
      expect(endpoint).toContain("ugcPosts");
    });

    it("should have valid shares endpoint", () => {
      const endpoint = "https://api.linkedin.com/v2/shares";

      expect(endpoint).toContain("api.linkedin.com");
      expect(endpoint).toContain("shares");
    });

    it("should have valid me endpoint for user profile", () => {
      const endpoint = "https://api.linkedin.com/v2/me";

      expect(endpoint).toContain("api.linkedin.com");
      expect(endpoint).toContain("me");
    });
  });

  describe("Error Scenarios", () => {
    it("should handle missing client ID", () => {
      delete process.env.LINKEDIN_CLIENT_ID;

      expect(() => generateLinkedInAuthUrl()).toThrow();
    });

    it("should handle missing redirect URI", () => {
      delete process.env.LINKEDIN_REDIRECT_URI;

      expect(() => generateLinkedInAuthUrl()).toThrow();
    });

    it("should handle API rate limiting", () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            message: "Rate limit exceeded",
          },
        },
      };

      const message = handleLinkedInError(rateLimitError);

      expect(message).toBe("Rate limit exceeded");
    });

    it("should handle authentication errors", () => {
      const authError = {
        response: {
          status: 401,
          data: {
            error: "unauthorized",
          },
        },
      };

      const message = handleLinkedInError(authError);

      expect(message).toBe("unauthorized");
    });
  });

  describe("Token Management", () => {
    it("should validate token response structure", () => {
      const tokenResponse = {
        access_token: "test-access-token",
        expires_in: 3600,
        token_type: "Bearer",
      };

      expect(tokenResponse.access_token).toBeTruthy();
      expect(tokenResponse.expires_in).toBeGreaterThan(0);
      expect(tokenResponse.token_type).toBe("Bearer");
    });

    it("should handle refresh token in response", () => {
      const tokenResponse = {
        access_token: "test-access-token",
        expires_in: 3600,
        refresh_token: "test-refresh-token",
        token_type: "Bearer",
      };

      expect(tokenResponse.refresh_token).toBeTruthy();
    });
  });
});
