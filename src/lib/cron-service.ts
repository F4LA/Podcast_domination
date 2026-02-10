import cron from "node-cron";

/**
 * Internal Cron Service
 * 
 * Runs scheduled tasks within the Next.js app.
 * Works on Railway, Vercel, or local development.
 */

const BASE_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

// Track if cron is already initialized (prevent double-init in dev mode)
let isInitialized = false;

async function callCronEndpoint(path: string): Promise<void> {
  const url = `${BASE_URL}${path}`;
  
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (CRON_SECRET) {
      headers["Authorization"] = `Bearer ${CRON_SECRET}`;
    }
    
    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    
    const data = await response.json();
    console.log(`[Cron] ${path} completed:`, data.success ? "✅" : "❌", data.message || "");
  } catch (error) {
    console.error(`[Cron] ${path} failed:`, error instanceof Error ? error.message : "Unknown error");
  }
}

export function initCronJobs(): void {
  // Prevent double initialization in development (hot reload)
  if (isInitialized) {
    console.log("[Cron] Already initialized, skipping...");
    return;
  }
  
  // Only run cron jobs on the server
  if (typeof window !== "undefined") {
    return;
  }
  
  console.log("[Cron] Initializing scheduled jobs...");
  
  // Check for replies - Every hour at minute 0
  // Scans Gmail threads for replies and updates podcast status
  cron.schedule("0 * * * *", async () => {
    console.log("[Cron] Running: check-replies");
    await callCronEndpoint("/api/cron/check-replies");
  }, {
    timezone: "America/New_York"
  });
  
  // Send scheduled emails - Every 15 minutes
  // Sends follow-up emails that are due
  cron.schedule("*/15 * * * *", async () => {
    console.log("[Cron] Running: send-scheduled-emails");
    await callCronEndpoint("/api/cron/send-scheduled-emails");
  }, {
    timezone: "America/New_York"
  });
  
  // Calculate next actions - Daily at 6 AM
  // Updates next action dates for all active campaigns
  cron.schedule("0 6 * * *", async () => {
    console.log("[Cron] Running: calculate-next-actions");
    await callCronEndpoint("/api/cron/calculate-next-actions");
  }, {
    timezone: "America/New_York"
  });
  
  // Daily workflow - Daily at 7 AM
  // Runs the full daily workflow (follow-ups, reminders, etc.)
  cron.schedule("0 7 * * *", async () => {
    console.log("[Cron] Running: daily-workflow");
    await callCronEndpoint("/api/cron/daily-workflow");
  }, {
    timezone: "America/New_York"
  });
  
  isInitialized = true;
  console.log("[Cron] ✅ Scheduled jobs initialized:");
  console.log("  - check-replies: Every hour");
  console.log("  - send-scheduled-emails: Every 15 minutes");
  console.log("  - calculate-next-actions: Daily at 6 AM");
  console.log("  - daily-workflow: Daily at 7 AM");
}

// Export for manual triggering
export async function runCronJob(jobName: string): Promise<{ success: boolean; message: string }> {
  const jobs: Record<string, string> = {
    "check-replies": "/api/cron/check-replies",
    "send-scheduled-emails": "/api/cron/send-scheduled-emails",
    "calculate-next-actions": "/api/cron/calculate-next-actions",
    "daily-workflow": "/api/cron/daily-workflow",
  };
  
  const path = jobs[jobName];
  if (!path) {
    return { success: false, message: `Unknown job: ${jobName}` };
  }
  
  try {
    await callCronEndpoint(path);
    return { success: true, message: `Job ${jobName} triggered` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}





