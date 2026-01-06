import { executeDailyPostingJob, publishDuePosts } from "../server/services/scheduledPostingService";

export default async function handler(req: any, res: any) {
    // Simple bearer token check or Vercel cron header check for security
    const authHeader = req.headers['authorization'];
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log("[Cron] Starting scheduled tasks...");

    try {
        // 1. Publish any posts due now
        await publishDuePosts();

        // 2. Run daily generation if it's time
        // In a serverless environment, we might want to check if it's already run today
        await executeDailyPostingJob();

        return res.status(200).json({ success: true, message: "Tasks executed" });
    } catch (error) {
        console.error("[Cron] Error executing tasks:", error);
        return res.status(500).json({ error: error instanceof Error ? error.message : "Internal Error" });
    }
}
