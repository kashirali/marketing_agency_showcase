import { getDb } from "../db";
import { aiAgentConfig, generatedPosts, postingLogs, InsertPostingLog, socialMediaAccounts } from "../../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";
import { generateSocialMediaContent } from "./aiContentGenerator";
import * as linkedinService from "./linkedinService";
import * as metaService from "./metaService";
import { generateImage } from "./imageService";

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
 * Find and publish all due scheduled posts
 * Call this periodically to process the posting queue
 */
export async function publishDuePosts(): Promise<void> {
  console.log("[AI Agent] Checking for due scheduled posts...");

  const db = await getDb();
  if (!db) {
    console.error("[AI Agent] Database not available");
    return;
  }

  try {
    const now = new Date();

    // Find posts with status 'scheduled' and scheduledAt <= now
    const duePosts = await db
      .select()
      .from(generatedPosts)
      .where(
        and(
          eq(generatedPosts.status, "scheduled"),
          lte(generatedPosts.scheduledAt, now)
        )
      );

    console.log(`[AI Agent] Found ${duePosts.length} due posts`);

    for (const post of duePosts) {
      await publishPost(post.userId, post.id);
    }

  } catch (error) {
    console.error("[AI Agent] Error in publishDuePosts:", error);
  }
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
    // Parse JSON fields
    const agencyInfo = JSON.parse(agent.agencyInfo || "{}");
    const platforms = JSON.parse(agent.platforms || "[]") as string[];
    const schedule = JSON.parse(agent.postingSchedule || "{}");

    console.log(`[AI Agent] Processing agent ${agent.agentName} for user ${agent.userId}`);

    // Generate content for each platform
    for (const platform of platforms) {
      try {
        const content = await generateSocialMediaContent({
          agencyName: agencyInfo.name || "Agency",
          services: agencyInfo.services || [],
          tone: "professional",
          platform: platform as any,
          includeHashtags: agent.includeHashtags,
          style: agent.contentStyle || undefined,
          recentAchievements: agencyInfo.achievements,
        });

        // 2. Generate an image for the post if we have a prompt
        let mediaUrl: string | undefined;
        if (content.imagePrompt) {
          const imageResult = await generateImage(content.imagePrompt);
          if (imageResult.success) {
            mediaUrl = imageResult.url;
          }
        }

        // Save generated post
        const insertData = {
          userId: agent.userId,
          platform: platform as "linkedin" | "facebook" | "twitter" | "instagram",
          title: content.title,
          content: content.content,
          hashtags: JSON.stringify(content.hashtags),
          mediaUrl: mediaUrl,
          mediaType: mediaUrl ? ("image" as const) : null,
          mediaPrompt: content.imagePrompt,
          status: "scheduled" as const,
          scheduledAt: new Date(now.getTime() + 5 * 60 * 1000),
        };

        const result = await db.insert(generatedPosts).values([insertData]);
        const postId = Number((result as any).lastInsertRowid);

        // Log successful generation
        const logEntry: InsertPostingLog = {
          userId: agent.userId,
          postId: postId,
          platform: platform as "linkedin" | "facebook" | "twitter" | "instagram",
          status: "success",
          errorMessage: `Generated content for ${platform}`,
          attemptedAt: now,
        };

        await db.insert(postingLogs).values(logEntry);

        console.log(`[AI Agent] Generated post for ${platform} (ID: ${postId})`);
      } catch (error) {
        console.error(`[AI Agent] Error generating content for ${platform}:`, error);

        // Log failure
        // We can't log 'postId' if generation failed, so we'll skip DB log or use a placeholder if essential
        // But schema requires postId. So we can't insert into postingLogs without a post.
        // We'll just log to console.
      }
    }

    // Update last run time
    await db
      .update(aiAgentConfig)
      .set({
        nextRunAt: calculateNextRunTime(schedule),
        updatedAt: new Date(),
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

  if (!schedule.time) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

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
  const platforms = JSON.parse(agent[0].platforms || "[]") as string[];
  const agencyInfo = JSON.parse(agent[0].agencyInfo || "{}");

  for (const platform of platforms) {
    try {
      const content = await generateSocialMediaContent({
        agencyName: agencyInfo.name || "Agency",
        services: agencyInfo.services || [],
        tone: "professional",
        platform: platform as any,
        includeHashtags: agent[0].includeHashtags,
        style: agent[0].contentStyle || undefined,
        recentAchievements: agencyInfo.achievements,
      });

      const insertData = {
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
        postId: Number((result as any).lastInsertRowid),
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
 * Publish a scheduled post using real social media APIs
 */
export async function publishPost(userId: number, postId: number, retryCount: number = 0): Promise<PostingResult> {
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
    const now = new Date();

    const account = await findSelectedAccount(db, post[0]);
    if (!account) {
      throw new Error(`No active ${post[0].platform} account found for this user/agent`);
    }

    let serviceResult: any;

    // Call the appropriate service based on platform
    if (post[0].platform === "linkedin") {
      serviceResult = await linkedinService.postToLinkedIn(account.accessToken, {
        content: post[0].content,
        title: post[0].title,
        hashtags: JSON.parse(post[0].hashtags || "[]"),
        imageUrl: post[0].mediaUrl || undefined,
      });
    } else if (post[0].platform === "facebook") {
      serviceResult = await metaService.postToFacebook(account.accessToken, account.accountId, {
        content: post[0].content,
        title: post[0].title,
        hashtags: JSON.parse(post[0].hashtags || "[]"),
        picture: post[0].mediaUrl || undefined,
      });
    } else if (post[0].platform === "instagram") {
      if (!post[0].mediaUrl) {
        throw new Error("Instagram posts require an image");
      }
      serviceResult = await metaService.postImageToInstagram(account.accessToken, account.accountId, {
        content: post[0].content,
        hashtags: JSON.parse(post[0].hashtags || "[]"),
        imageUrl: post[0].mediaUrl,
      });
    } else {
      throw new Error(`Platform ${post[0].platform} not yet supported for real posting`);
    }

    if (!serviceResult.success) {
      throw new Error(serviceResult.message || "Unknown error during publishing");
    }

    await db
      .update(generatedPosts)
      .set({
        status: "published",
        publishedAt: now,
        externalPostId: serviceResult.id,
      })
      .where(eq(generatedPosts.id, postId));

    // Log the success
    await db.insert(postingLogs).values({
      userId,
      postId: postId,
      platform: post[0].platform,
      status: "success",
      platformPostId: serviceResult.id,
      errorMessage: `Published to ${post[0].platform}`,
      attemptedAt: now,
    });

    return {
      success: true,
      postId,
      platform: post[0].platform,
      message: `Successfully published to ${post[0].platform}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[AI Agent] Publishing failed for post ${postId}:`, errorMessage);

    // Retry logic (max 3 attempts)
    if (retryCount < 2) {
      console.log(`[AI Agent] Retrying post ${postId} (Attempt ${retryCount + 2})...`);
      // Wait before retrying (exponential backoff could be better, but simple delay for now)
      await new Promise(resolve => setTimeout(resolve, 5000));
      return publishPost(userId, postId, retryCount + 1);
    }

    await db
      .update(generatedPosts)
      .set({
        status: "failed",
      })
      .where(eq(generatedPosts.id, postId));

    // Log the failure
    await db.insert(postingLogs).values({
      userId,
      postId: postId,
      platform: post[0].platform,
      status: "failed",
      errorMessage: errorMessage,
      attemptedAt: new Date(),
    });

    return {
      success: false,
      platform: post[0].platform,
      message: `Failed to publish post: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

/**
 * Find the selected social media account for a post based on agent configuration
 */
async function findSelectedAccount(db: any, post: any) {
  // 1. Get agent configuration if available
  if (post.agentId) {
    const configs = await db
      .select()
      .from(aiAgentConfig)
      .where(eq(aiAgentConfig.id, post.agentId))
      .limit(1);

    const config = configs[0];
    if (config && config.selectedAccounts) {
      const mappings = JSON.parse(config.selectedAccounts);
      const selectedAccountId = mappings[post.platform];

      if (selectedAccountId) {
        const accounts = await db
          .select()
          .from(socialMediaAccounts)
          .where(
            and(
              eq(socialMediaAccounts.id, selectedAccountId),
              eq(socialMediaAccounts.isActive, true)
            )
          )
          .limit(1);

        if (accounts[0]) return accounts[0];
      }
    }
  }

  // 2. Fallback to first active account for this user/platform
  const accounts = await db
    .select()
    .from(socialMediaAccounts)
    .where(
      and(
        eq(socialMediaAccounts.userId, post.userId),
        eq(socialMediaAccounts.platform, post.platform),
        eq(socialMediaAccounts.isActive, true)
      )
    )
    .limit(1);

  return accounts[0] || null;
}
