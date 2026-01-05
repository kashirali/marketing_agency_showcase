import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { socialMediaAccounts, generatedPosts, postingLogs, InsertPostingLog } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  generateLinkedInAuthUrl,
  exchangeCodeForToken,
  getUserProfile,
  postToLinkedIn,
  postToLinkedInOrganization,
  refreshAccessToken,
  isTokenExpired,
  handleLinkedInError,
} from "../services/linkedinService";

export const linkedinRouter = router({
  /**
   * Get LinkedIn authorization URL for OAuth flow
   */
  getAuthUrl: publicProcedure.query(() => {
    try {
      const authUrl = generateLinkedInAuthUrl();
      return { success: true, authUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate auth URL",
      };
    }
  }),

  /**
   * Handle OAuth callback and store LinkedIn credentials
   */
  handleCallback: publicProcedure
    .input(
      z.object({
        code: z.string(),
        userId: z.number(),
        accountName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Exchange code for access token
        const tokenResponse = await exchangeCodeForToken(input.code);

        // Get user profile to verify connection
        const userProfile = await getUserProfile(tokenResponse.access_token);

        // Store LinkedIn account in database
        const accountData = {
          userId: input.userId,
          platform: "linkedin" as const,
          accountName: input.accountName || userProfile.localizedFirstName || "LinkedIn Account",
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          accountId: userProfile.id,
          isActive: true,
        };

        const result = await db.insert(socialMediaAccounts).values([accountData]);

        return {
          success: true,
          message: "LinkedIn account connected successfully",
          accountId: (result as any).insertId,
        };
      } catch (error) {
        console.error("Error handling LinkedIn callback:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to connect LinkedIn account",
        };
      }
    }),

  /**
   * Get connected LinkedIn accounts for user
   */
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const accounts = await db
      .select()
      .from(socialMediaAccounts)
      .where(and(eq(socialMediaAccounts.userId, ctx.user.id), eq(socialMediaAccounts.platform, "linkedin")));

    return accounts;
  }),

  /**
   * Post content to LinkedIn
   */
  postContent: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        postId: z.number(),
        postToOrganization: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Get LinkedIn account
        const account = await db
          .select()
          .from(socialMediaAccounts)
          .where(
            and(
              eq(socialMediaAccounts.id, input.accountId),
              eq(socialMediaAccounts.userId, ctx.user.id),
              eq(socialMediaAccounts.platform, "linkedin")
            )
          )
          .limit(1);

        if (!account[0]) {
          throw new Error("LinkedIn account not found");
        }

        // Get generated post
        const post = await db
          .select()
          .from(generatedPosts)
          .where(eq(generatedPosts.id, input.postId))
          .limit(1);

        if (!post[0] || post[0].userId !== ctx.user.id) {
          throw new Error("Post not found or unauthorized");
        }

        // Refresh token if needed
        let accessToken = account[0].accessToken;
        if (account[0].refreshToken) {
          try {
            const tokenResponse = await refreshAccessToken(account[0].refreshToken);
            accessToken = tokenResponse.access_token;

            // Update token in database
            await db
              .update(socialMediaAccounts)
              .set({
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
              })
              .where(eq(socialMediaAccounts.id, input.accountId));
          } catch (error) {
            console.warn("Failed to refresh token, using existing token:", error);
          }
        }

        // Post to LinkedIn
        const postRequest = {
          content: post[0].content,
          title: post[0].title || undefined,
          hashtags: post[0].hashtags ? JSON.parse(post[0].hashtags) : [],
        };

        const postResult = input.postToOrganization
          ? await postToLinkedInOrganization(accessToken, postRequest as any)
          : await postToLinkedIn(accessToken, postRequest as any);

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
          platform: "linkedin",
          status: "success",
          message: `Posted to LinkedIn: ${postResult.url}`,
          attemptedAt: now,
          completedAt: now,
        };

        await db.insert(postingLogs).values([logEntry]);

        return {
          success: true,
          message: "Post published to LinkedIn",
          url: postResult.url,
          postId: postResult.id,
        };
      } catch (error) {
        console.error("Error posting to LinkedIn:", error);

        // Log failed posting
        const logEntry: InsertPostingLog = {
          userId: ctx.user.id,
          agentConfigId: 0,
          generatedPostId: input.postId,
          platform: "linkedin",
          status: "failed",
          message: "Failed to post to LinkedIn",
          errorDetails: error instanceof Error ? error.message : String(error),
          attemptedAt: new Date(),
        };

        await db.insert(postingLogs).values([logEntry]);

        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to post to LinkedIn",
        };
      }
    }),

  /**
   * Disconnect LinkedIn account
   */
  disconnectAccount: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Verify ownership
        const account = await db
          .select()
          .from(socialMediaAccounts)
          .where(eq(socialMediaAccounts.id, input.accountId))
          .limit(1);

        if (!account[0] || account[0].userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        // Delete account
        await db.delete(socialMediaAccounts).where(eq(socialMediaAccounts.id, input.accountId));

        return { success: true, message: "LinkedIn account disconnected" };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to disconnect account",
        };
      }
    }),

  /**
   * Get posting statistics for LinkedIn
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const logs = await db
      .select()
      .from(postingLogs)
      .where(and(eq(postingLogs.userId, ctx.user.id), eq(postingLogs.platform, "linkedin")));

    const stats = {
      totalAttempts: logs.length,
      successful: logs.filter((l) => l.status === "success").length,
      failed: logs.filter((l) => l.status === "failed").length,
      pending: logs.filter((l) => l.status === "pending").length,
    };

    return stats;
  }),
});
