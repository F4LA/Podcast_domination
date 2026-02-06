import { NextRequest, NextResponse } from "next/server";
import { GmailClient } from "@/lib/gmail";
import { getGmailTokens } from "@/app/api/auth/gmail/route";
import { db } from "@/lib/db";

const GMAIL_TOKENS_KEY = "gmail_tokens";

// Get the connected Gmail email address
async function getConnectedEmail(): Promise<string | null> {
  try {
    const record = await db.keyValueStore.findUnique({
      where: { key: GMAIL_TOKENS_KEY },
    });
    if (record) {
      const tokens = JSON.parse(record.value);
      return tokens.email || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Create Gmail client from stored OAuth tokens
async function getGmailClient(): Promise<GmailClient> {
  const tokens = await getGmailTokens();
  if (!tokens) {
    throw new Error("Gmail not connected. Please connect Gmail in Settings first.");
  }
  return new GmailClient({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body for optional custom recipient
    let customRecipient: string | null = null;
    let includeTracking = false;
    
    try {
      const body = await request.json();
      customRecipient = body.to || null;
      includeTracking = body.includeTracking || false;
    } catch {
      // No body provided, use defaults
    }

    // Get the connected email address
    const connectedEmail = await getConnectedEmail();
    if (!connectedEmail) {
      return NextResponse.json({
        success: false,
        message: "Gmail not connected. Please connect Gmail first.",
      }, { status: 400 });
    }

    // Use custom recipient or fall back to connected email
    const recipient = customRecipient || connectedEmail;

    // Get Gmail client
    const gmail = await getGmailClient();

    // Build test email (avoid emojis in subject - they cause encoding issues)
    const testSubject = `Test Email from Podcast Outreach - ${new Date().toLocaleString()}`;
    let testBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #0a9396;">✅ Podcast Outreach Test Email</h2>
  
  <p>This is a test email sent from your Podcast Outreach application.</p>
  
  <p><strong>If you received this email, your Gmail integration is working correctly!</strong></p>
  
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Sent at:</strong> ${new Date().toISOString()}</p>
    <p style="margin: 0;"><strong>Recipient:</strong> ${recipient}</p>
    <p style="margin: 0;"><strong>From:</strong> ${connectedEmail}</p>
  </div>
  
  ${includeTracking ? `
  <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; color: #2e7d32;"><strong>📊 Tracking Enabled</strong></p>
    <p style="margin: 5px 0 0 0; font-size: 14px;">This email includes open tracking. Check your Analytics page after opening!</p>
  </div>
  
  <p>Click this link to test click tracking: <a href="https://www.google.com" style="color: #0a9396;">Test Link</a></p>
  ` : ''}
  
  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
  <p style="font-size: 12px; color: #666;">This is an automated test message from Podcast Outreach.</p>
</body>
</html>`;

    // Add tracking if requested
    if (includeTracking) {
      const { addEmailTracking } = await import("@/lib/email-tracking");
      // Use a dummy touch/podcast ID for testing
      testBody = addEmailTracking(testBody, "test-touch-id", "test-podcast-id");
    }

    const result = await gmail.sendEmail({
      to: recipient,
      subject: testSubject,
      body: testBody,
      isHtml: true,
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${recipient}`,
      details: {
        messageId: result.id,
        threadId: result.threadId,
        sentTo: recipient,
        sentFrom: connectedEmail,
        trackingEnabled: includeTracking,
      },
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to send test email",
    }, { status: 500 });
  }
}
