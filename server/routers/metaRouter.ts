import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { socialMediaAccounts, generatedPosts, postingLogs, InsertPostingLog } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  postToFacebook,
  postImageToInstagram,
  postVideoToInstagram,
  postCarouselToInstagram,
  getFacebookInsights,
  getInstagramInsights,
  handleMetaError,
  validateAccessToken,
} from "../services/metaService";

export const metaRouter = router({
  /**
   * Validate Meta credentials
   */
  validateCredentials: publicProcedure.query(async () => {
    try {
      const accessToken = process.env.META_ACCESS_TOKEN;

      if (!accessToken) {
        return {
          success: false,
          error: "Meta access token not configured",
        };
      }

      const isValid = await validateAccessToken(accessToken);

      return {
        success: isValid,
        message: isValid ? "Credentials are valid" : "Invalid credentials",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to validate credentials",
      };
    }
  }),

  /**
   * Post to Facebook
   */
  postToFacebook: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        includeLink: z.boolean().default(false),
        linkUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Get generated post
        const post = await db
          .select()
          .from(generatedPosts)
          .where(eq(generatedPosts.id, input.postId))
          .limit(1);

        if (!post[0] || post[0].userId !== ctx.user.id) {
          throw new Error("Post not found or unauthorized");
        }

        // Post to Facebook
        const postRequest = {
          content: post[0].content,
          title: post[0].title,
          hashtags: post[0].hashtags ? JSON.parse(post[0].hashtags) : [],
          link: input.includeLink ? input.linkUrl : undefined,
        };

        const postResult = await postToFacebook(postRequest as any);

        if (!postResult.success) {
          throw new Error(postResult.message);
        }

        // Update post status
        const now = new Date();
        await db
          .update(generatedPosts)
          .set({
            status: "published",
            publishedAt: now,
            externalPostId: postResult.id,
          })
          .where(eq(generatedPosts.id, input.postId));

        // Log successful posting
        const logEntry: InsertPostingLog = {
          userId: ctx.user.id,
          agentConfigId: 0,
          generatedPostId: input.postId,
          platform: "facebook",
          status: "success",
          message: `Posted to Facebook: ${postResult.url}`,
          attemptedAt: now,
          completedAt: now,
        };

        await db.insert(postingLogs).values([logEntry]);

        return {
          success: true,
          message: "Post published to Facebook",
          url: postResult.url,
          postId: postResult.id,
        };
      } catch (error) {
        console.error("Error posting to Facebook:", error);

        // Log failed posting
        const logEntry: InsertPostingLog = {
          userId: ctx.user.id,
          agentConfigId: 0,
          generatedPostId: input.postId,
          platform: "facebook",
          status: "failed",
          message: "Failed to post to Facebook",
          errorDetails: error instanceof Error ? error.message : String(error),
          attemptedAt: new Date(),
        };

        await db.insert(postingLogs).values([logEntry]);

        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to post to Facebook",
        };
      }
    }),

  /**
   * Post to Instagram
   */
  postToInstagram: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        mediaType: z.enum(["image", "video", "carousel"]).default("image"),
        imageUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        carouselItems: z
          .array(
            z.object({
              imageUrl: z.string().optional(),
              videoUrl: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Get generated post
        const post = await db
          .select()
          .from(generatedPosts)
          .where(eq(generatedPosts.id, input.postId))
          .limit(1);

        if (!post[0] || post[0].userId !== ctx.user.id) {
          throw new Error("Post not found or unauthorized");
        }

        let postResult;

        const baseRequest = {
          content: post[0].content,
          hashtags: post[0].hashtags ? JSON.parse(post[0].hashtags) : [],
        };

        // Post based on media type
        if (input.mediaType === "image") {
          if (!input.imageUrl) {
            throw new Error("Image URL required for image posts");
          }

          postResult = await postImageToInstagram({
            ...baseRequest,
            imageUrl: input.imageUrl,
          });
        } else if (input.mediaType === "video") {
          if (!input.videoUrl) {
            throw new Error("Video URL required for video posts");
          }

          postResult = await postVideoToInstagram({
            ...baseRequest,
            videoUrl: input.videoUrl,
          });
        } else if (input.mediaType === "carousel") {
          if (!input.carouselItems || input.carouselItems.length === 0) {
            throw new Error("Carousel items required for carousel posts");
          }

          postResult = await postCarouselToInstagram({
            ...baseRequest,
            carouselItems: input.carouselItems,
          });
        } else {
          throw new Error("Invalid media type");
        }

        if (!postResult.success) {
          throw new Error(postResult.message);
        }

        // Update post status
        const now = new Date();
        await db
          .update(generatedPosts)
          .set({
            status: "published",
            publishedAt: now,
            externalPostId: postResult.id,
          })
          .where(eq(generatedPosts.id, input.postId));

        // Log successful posting
        const logEntry: InsertPostingLog = {
          userId: ctx.user.id,
          agentConfigId: 0,
          generatedPostId: input.postId,
          platform: "instagram",
          status: "success",
          message: `Posted to Instagram: ${postResult.url}`,
          attemptedAt: now,
          completedAt: now,
        };

        await db.insert(postingLogs).values([logEntry]);

        return {
          success: true,
          message: "Post published to Instagram",
          url: postResult.url,
          postId: postResult.id,
        };
      } catch (error) {
        console.error("Error posting to Instagram:", error);

        // Log failed posting
        const logEntry: InsertPostingLog = {
          userId: ctx.user.id,
          agentConfigId: 0,
          generatedPostId: input.postId,
          platform: "instagram",
          status: "failed",
          message: "Failed to post to Instagram",
          errorDetails: error instanceof Error ? error.message : String(error),
          attemptedAt: new Date(),
        };

        await db.insert(postingLogs).values([logEntry]);

        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to post to Instagram",
        };
      }
    }),

  /**
   * Get Facebook insights
   */
  getFacebookInsights: protectedProcedure.query(async () => {
    try {
      const insights = await getFacebookInsights();

      return {
        success: true,
        data: insights,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch insights",
      };
    }
  }),

  /**
   * Get Instagram insights
   */
  getInstagramInsights: protectedProcedure.query(async () => {
    try {
      const insights = await getInstagramInsights();

      return {
        success: true,
        data: insights,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch insights",
      };
    }
  }),

  /**
   * Get posting statistics for Meta platforms
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const facebookLogs = await db
      .select()
      .from(postingLogs)
      .where(and(eq(postingLogs.userId, ctx.user.id), eq(postingLogs.platform, "facebook")));

    const instagramLogs = await db
      .select()
      .from(postingLogs)
      .where(and(eq(postingLogs.userId, ctx.user.id), eq(postingLogs.platform, "instagram")));

    const stats = {
      facebook: {
        totalAttempts: facebookLogs.length,
        successful: facebookLogs.filter((l) => l.status === "success").length,
        failed: facebookLogs.filter((l) => l.status === "failed").length,
      },
      instagram: {
        totalAttempts: instagramLogs.length,
        successful: instagramLogs.filter((l) => l.status === "success").length,
        failed: instagramLogs.filter((l) => l.status === "failed").length,
      },
    };

    return stats;
  }),
});
