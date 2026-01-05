import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateSocialMediaContent, generateContentVariations } from "../services/aiContentGenerator";
import { getDb } from "../db";
import { aiAgentConfig, generatedPosts, InsertGeneratedPost } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const schedule = {
        time: input.postingTime,
        timezone: input.timezone,
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      };

      const result = await db.insert(aiAgentConfig).values({
        userId: ctx.user.id,
        agentName: input.agentName || "BinaryKode Daily Poster",
        isActive: true,
        postingSchedule: schedule,
        platforms: input.platforms,
        contentStyle: input.contentStyle,
        agencyInfo: input.agencyInfo,
        maxPostsPerDay: 1,
        includeImages: true,
        includeHashtags: true,
        nextRunAt: calculateNextRunTime(input.postingTime, input.timezone),
      });

      return { success: true, agentId: (result as any).insertId };
    }),

  /**
   * Get current agent configuration
   */
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const config = await db
      .select()
      .from(aiAgentConfig)
      .where(eq(aiAgentConfig.userId, ctx.user.id))
      .limit(1);

    return config[0] || null;
  }),

  /**
   * Update agent configuration
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        platforms: z.array(z.enum(["linkedin", "facebook", "twitter", "instagram"])).optional(),
        contentStyle: z.string().optional(),
        maxPostsPerDay: z.number().optional(),
        includeImages: z.boolean().optional(),
        includeHashtags: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.platforms) updateData.platforms = input.platforms;
      if (input.contentStyle) updateData.contentStyle = input.contentStyle;
      if (input.maxPostsPerDay) updateData.maxPostsPerDay = input.maxPostsPerDay;
      if (input.includeImages !== undefined) updateData.includeImages = input.includeImages;
      if (input.includeHashtags !== undefined) updateData.includeHashtags = input.includeHashtags;
      if (Object.keys(updateData).length === 0) return { success: true };

      await db
        .update(aiAgentConfig)
        .set(updateData)
        .where(eq(aiAgentConfig.userId, ctx.user.id));

      return { success: true };
    }),

  /**
   * Generate content for a specific platform
   */
  generateContent: protectedProcedure
    .input(
      z.object({
        platform: z.enum(["linkedin", "facebook", "twitter", "instagram"]),
        tone: z.enum(["professional", "casual", "energetic", "educational"]).default("professional"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get agent configuration
      const config = await db
        .select()
        .from(aiAgentConfig)
        .where(eq(aiAgentConfig.userId, ctx.user.id))
        .limit(1);

      if (!config[0]) {
        throw new Error("Agent not configured. Please initialize the agent first.");
      }

      const agencyInfo = config[0].agencyInfo as any;

      // Generate content
      const content = await generateSocialMediaContent({
        agencyName: agencyInfo.name,
        services: agencyInfo.services,
        tone: input.tone,
        platform: input.platform,
        includeHashtags: config[0].includeHashtags,
        style: config[0].contentStyle || undefined,
        recentAchievements: agencyInfo.achievements,
      });

      // Save to database
      const insertData: InsertGeneratedPost = {
        userId: ctx.user.id,
        platform: input.platform,
        title: content.title,
        content: content.content,
        hashtags: JSON.stringify(content.hashtags),
        status: "draft",
      };

      const result = await db.insert(generatedPosts).values(insertData);

      return {
        id: (result as any).insertId,
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
      if (!db) throw new Error("Database not available");

      // Get agent configuration
      const config = await db
        .select()
        .from(aiAgentConfig)
        .where(eq(aiAgentConfig.userId, ctx.user.id))
        .limit(1);

      if (!config[0]) {
        throw new Error("Agent not configured");
      }

      const agencyInfo = config[0].agencyInfo as any;

      // Generate variations
      const variations = await generateContentVariations(
        {
          agencyName: agencyInfo.name,
          services: agencyInfo.services,
          tone: input.tone,
          platform: input.platform,
          includeHashtags: config[0].includeHashtags,
          style: config[0].contentStyle || undefined,
          recentAchievements: agencyInfo.achievements,
        },
        input.count
      );

      // Save all variations
      const savedVariations = [];
      for (const variation of variations) {
        const insertData: InsertGeneratedPost = {
          userId: ctx.user.id,
          platform: input.platform,
          title: variation.title,
          content: variation.content,
          hashtags: JSON.stringify(variation.hashtags),
          status: "draft",
        };

        const result = await db.insert(generatedPosts).values(insertData);
        savedVariations.push({
          id: (result as any).insertId,
          ...variation,
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
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const posts = await db
        .select()
        .from(generatedPosts)
        .where(
          input.status && input.platform
            ? eq(generatedPosts.userId, ctx.user.id)
            : input.status
            ? eq(generatedPosts.userId, ctx.user.id)
            : input.platform
            ? eq(generatedPosts.userId, ctx.user.id)
            : eq(generatedPosts.userId, ctx.user.id)
        )
        .limit(input.limit);

      return posts
        .filter((post) => !input.status || post.status === input.status)
        .filter((post) => !input.platform || post.platform === input.platform)
        .map((post) => ({
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
        scheduledAt: z.date(),
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
