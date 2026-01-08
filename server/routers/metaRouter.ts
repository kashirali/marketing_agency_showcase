import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { socialMediaAccounts, generatedPosts, postingLogs, InsertPostingLog } from "../../drizzle/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  postToFacebook,
  postImageToInstagram,
  postVideoToInstagram,
  postCarouselToInstagram,
  getFacebookInsights,
  getInstagramInsights,
  handleMetaError,
  validateAccessToken,
  exchangeCodeForToken,
  exchangeTokenForLongLived,
  getFacebookPages,
  getInstagramBusinessAccount,
} from "../services/metaService";

export const metaRouter = router({
  /**
   * Validate Meta credentials
   */
  validateCredentials: protectedProcedure.query(async () => {
    try {
      const accessToken = process.env.META_ACCESS_TOKEN;
      if (!accessToken) {
        return {
          success: false,
          message: "Meta access token not configured",
        };
      }

      // Mock validation for now to avoid blocking if token is dummy
      if (accessToken === "dummy_token" || accessToken.startsWith("dummy")) {
        return { success: true, message: "Mock credentials valid", isDemo: true };
      }

      const isValid = await validateAccessToken(accessToken);

      return {
        success: isValid,
        message: isValid ? "Credentials are valid" : "Invalid credentials",
        isDemo: false,
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
        accountId: z.number().optional(), // Database ID of the account
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

        // Get account
        let account;
        if (input.accountId) {
          const accounts = await db
            .select()
            .from(socialMediaAccounts)
            .where(and(eq(socialMediaAccounts.id, input.accountId), eq(socialMediaAccounts.userId, ctx.user.id)))
            .limit(1);
          account = accounts[0];
        } else {
          // Fallback to first active FB account
          const accounts = await db
            .select()
            .from(socialMediaAccounts)
            .where(and(eq(socialMediaAccounts.platform, "facebook"), eq(socialMediaAccounts.userId, ctx.user.id), eq(socialMediaAccounts.isActive, true)))
            .limit(1);
          account = accounts[0];
        }

        if (!account) throw new Error("Facebook account not found");

        // Post to Facebook
        const postRequest = {
          content: post[0].content,
          title: post[0].title,
          hashtags: post[0].hashtags ? JSON.parse(post[0].hashtags) : [],
          link: input.includeLink ? input.linkUrl : undefined,
          picture: post[0].mediaUrl || undefined,
        };

        const postResult = await postToFacebook(account.accessToken, account.accountId, postRequest as any);

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
          postId: input.postId,
          platform: "facebook",
          status: "success",
          errorMessage: `Posted to Facebook: ${postResult.url} `,
          attemptedAt: now,
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
          postId: input.postId,
          platform: "facebook",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
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
        accountId: z.number().optional(), // Database ID of the account
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

        // Get account
        let account;
        if (input.accountId) {
          const accounts = await db
            .select()
            .from(socialMediaAccounts)
            .where(and(eq(socialMediaAccounts.id, input.accountId), eq(socialMediaAccounts.userId, ctx.user.id)))
            .limit(1);
          account = accounts[0];
        } else {
          // Fallback to first active IG account
          const accounts = await db
            .select()
            .from(socialMediaAccounts)
            .where(and(eq(socialMediaAccounts.platform, "instagram"), eq(socialMediaAccounts.userId, ctx.user.id), eq(socialMediaAccounts.isActive, true)))
            .limit(1);
          account = accounts[0];
        }

        if (!account) throw new Error("Instagram account not found");

        // Post based on media type
        if (input.mediaType === "image") {
          if (!input.imageUrl) {
            throw new Error("Image URL required for image posts");
          }

          postResult = await postImageToInstagram(account.accessToken, account.accountId, {
            ...baseRequest,
            imageUrl: input.imageUrl,
          });
        } else if (input.mediaType === "video") {
          if (!input.videoUrl) {
            throw new Error("Video URL required for video posts");
          }

          postResult = await postVideoToInstagram(account.accessToken, account.accountId, {
            ...baseRequest,
            videoUrl: input.videoUrl,
          });
        } else if (input.mediaType === "carousel") {
          if (!input.carouselItems || input.carouselItems.length === 0) {
            throw new Error("Carousel items required for carousel posts");
          }

          postResult = await postCarouselToInstagram(account.accessToken, account.accountId, {
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
          postId: input.postId,
          platform: "instagram",
          status: "success",
          errorMessage: `Posted to Instagram: ${postResult.url} `,
          attemptedAt: now,
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
          postId: input.postId,
          platform: "instagram",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Failed to post to Instagram",
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
   * Handle Meta OAuth callback
   */
  handleCallback: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // App URL for redirect URI
      const appUrl = process.env.VITE_APP_URL || "http://localhost:3000";
      const redirectUri = `${appUrl}/agent-dashboard?provider=meta`;

      try {
        // 1. Exchange code for short-lived token
        const shortToken = await exchangeCodeForToken(input.code, redirectUri);

        // 2. Exchange for long-lived token
        const longToken = await exchangeTokenForLongLived(shortToken);

        // 3. Get Facebook Pages
        const pages = await getFacebookPages(longToken);

        const processedAccountIds: string[] = [];
        const results = [];

        for (const page of pages) {
          // 4. Skip pages without an access_token (though getFacebookPages filters them now)
          if (!page.access_token) {
            console.warn(`[Meta] Skipping page ${page.name} (${page.id}) - No access token provided`);
            continue;
          }

          // 5. Store Facebook Page
          const fbAccount = {
            userId: ctx.user.id,
            platform: "facebook" as const,
            accountName: page.name,
            accountId: page.id,
            accessToken: page.access_token,
            isActive: true,
            updatedAt: new Date(),
          };

          // Upsert FB page - using the new unique constraint target
          await db
            .insert(socialMediaAccounts)
            .values(fbAccount)
            .onConflictDoUpdate({
              target: [socialMediaAccounts.userId, socialMediaAccounts.platform, socialMediaAccounts.accountId],
              set: {
                accessToken: fbAccount.accessToken,
                accountName: fbAccount.accountName,
                isActive: true,
                updatedAt: fbAccount.updatedAt,
              }
            });

          processedAccountIds.push(page.id);
          results.push({ platform: "facebook", name: page.name });

          // 6. Check for Instagram account
          try {
            const igAccountData = await getInstagramBusinessAccount(page.id, page.access_token);
            if (igAccountData) {
              const igAccount = {
                userId: ctx.user.id,
                platform: "instagram" as const,
                accountName: igAccountData.username || igAccountData.name || `IG via ${page.name}`,
                accountId: igAccountData.id,
                accessToken: page.access_token, // IG Graph API uses the page access token
                isActive: true,
                updatedAt: new Date(),
              };

              // Upsert IG account
              await db
                .insert(socialMediaAccounts)
                .values(igAccount)
                .onConflictDoUpdate({
                  target: [socialMediaAccounts.userId, socialMediaAccounts.platform, socialMediaAccounts.accountId],
                  set: {
                    accessToken: igAccount.accessToken,
                    accountName: igAccount.accountName,
                    isActive: true,
                    updatedAt: igAccount.updatedAt,
                  }
                });

              processedAccountIds.push(igAccountData.id);
              results.push({ platform: "instagram", name: igAccount.accountName });
            }
          } catch (igError) {
            console.error(`[Meta] Error processing IG for page ${page.name}:`, igError);
          }
        }

        // 7. "Sync" logic: Deactivate/Remove accounts that were not in the current response
        // This handles cases where a user unchecks a page in the Meta dialog
        const existingMetaAccounts = await db
          .select({ accountId: socialMediaAccounts.accountId, platform: socialMediaAccounts.platform })
          .from(socialMediaAccounts)
          .where(
            and(
              eq(socialMediaAccounts.userId, ctx.user.id),
              or(eq(socialMediaAccounts.platform, "facebook"), eq(socialMediaAccounts.platform, "instagram"))
            )
          );

        for (const account of existingMetaAccounts) {
          if (!processedAccountIds.includes(account.accountId)) {
            console.log(`[Meta] Removing/Deactivating revoked account: ${account.platform} ${account.accountId}`);
            // We'll delete it to keep the database clean as requested ("it should be removed from our app as well")
            await db
              .delete(socialMediaAccounts)
              .where(
                and(
                  eq(socialMediaAccounts.userId, ctx.user.id),
                  eq(socialMediaAccounts.accountId, account.accountId),
                  eq(socialMediaAccounts.platform, account.platform)
                )
              );
          }
        }

        return { success: true, accounts: results };
      } catch (error) {
        console.error("Meta callback failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Meta integration failed",
        });
      }
    }),

  /**
   * Get Meta authentication URL
   */
  getAuthUrl: protectedProcedure.query(async () => {
    const clientId = process.env.META_CLIENT_ID;
    const appUrl = process.env.VITE_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/agent-dashboard?provider=meta`;
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish";

    if (!clientId) {
      console.warn("Meta Client ID not configured, returning mock URL");
      return { url: `${appUrl}/agent-dashboard?provider=meta&code=mock_code` };
    }

    return {
      url: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`
    };
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
        successful: facebookLogs.filter((l: any) => l.status === "success").length,
        failed: facebookLogs.filter((l: any) => l.status === "failed").length,
      },
      instagram: {
        totalAttempts: instagramLogs.length,
        successful: instagramLogs.filter((l: any) => l.status === "success").length,
        failed: instagramLogs.filter((l: any) => l.status === "failed").length,
      },
    };

    return stats;
  }),
});
