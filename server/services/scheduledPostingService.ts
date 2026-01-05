import { getDb } from "../db";
import { aiAgentConfig, generatedPosts, postingLogs, InsertPostingLog } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateSocialMediaContent } from "./aiContentGenerator";

/**
 * Service to handle scheduled posting of AI-generated content
 * This runs as a background job to generate and post content daily
 */

export interface PostingResult {
  success: boolean;
  postId?: number;
  platform: string;
  message: string;
  error?: string;
}

/**
 * Main function to execute the daily posting job
 * Call this from a cron job or scheduled task runner
 */
export async function executeDailyPostingJob(): Promise<void> {
  console.log("[AI Agent] Starting daily posting job...");

  const db = await getDb();
  if (!db) {
    console.error("[AI Agent] Database not available");
    return;
  }

  try {
    // Get all active agent configurations
    const activeAgents = await db
      .select()
      .from(aiAgentConfig)
      .where(eq(aiAgentConfig.isActive, true));

    console.log(`[AI Agent] Found ${activeAgents.length} active agents`);

    for (const agent of activeAgents) {
      await processAgentPosting(db, agent);
    }

    console.log("[AI Agent] Daily posting job completed");
  } catch (error) {
    console.error("[AI Agent] Error in daily posting job:", error);
  }
}

/**
 * Process posting for a single agent
 */
async function processAgentPosting(db: any, agent: any): Promise<void> {
  try {
    const now = new Date();
    const agencyInfo = agent.agencyInfo;
    const platforms = agent.platforms as string[];

    console.log(`[AI Agent] Processing agent ${agent.agentName} for user ${agent.userId}`);

    // Generate content for each platform
    for (const platform of platforms) {
      try {
        const content = await generateSocialMediaContent({
          agencyName: agencyInfo.name,
          services: agencyInfo.services,
          tone: "professional",
          platform: platform as any,
          includeHashtags: agent.includeHashtags,
          style: agent.contentStyle || undefined,
          recentAchievements: agencyInfo.achievements,
        });

        // Save generated post
        const insertData: any = {
          userId: agent.userId,
          platform: platform as "linkedin" | "facebook" | "twitter" | "instagram",
          title: content.title,
          content: content.content,
          hashtags: JSON.stringify(content.hashtags),
          status: "scheduled" as const,
          scheduledAt: new Date(now.getTime() + 5 * 60 * 1000),
        };

        const result = await db.insert(generatedPosts).values([insertData]);
        const postId = (result as any).insertId;

        // Log successful generation
        const logEntry: InsertPostingLog = {
          userId: agent.userId,
          agentConfigId: agent.id,
          generatedPostId: postId,
          platform: platform as "linkedin" | "facebook" | "twitter" | "instagram",
          status: "success",
          message: `Generated content for ${platform}`,
          attemptedAt: now,
          completedAt: now,
        };

        await db.insert(postingLogs).values(logEntry);

        console.log(`[AI Agent] Generated post for ${platform} (ID: ${postId})`);
      } catch (error) {
        console.error(`[AI Agent] Error generating content for ${platform}:`, error);

        // Log failure
        const logEntry: InsertPostingLog = {
          userId: agent.userId,
          agentConfigId: agent.id,
          platform: platform as "linkedin" | "facebook" | "twitter" | "instagram",
          status: "failed",
          message: `Failed to generate content`,
          errorDetails: error instanceof Error ? error.message : String(error),
          attemptedAt: now,
        };

        await db.insert(postingLogs).values(logEntry);
      }
    }

    // Update last run time
    await db
      .update(aiAgentConfig)
      .set({
        lastRunAt: now,
        nextRunAt: calculateNextRunTime(agent.postingSchedule),
      })
      .where(eq(aiAgentConfig.id, agent.id));
  } catch (error) {
    console.error(`[AI Agent] Error processing agent ${agent.id}:`, error);
  }
}

/**
 * Calculate next run time based on posting schedule
 */
function calculateNextRunTime(schedule: any): Date {
  const now = new Date();
  const nextRun = new Date(now);

  // Parse posting time (HH:mm format)
  const [hours, minutes] = schedule.time.split(":").map(Number);
  nextRun.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun;
}

/**
 * Get posting statistics for a user
 */
export async function getPostingStats(userId: number): Promise<{
  totalGenerated: number;
  totalScheduled: number;
  totalPublished: number;
  totalFailed: number;
  platformBreakdown: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const posts = await db
    .select()
    .from(generatedPosts)
    .where(eq(generatedPosts.userId, userId));

  const stats = {
    totalGenerated: posts.length,
    totalScheduled: posts.filter((p) => p.status === "scheduled").length,
    totalPublished: posts.filter((p) => p.status === "published").length,
    totalFailed: posts.filter((p) => p.status === "failed").length,
    platformBreakdown: {} as Record<string, number>,
  };

  // Calculate platform breakdown
  for (const post of posts) {
    stats.platformBreakdown[post.platform] = (stats.platformBreakdown[post.platform] || 0) + 1;
  }

  return stats;
}

/**
 * Manually trigger posting for a specific agent
 */
export async function triggerManualPosting(userId: number, agentConfigId: number): Promise<PostingResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const agent = await db
    .select()
    .from(aiAgentConfig)
    .where(eq(aiAgentConfig.id, agentConfigId))
    .limit(1);

  if (!agent[0] || agent[0].userId !== userId) {
    throw new Error("Agent not found or unauthorized");
  }

  const results: PostingResult[] = [];

  for (const platform of agent[0].platforms as string[]) {
    try {
      const content = await generateSocialMediaContent({
        agencyName: (agent[0].agencyInfo as any).name,
        services: (agent[0].agencyInfo as any).services,
        tone: "professional",
        platform: platform as any,
        includeHashtags: agent[0].includeHashtags,
        style: agent[0].contentStyle || undefined,
        recentAchievements: (agent[0].agencyInfo as any).achievements,
      });

      const insertData: any = {
        userId,
        platform: platform as "linkedin" | "facebook" | "twitter" | "instagram",
        title: content.title,
        content: content.content,
        hashtags: JSON.stringify(content.hashtags),
        status: "draft" as const,
      };

      const result = await db.insert(generatedPosts).values([insertData]);

      results.push({
        success: true,
        postId: (result as any).insertId,
        platform,
        message: `Successfully generated content for ${platform}`,
      });
    } catch (error) {
      results.push({
        success: false,
        platform,
        message: `Failed to generate content for ${platform}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Publish a scheduled post (simulated - in production, this would call social media APIs)
 */
export async function publishPost(userId: number, postId: number): Promise<PostingResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const post = await db
    .select()
    .from(generatedPosts)
    .where(eq(generatedPosts.id, postId))
    .limit(1);

  if (!post[0] || post[0].userId !== userId) {
    throw new Error("Post not found or unauthorized");
  }

  try {
    // In production, this would integrate with social media APIs
    // For now, we'll simulate successful publishing
    const now = new Date();

    await db
      .update(generatedPosts)
      .set({
        status: "published",
        publishedAt: now,
      })
      .where(eq(generatedPosts.id, postId));

    // Log the publishing attempt
    const logEntry: InsertPostingLog = {
      userId,
      agentConfigId: 0, // Would be set in production
      generatedPostId: postId,
      platform: post[0].platform,
      status: "success",
      message: `Published to ${post[0].platform}`,
      attemptedAt: now,
      completedAt: now,
    };

    await db.insert(postingLogs).values(logEntry);

    return {
      success: true,
      postId,
      platform: post[0].platform,
      message: `Successfully published to ${post[0].platform}`,
    };
  } catch (error) {
    return {
      success: false,
      platform: post[0].platform,
      message: `Failed to publish post`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
