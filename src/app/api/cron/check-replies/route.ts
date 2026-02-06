import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GmailClient } from "@/lib/gmail";
import { getGmailTokens } from "@/app/api/auth/gmail/route";

/**
 * CRON JOB: Check for Replies
 * 
 * Polls Gmail threads for replies as a backup to webhooks.
 * Run this every few hours to catch any missed replies.
 * 
 * Schedule: Every 4 hours (or more frequently if needed)
 */

interface CheckResult {
  podcastId: string;
  showName: string;
  threadId: string;
  status: "replied" | "bounced" | "no_reply" | "error";
  replyType?: string;
  uiResponseType?: string;
  error?: string;
}

// Map backend classification to UI response type
type UIResponseType = "no_response" | "not_interested" | "interested_not_booked" | "booked" | "opted_out";

function mapReplyTypeToUIResponse(replyType: string): UIResponseType {
  switch (replyType) {
    case "POSITIVE":
      return "interested_not_booked"; // User can manually mark as "booked" after confirmation
    case "NEGATIVE":
      return "not_interested";
    case "NOT_NOW":
      return "not_interested"; // They're not interested right now
    case "NEEDS_TOPICS":
    case "NEEDS_MEDIA_KIT":
      return "interested_not_booked"; // They're interested but need more info
    case "PAID_ONLY":
      return "not_interested"; // Usually means they charge for appearances
    default:
      return "interested_not_booked"; // NEUTRAL - they replied, so treat as interested
  }
}

// Update outreach campaign with response
async function updateOutreachCampaign(podcastId: string, responseType: UIResponseType, replyType: string): Promise<void> {
  try {
    const CAMPAIGNS_KEY = "outreach-campaigns";
    const record = await db.keyValueStore.findUnique({
      where: { key: CAMPAIGNS_KEY },
    });
    
    if (!record?.value) return;
    
    const campaigns = JSON.parse(record.value);
    const updatedCampaigns = campaigns.map((campaign: { id: string; status: string; responseType: string | null }) => {
      if (campaign.id === podcastId) {
        return {
          ...campaign,
          status: "responded",
          responseType,
          replyClassification: replyType, // Store the original classification
        };
      }
      return campaign;
    });
    
    await db.keyValueStore.update({
      where: { key: CAMPAIGNS_KEY },
      data: { value: JSON.stringify(updatedCampaigns) },
    });
    
    console.log(`[Check Replies] Updated campaign ${podcastId} with responseType: ${responseType}`);
  } catch (error) {
    console.error("[Check Replies] Failed to update campaign:", error);
  }
}

// Create Gmail client from stored OAuth tokens
async function getGmailClient(): Promise<GmailClient | null> {
  const tokens = await getGmailTokens();
  if (!tokens) {
    return null;
  }
  return new GmailClient({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
}

// Classify reply type based on content
function classifyReply(body: string): "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "NOT_NOW" | "NEEDS_TOPICS" | "NEEDS_MEDIA_KIT" | "PAID_ONLY" {
  const lowerBody = body.toLowerCase();

  if (
    lowerBody.includes("love to have you") ||
    lowerBody.includes("would be great") ||
    lowerBody.includes("let's schedule") ||
    lowerBody.includes("book a time") ||
    lowerBody.includes("yes") ||
    lowerBody.includes("interested")
  ) {
    return "POSITIVE";
  }

  if (
    lowerBody.includes("not interested") ||
    lowerBody.includes("no thank") ||
    lowerBody.includes("not a fit") ||
    lowerBody.includes("unsubscribe") ||
    lowerBody.includes("remove me")
  ) {
    return "NEGATIVE";
  }

  if (
    lowerBody.includes("not right now") ||
    lowerBody.includes("maybe later") ||
    lowerBody.includes("reach out again")
  ) {
    return "NOT_NOW";
  }

  if (lowerBody.includes("what topics") || lowerBody.includes("tell me more")) {
    return "NEEDS_TOPICS";
  }

  if (lowerBody.includes("media kit") || lowerBody.includes("one sheet")) {
    return "NEEDS_MEDIA_KIT";
  }

  if (lowerBody.includes("paid guest") || lowerBody.includes("fee")) {
    return "PAID_ONLY";
  }

  return "NEUTRAL";
}

// GET /api/cron/check-replies - Check all pending threads for replies
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: CheckResult[] = [];

  try {
    // Verify cron secret (supports both Vercel cron and manual calls)
    const authHeader = request.headers.get("authorization");
    const vercelCronHeader = request.headers.get("x-vercel-cron");
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if: Vercel cron header present, OR valid Bearer token, OR no secret configured
    const isVercelCron = vercelCronHeader === "1";
    const isValidToken = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const noSecretConfigured = !cronSecret;
    
    if (!isVercelCron && !isValidToken && !noSecretConfigured) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Gmail client
    const gmail = await getGmailClient();
    if (!gmail) {
      return NextResponse.json({
        success: false,
        error: "Gmail not connected",
        results: [],
      }, { status: 400 });
    }

    // Find all touches with gmailThreadId that haven't been marked as replied
    const pendingTouches = await db.touch.findMany({
      where: {
        gmailThreadId: { not: null },
        replied: false,
        bounced: false,
      },
      include: {
        podcast: {
          select: {
            id: true,
            showName: true,
            status: true,
          },
        },
      },
      orderBy: { sentAt: "desc" },
      take: 50, // Process in batches
    });

    console.log(`[Check Replies] Checking ${pendingTouches.length} pending threads`);

    for (const touch of pendingTouches) {
      if (!touch.gmailThreadId) continue;

      try {
        const { hasReply, replyText } = await gmail.checkForReplies(touch.gmailThreadId);

        if (hasReply && replyText) {
          const replyType = classifyReply(replyText);

          // Update touch
          await db.touch.update({
            where: { id: touch.id },
            data: {
              replied: true,
              repliedAt: new Date(),
            },
          });

          // Update podcast in database
          await db.podcast.update({
            where: { id: touch.podcastId },
            data: {
              status: "REPLIED",
              replyReceivedAt: new Date(),
              replyType,
              nextAction: "CLOSE",
              outcome: replyType === "POSITIVE" ? "BOOKED" : replyType === "NEGATIVE" ? "DECLINED" : undefined,
            },
          });

          // Update outreach campaign UI state
          const uiResponseType = mapReplyTypeToUIResponse(replyType);
          await updateOutreachCampaign(touch.podcastId, uiResponseType, replyType);

          results.push({
            podcastId: touch.podcastId,
            showName: touch.podcast.showName,
            threadId: touch.gmailThreadId,
            status: "replied",
            replyType,
            uiResponseType,
          });

          console.log(`[Check Replies] Reply found for ${touch.podcast.showName}: ${replyType} → UI: ${uiResponseType}`);
        } else {
          // Check for bounce
          const { bounced, reason } = await gmail.getBounceStatus(touch.gmailMessageId || "");
          
          if (bounced) {
            await db.touch.update({
              where: { id: touch.id },
              data: {
                bounced: true,
                bouncedAt: new Date(),
                bounceReason: reason,
              },
            });

            await db.podcast.update({
              where: { id: touch.podcastId },
              data: {
                outcome: "BOUNCED",
                stopRule: "BOUNCE",
                suppressed: true,
                suppressedAt: new Date(),
              },
            });

            results.push({
              podcastId: touch.podcastId,
              showName: touch.podcast.showName,
              threadId: touch.gmailThreadId,
              status: "bounced",
            });

            console.log(`[Check Replies] Bounce for ${touch.podcast.showName}`);
          } else {
            results.push({
              podcastId: touch.podcastId,
              showName: touch.podcast.showName,
              threadId: touch.gmailThreadId,
              status: "no_reply",
            });
          }
        }

        // Rate limit: wait 200ms between API calls
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`[Check Replies] Error checking ${touch.gmailThreadId}:`, error);
        results.push({
          podcastId: touch.podcastId,
          showName: touch.podcast.showName,
          threadId: touch.gmailThreadId || "unknown",
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const duration = Date.now() - startTime;
    const repliesFound = results.filter(r => r.status === "replied").length;
    const bouncesFound = results.filter(r => r.status === "bounced").length;

    return NextResponse.json({
      success: true,
      message: `Checked ${results.length} threads. Found ${repliesFound} replies, ${bouncesFound} bounces.`,
      duration: `${duration}ms`,
      repliesFound,
      bouncesFound,
      results,
    });

  } catch (error) {
    console.error("[Check Replies] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      results,
    }, { status: 500 });
  }
}


