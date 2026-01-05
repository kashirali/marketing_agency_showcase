/**
 * Daily Posting Job
 * This script runs the AI agent's daily posting routine
 * 
 * Usage: node server/jobs/dailyPostingJob.mjs
 * 
 * For production, schedule this with cron:
 * 0 8 * * * cd /path/to/project && node server/jobs/dailyPostingJob.mjs
 */

import { executeDailyPostingJob } from "../services/scheduledPostingService.ts";

async function main() {
  console.log(`[Daily Posting Job] Starting at ${new Date().toISOString()}`);

  try {
    await executeDailyPostingJob();
    console.log(`[Daily Posting Job] Completed successfully at ${new Date().toISOString()}`);
    process.exit(0);
  } catch (error) {
    console.error("[Daily Posting Job] Error:", error);
    process.exit(1);
  }
}

main();
