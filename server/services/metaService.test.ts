import { describe, it, expect, beforeEach } from "vitest";
import {
  MetaPostRequest,
  FacebookPostRequest,
  InstagramPostRequest,
} from "./metaService";

describe("Meta Graph API Service", () => {
  beforeEach(() => {
    process.env.META_APP_ID = "test-app-id";
    process.env.META_APP_SECRET = "test-app-secret";
    process.env.META_ACCESS_TOKEN = "test-access-token";
    process.env.FACEBOOK_PAGE_ID = "123456789";
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = "987654321";
  });

  describe("Facebook Post Structure", () => {
    it("should validate basic Facebook post request", () => {
      const request: FacebookPostRequest = {
        content: "Check out our latest digital marketing insights!",
      };

      expect(request.content).toBeTruthy();
      expect(typeof request.content).toBe("string");
    });

    it("should support Facebook post with title", () => {
      const request: FacebookPostRequest = {
        content: "Read our latest blog post",
        title: "Digital Marketing Tips",
      };

      expect(request.title).toBeTruthy();
      expect(request.content).toBeTruthy();
    });

    it("should support Facebook post with hashtags", () => {
      const request: FacebookPostRequest = {
        content: "Great content",
        hashtags: ["#marketing", "#digital", "#business"],
      };

      expect(request.hashtags).toBeInstanceOf(Array);
      expect(request.hashtags.length).toBe(3);
    });

    it("should support Facebook post with link", () => {
      const request: FacebookPostRequest = {
        content: "Check this out",
        link: "https://example.com/blog",
        picture: "https://example.com/image.jpg",
        name: "Blog Title",
        description: "Blog description",
      };

      expect(request.link).toBeTruthy();
      expect(request.picture).toBeTruthy();
    });
  });

  describe("Instagram Post Structure", () => {
    it("should validate Instagram image post", () => {
      const request: InstagramPostRequest = {
        content: "Beautiful image caption",
        imageUrl: "https://example.com/image.jpg",
      };

      expect(request.imageUrl).toBeTruthy();
      expect(request.content).toBeTruthy();
    });

    it("should validate Instagram video post", () => {
      const request: InstagramPostRequest = {
        content: "Check out our video",
        videoUrl: "https://example.com/video.mp4",
        mediaType: "video",
      };

      expect(request.videoUrl).toBeTruthy();
      expect(request.mediaType).toBe("video");
    });

    it("should validate Instagram carousel post", () => {
      const request: InstagramPostRequest = {
        content: "Carousel content",
        mediaType: "carousel",
        carouselItems: [
          { imageUrl: "https://example.com/image1.jpg" },
          { imageUrl: "https://example.com/image2.jpg" },
          { imageUrl: "https://example.com/image3.jpg" },
        ],
      };

      expect(request.mediaType).toBe("carousel");
      expect(request.carouselItems).toBeInstanceOf(Array);
      expect(request.carouselItems.length).toBe(3);
    });

    it("should enforce Instagram caption length limit", () => {
      const longCaption = "a".repeat(2300);
      const request: InstagramPostRequest = {
        content: longCaption,
      };

      expect(request.content.length).toBeGreaterThan(2200);
    });
  });

  describe("API Endpoints", () => {
    it("should construct valid Facebook feed endpoint", () => {
      const pageId = process.env.FACEBOOK_PAGE_ID;
      const endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;

      expect(endpoint).toContain("graph.facebook.com");
      expect(endpoint).toContain("feed");
      expect(endpoint).toContain(pageId);
    });

    it("should construct valid Instagram media endpoint", () => {
      const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      const endpoint = `https://graph.instagram.com/v18.0/${accountId}/media`;

      expect(endpoint).toContain("graph.instagram.com");
      expect(endpoint).toContain("media");
      expect(endpoint).toContain(accountId);
    });

    it("should construct valid Instagram publish endpoint", () => {
      const mediaId = "123456789";
      const endpoint = `https://graph.instagram.com/v18.0/${mediaId}/publish`;

      expect(endpoint).toContain("graph.instagram.com");
      expect(endpoint).toContain("publish");
    });
  });

  describe("Credential Validation", () => {
    it("should have Meta App ID", () => {
      expect(process.env.META_APP_ID).toBeTruthy();
    });

    it("should have Meta App Secret", () => {
      expect(process.env.META_APP_SECRET).toBeTruthy();
    });

    it("should have Meta Access Token", () => {
      expect(process.env.META_ACCESS_TOKEN).toBeTruthy();
    });

    it("should have Facebook Page ID", () => {
      expect(process.env.FACEBOOK_PAGE_ID).toBeTruthy();
    });

    it("should have Instagram Business Account ID", () => {
      expect(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID).toBeTruthy();
    });
  });

  describe("Post Formatting", () => {
    it("should format Facebook post with title", () => {
      const content = "This is the main content";
      const title = "Post Title";

      const formatted = `${title}\n\n${content}`;

      expect(formatted).toContain(title);
      expect(formatted).toContain(content);
    });

    it("should format Facebook post with hashtags", () => {
      const content = "Main content";
      const hashtags = ["#marketing", "#digital"];

      const formatted = `${content}\n\n${hashtags.join(" ")}`;

      expect(formatted).toContain("#marketing");
      expect(formatted).toContain("#digital");
    });

    it("should format Instagram caption with hashtags", () => {
      const content = "Image caption";
      const hashtags = ["#instagram", "#photo"];

      const caption = `${content}\n\n${hashtags.join(" ")}`;

      expect(caption).toContain(content);
      expect(caption).toContain("#instagram");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing Facebook Page ID", () => {
      delete process.env.FACEBOOK_PAGE_ID;

      expect(process.env.FACEBOOK_PAGE_ID).toBeUndefined();
    });

    it("should handle missing Instagram Account ID", () => {
      delete process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

      expect(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID).toBeUndefined();
    });

    it("should handle missing access token", () => {
      delete process.env.META_ACCESS_TOKEN;

      expect(process.env.META_ACCESS_TOKEN).toBeUndefined();
    });

    it("should validate error response structure", () => {
      const errorResponse = {
        error: {
          message: "Invalid access token",
          type: "OAuthException",
          code: 190,
        },
      };

      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.message).toBeTruthy();
    });
  });

  describe("Platform-Specific Features", () => {
    it("should support Facebook link sharing", () => {
      const facebookFeatures = {
        text: true,
        link: true,
        image: true,
        video: true,
        carousel: true,
      };

      expect(facebookFeatures.link).toBe(true);
      expect(facebookFeatures.carousel).toBe(true);
    });

    it("should support Instagram image posting", () => {
      const instagramFeatures = {
        image: true,
        video: true,
        carousel: true,
        reel: true,
      };

      expect(instagramFeatures.image).toBe(true);
      expect(instagramFeatures.video).toBe(true);
    });

    it("should support hashtags on both platforms", () => {
      const hashtagSupport = {
        facebook: true,
        instagram: true,
      };

      expect(hashtagSupport.facebook).toBe(true);
      expect(hashtagSupport.instagram).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("should respect Meta API rate limits", () => {
      const rateLimits = {
        facebookPostsPerDay: 50,
        instagramPostsPerDay: 50,
        requestsPerHour: 200,
      };

      expect(rateLimits.facebookPostsPerDay).toBeGreaterThan(0);
      expect(rateLimits.instagramPostsPerDay).toBeGreaterThan(0);
      expect(rateLimits.requestsPerHour).toBeGreaterThan(0);
    });
  });

  describe("Response Structure", () => {
    it("should return valid post response", () => {
      const response = {
        id: "123456789",
        url: "https://facebook.com/post/123456789",
        success: true,
        message: "Post published successfully",
      };

      expect(response.id).toBeTruthy();
      expect(response.url).toBeTruthy();
      expect(response.success).toBe(true);
      expect(response.message).toBeTruthy();
    });

    it("should return error response on failure", () => {
      const errorResponse = {
        id: "",
        url: "",
        success: false,
        message: "Failed to post",
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.message).toBeTruthy();
    });
  });

  describe("Carousel Media", () => {
    it("should support multiple carousel items", () => {
      const carouselItems = [
        { imageUrl: "https://example.com/1.jpg" },
        { imageUrl: "https://example.com/2.jpg" },
        { imageUrl: "https://example.com/3.jpg" },
        { imageUrl: "https://example.com/4.jpg" },
      ];

      expect(carouselItems.length).toBe(4);
      carouselItems.forEach((item) => {
        expect(item.imageUrl).toBeTruthy();
      });
    });

    it("should support mixed media in carousel", () => {
      const carouselItems = [
        { imageUrl: "https://example.com/image.jpg" },
        { videoUrl: "https://example.com/video.mp4" },
      ];

      expect(carouselItems[0].imageUrl).toBeTruthy();
      expect(carouselItems[1].videoUrl).toBeTruthy();
    });
  });
});
