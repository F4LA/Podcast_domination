import { NextRequest, NextResponse } from "next/server";

/**
 * Manual Cron Trigger API
 * 
 * POST /api/cron/trigger
 * Body: { "job": "check-replies" | "send-scheduled-emails" | "calculate-next-actions" | "daily-workflow" }
 * 
 * Allows manually triggering cron jobs from the UI.
 */

const CRON_ENDPOINTS: Record<string, string> = {
  "check-replies": "/api/cron/check-replies",
  "send-scheduled-emails": "/api/cron/send-scheduled-emails",
  "calculate-next-actions": "/api/cron/calculate-next-actions",
  "daily-workflow": "/api/cron/daily-workflow",
};

export async function POST(request: NextRequest) {
  try {
    const { job } = await request.json();
    
    if (!job || !CRON_ENDPOINTS[job]) {
      return NextResponse.json({
        success: false,
        error: "Invalid job name",
        availableJobs: Object.keys(CRON_ENDPOINTS),
      }, { status: 400 });
    }
    
    const endpoint = CRON_ENDPOINTS[job];
    const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`[Cron Trigger] Manually triggering: ${job}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-cron": "1", // Bypass auth for internal calls
      },
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      success: response.ok,
      job,
      result: data,
    });
  } catch (error) {
    console.error("[Cron Trigger] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// GET - List available cron jobs and their status
export async function GET() {
  return NextResponse.json({
    availableJobs: Object.keys(CRON_ENDPOINTS),
    schedule: {
      "check-replies": "Every hour (minute 0)",
      "send-scheduled-emails": "Every 15 minutes",
      "calculate-next-actions": "Daily at 6 AM EST",
      "daily-workflow": "Daily at 7 AM EST",
    },
    message: "POST to this endpoint with { \"job\": \"job-name\" } to trigger manually",
  });
}





