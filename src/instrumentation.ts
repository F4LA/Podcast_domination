/**
 * Next.js Instrumentation
 * 
 * This file runs when the Next.js server starts.
 * Used to initialize cron jobs and other server-side services.
 */

export async function register() {
  // Only run on the server (not during build or on edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initCronJobs } = await import("./lib/cron-service");
    initCronJobs();
  }
}

