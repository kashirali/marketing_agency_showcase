import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateSocialMediaContent, generateContentVariations } from "../services/aiContentGenerator";
import { generateImage } from "../services/imageService";
import { getDb } from "../db";
import { aiAgentConfig, generatedPosts, InsertGeneratedPost, socialMediaAccounts } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { publishPost } from "../services/scheduledPostingService";

export const aiAgentRouter = router({
  /**
   * Initialize AI agent configuration for a user
   */
  initializeAgent: protectedProcedure
    .input(
      z.object({
        agentName: z.string().optional(),
        platforms: z.array(z.enum(["linkedin", "facebook", "twitter", "instagram"])),
        postingTime: z.string(), // HH:mm format
        timezone: z.string().default("UTC"),
        contentStyle: z.string().optional(),
        agencyInfo: z.object({
          name: z.string(),
          services: z.array(z.string()),
          description: z.string().optional(),
          achievements: z.array(z.string()).optional(),
        }),
        selectedAccounts: z.record(z.string(), z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const schedule = {
        time: input.postingTime,
        timezone: input.timezone,
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      };

      const result = await db.insert(aiAgentConfig).values({
        userId: ctx.user.id,
        agentName: input.agentName || "BinaryKode Daily Poster",
        isActive: true,
        postingSchedule: JSON.stringify(schedule),
        platforms: JSON.stringify(input.platforms),
        contentStyle: input.contentStyle,
        agencyInfo: JSON.stringify(input.agencyInfo),
        selectedAccounts: JSON.stringify(input.selectedAccounts || {}),
        maxPostsPerDay: 1,
        includeImages: true,
        includeHashtags: true,
        nextRunAt: calculateNextRunTime(input.postingTime, input.timezone),
      }).returning({ id: aiAgentConfig.id });

      return { success: true, agentId: result[0].id };
    }),

  /**
   * Get all agent configurations for a user
   */
  getConfigs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const result = await db
      .select()
      .from(aiAgentConfig)
      .where(eq(aiAgentConfig.userId, ctx.user.id))
      .orderBy(desc(aiAgentConfig.createdAt));

    return result.map((config: any) => ({
      ...config,
      platforms: JSON.parse(config.platforms || "[]"),
      postingSchedule: JSON.parse(config.postingSchedule || "{}"),
      agencyInfo: JSON.parse(config.agencyInfo || "{}"),
      selectedAccounts: JSON.parse(config.selectedAccounts || "{}"),
    }));
  }),

  /**
   * Get current agent configuration
   */
  getConfig: protectedProcedure
    .input(z.object({ agentId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      let query = db
        .select()
        .from(aiAgentConfig)
        .where(eq(aiAgentConfig.userId, ctx.user.id));

      if (input.agentId) {
        query = db.select().from(aiAgentConfig).where(
          and(
            eq(aiAgentConfig.userId, ctx.user.id),
            eq(aiAgentConfig.id, input.agentId)
          )
        ) as any;
      }

      const result = await query.limit(1);

      if (result.length === 0) {
        return null;
      }

      const config = result[0];

      // Deserialize JSON fields
      return {
        ...config,
        platforms: JSON.parse(config.platforms || "[]"),
        postingSchedule: JSON.parse(config.postingSchedule || "{}"),
        agencyInfo: JSON.parse(config.agencyInfo || "{}"),
        selectedAccounts: JSON.parse(config.selectedAccounts || "{}"),
      };
    }),

  /**
   * Update agent configuration
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        isActive: z.boolean().optional(),
        agentName: z.string().optional(),
        platforms: z.array(z.enum(["linkedin", "facebook", "twitter", "instagram"])).optional(),
        postingTime: z.string().optional(),
        timezone: z.string().optional(),
        contentStyle: z.string().optional(),
        maxPostsPerDay: z.number().optional(),
        includeImages: z.boolean().optional(),
        includeHashtags: z.boolean().optional(),
        agencyInfo: z.object({
          name: z.string(),
          services: z.array(z.string()),
          description: z.string().optional(),
          achievements: z.array(z.string()).optional(),
        }).optional(),
        selectedAccounts: z.record(z.string(), z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const updateData: any = {};
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.agentName) updateData.agentName = input.agentName;
      if (input.platforms) updateData.platforms = JSON.stringify(input.platforms);
      if (input.contentStyle) updateData.contentStyle = input.contentStyle;
      if (input.maxPostsPerDay) updateData.maxPostsPerDay = input.maxPostsPerDay;
      if (input.includeImages !== undefined) updateData.includeImages = input.includeImages;
      if (input.includeHashtags !== undefined) updateData.includeHashtags = input.includeHashtags;
      if (input.agencyInfo) updateData.agencyInfo = JSON.stringify(input.agencyInfo);
      if (input.selectedAccounts) updateData.selectedAccounts = JSON.stringify(input.selectedAccounts);

      // Update schedule if time or timezone changes
      if (input.postingTime || input.timezone) {
        const currentConfig = await db
          .select()
          .from(aiAgentConfig)
          .where(
            and(
              eq(aiAgentConfig.userId, ctx.user.id),
              eq(aiAgentConfig.id, input.agentId)
            )
          )
          .limit(1);

        if (currentConfig[0]) {
          const currentSchedule = currentConfig[0].postingSchedule
            ? JSON.parse(currentConfig[0].postingSchedule)
            : { daysOfWeek: [1, 2, 3, 4, 5] };

          const newSchedule = {
            ...currentSchedule,
            time: input.postingTime || currentSchedule.time,
            timezone: input.timezone || currentSchedule.timezone || "UTC"
          };

          updateData.postingSchedule = JSON.stringify(newSchedule);

          updateData.nextRunAt = calculateNextRunTime(
            input.postingTime || currentSchedule.time || "09:00",
            input.timezone || currentSchedule.timezone || "UTC"
          );
        }
      }

      updateData.updatedAt = new Date();

      if (Object.keys(updateData).length === 0) return { success: true };

      await db
        .update(aiAgentConfig)
        .set(updateData)
        .where(
          and(
            eq(aiAgentConfig.userId, ctx.user.id),
            eq(aiAgentConfig.id, input.agentId)
          )
        );

      return { success: true };
    }),

  /**
   * Get all connected social media accounts for the current user
   */
  getConnectedAccounts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const accounts = await db
      .select()
      .from(socialMediaAccounts)
      .where(eq(socialMediaAccounts.userId, ctx.user.id))
      .orderBy(desc(socialMediaAccounts.createdAt));

    return accounts;
  }),

  /**
   * Generate content for a specific platform and agent
   */
  generateContent: protectedProcedure
    .input(
      z.object({
        platform: z.enum(["linkedin", "facebook", "twitter", "instagram"]),
        tone: z.enum(["professional", "casual", "energetic", "educational"]).default("professional"),
        agentId: z.number().optional(), // If not provided, use the first active agent
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Get agent configuration
      let query = db
        .select()
        .from(aiAgentConfig)
        .where(eq(aiAgentConfig.userId, ctx.user.id));

      if (input.agentId) {
        query = db.select().from(aiAgentConfig).where(
          and(
            eq(aiAgentConfig.userId, ctx.user.id),
            eq(aiAgentConfig.id, input.agentId)
          )
        ) as any;
      }

      const configResult = await query.limit(1);

      if (configResult.length === 0) {
        throw new Error("Agent not configured. Please initialize an agent first.");
      }

      const config = configResult[0];
      const agencyInfo = JSON.parse(config.agencyInfo || "{}");

      // Generate content
      const content = await generateSocialMediaContent({
        agencyName: agencyInfo.name || "Agency",
        services: agencyInfo.services || [],
        tone: input.tone,
        platform: input.platform,
        includeHashtags: config.includeHashtags || true,
        style: config.contentStyle || undefined,
        recentAchievements: agencyInfo.achievements,
      });

      // Generate image
      let mediaUrl: string | undefined;
      if (content.imagePrompt) {
        const imageResult = await generateImage(content.imagePrompt);
        if (imageResult.success) {
          mediaUrl = imageResult.url;
        }
      }

      // Save to database
      const insertData: InsertGeneratedPost = {
        userId: ctx.user.id,
        agentId: config.id,
        platform: input.platform,
        title: content.title,
        content: content.content,
        hashtags: JSON.stringify(content.hashtags),
        mediaUrl: mediaUrl,
        mediaType: mediaUrl ? "image" : null,
        mediaPrompt: content.imagePrompt,
        status: "draft",
      };

      const result = await db.insert(generatedPosts).values(insertData).returning({ id: generatedPosts.id });

      return {
        id: result[0].id,
        ...content,
      };
    }),

  /**
   * Generate multiple content variations
   */
  generateVariations: protectedProcedure
    .input(
      z.object({
        platform: z.enum(["linkedin", "facebook", "twitter", "instagram"]),
        count: z.number().min(1).max(5).default(3),
        tone: z.enum(["professional", "casual", "energetic", "educational"]).default("professional"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Get agent configuration
      const configResult = await db
        .select()
        .from(aiAgentConfig)
        .where(eq(aiAgentConfig.userId, ctx.user.id))
        .limit(1);

      if (configResult.length === 0) {
        throw new Error("Agent not configured");
      }

      const config = configResult[0];
      const agencyInfo = JSON.parse(config.agencyInfo || "{}");

      // Generate variations
      const variations = await generateContentVariations(
        {
          agencyName: agencyInfo.name || "Agency",
          services: agencyInfo.services || [],
          tone: input.tone,
          platform: input.platform,
          includeHashtags: config.includeHashtags || true,
          style: config.contentStyle || undefined,
          recentAchievements: agencyInfo.achievements,
        },
        input.count
      );

      // Save all variations
      const savedVariations = [];
      for (const variation of variations) {
        // Generate image for each variation
        let mediaUrl: string | undefined;
        if (variation.imagePrompt) {
          const imageResult = await generateImage(variation.imagePrompt);
          if (imageResult.success) {
            mediaUrl = imageResult.url;
          }
        }

        const insertData: InsertGeneratedPost = {
          userId: ctx.user.id,
          platform: input.platform,
          title: variation.title,
          content: variation.content,
          hashtags: JSON.stringify(variation.hashtags),
          mediaUrl: mediaUrl,
          mediaType: mediaUrl ? "image" : null,
          mediaPrompt: variation.imagePrompt,
          status: "draft",
        };

        const result = await db.insert(generatedPosts).values(insertData).returning({ id: generatedPosts.id });
        savedVariations.push({
          id: result[0].id,
          ...variation,
          mediaUrl,
        });
      }

      return savedVariations;
    }),

  /**
   * Get generated posts
   */
  getPosts: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
        platform: z.enum(["linkedin", "facebook", "twitter", "instagram"]).optional(),
        agentId: z.number().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      let query = db.select().from(generatedPosts).where(eq(generatedPosts.userId, ctx.user.id));

      // Note: Drizzle's dynamic query building is a bit verbose without query builder
      // We'll filter in memory for now if needed, but where clause assumes single condition
      // For more complex AND conditions we need proper where chaining

      // Let's use the basic select and filter locally if complex, 
      // or construct where clause if possible. 
      // Since we want to clean this up, let's just get all user posts and filter/sort
      // ideally we should use db filtering:

      const posts = await db
        .select()
        .from(generatedPosts)
        .where(eq(generatedPosts.userId, ctx.user.id))
        .orderBy(desc(generatedPosts.createdAt));
      // .limit(input.limit); // Applied after filtering in memory for simple implementation

      // Filter in memory for simplicity in this migration step
      const filteredPosts = posts
        .filter((post: any) => !input.status || post.status === input.status)
        .filter((post: any) => !input.platform || post.platform === input.platform)
        .filter((post: any) => !input.agentId || post.agentId === input.agentId)
        .slice(0, input.limit);

      return filteredPosts.map((post: any) => ({
        ...post,
        hashtags: post.hashtags ? JSON.parse(post.hashtags) : [],
      }));
    }),

  /**
   * Schedule a post for publishing
   */
  schedulePost: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        scheduledAt: z.string().or(z.date()).transform(val => new Date(val)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(generatedPosts)
        .set({
          status: "scheduled",
          scheduledAt: input.scheduledAt,
        })
        .where(eq(generatedPosts.id, input.postId));

      return { success: true };
    }),

  /**
   * Delete a generated post
   */
  deletePost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const post = await db
        .select()
        .from(generatedPosts)
        .where(eq(generatedPosts.id, input.postId))
        .limit(1);

      if (!post[0] || post[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      await db.delete(generatedPosts).where(eq(generatedPosts.id, input.postId));

      return { success: true };
    }),

  /**
   * Publish a post immediately
   */
  publishPostNow: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await publishPost(ctx.user.id, input.postId);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    }),
});

/**
 * Calculate next run time based on posting schedule
 */
function calculateNextRunTime(postingTime: string, timezone: string): Date {
  const now = new Date();
  const [hours, minutes] = postingTime.split(":").map(Number);

  const nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun;
}
