import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { integrationSettings } from "../route";

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// Helper to get API key (provided > saved > env var)
function resolveApiKey(integration: string, providedKey?: string): string | undefined {
  if (providedKey) return providedKey;
  if (integrationSettings[integration]?.apiKey) return integrationSettings[integration].apiKey;

  switch (integration) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "listennotes":
      return process.env.LISTEN_NOTES_API_KEY;
    case "resend":
      return process.env.RESEND_API_KEY;
    case "zerobounce":
      return process.env.ZEROBOUNCE_API_KEY;
    default:
      return undefined;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<TestResult>> {
  try {
    const body = await request.json();
    const { integration, apiKey, clientId, clientSecret, apiSecret } = body;

    switch (integration) {
      case "anthropic":
        return NextResponse.json(await testAnthropic(resolveApiKey("anthropic", apiKey)));

      case "openai":
        return NextResponse.json(await testOpenAI(resolveApiKey("openai", apiKey)));

      case "spotify":
        return NextResponse.json(await testSpotify(clientId, clientSecret));

      case "podcastindex":
        return NextResponse.json(await testPodcastIndex(apiKey, apiSecret));

      case "listennotes":
        return NextResponse.json(await testListenNotes(resolveApiKey("listennotes", apiKey)));

      case "apple":
        return NextResponse.json(await testApplePodcasts());

      case "gmail":
        return NextResponse.json(await testGmail());

      case "resend":
        return NextResponse.json(await testResend(resolveApiKey("resend", apiKey)));

      case "zerobounce":
        return NextResponse.json(await testZeroBounce(resolveApiKey("zerobounce", apiKey)));

      default:
        return NextResponse.json({ success: false, message: "Unknown integration" }, { status: 400 });
    }
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Test failed"
    }, { status: 500 });
  }
}

async function testAnthropic(apiKey?: string): Promise<TestResult> {
  if (!apiKey) {
    return { success: false, message: "No API key configured" };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say 'connected'" }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "Claude API connected successfully",
        details: { model: "claude-3-haiku-20240307" }
      };
    } else {
      const error = await response.json();
      return {
        success: false,
        message: error.error?.message || "API connection failed"
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  }
}

async function testOpenAI(apiKey?: string): Promise<TestResult> {
  if (!apiKey) {
    return { success: false, message: "No API key configured" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return {
        success: true,
        message: "OpenAI API connected successfully"
      };
    } else {
      const error = await response.json();
      return {
        success: false,
        message: error.error?.message || "API connection failed"
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  }
}

async function testSpotify(providedClientId?: string, providedClientSecret?: string): Promise<TestResult> {
  // Use provided credentials or fall back to env vars or saved settings
  const clientId = providedClientId || integrationSettings.spotify?.config?.clientId || process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = providedClientSecret || integrationSettings.spotify?.config?.clientSecret || process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { success: false, message: "Spotify credentials not configured. Enter Client ID and Client Secret." };
  }

  try {
    // Get access token using client credentials flow
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();

      // Test API with a simple search
      const searchResponse = await fetch(
        "https://api.spotify.com/v1/search?q=podcast&type=show&limit=1",
        {
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
          },
        }
      );

      if (searchResponse.ok) {
        return {
          success: true,
          message: "Spotify API connected successfully",
          details: { tokenType: tokenData.token_type, expiresIn: tokenData.expires_in }
        };
      }
    }

    return { success: false, message: "Failed to authenticate with Spotify. Check your credentials." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  }
}

async function testPodcastIndex(providedApiKey?: string, providedApiSecret?: string): Promise<TestResult> {
  // Use provided credentials or fall back to env vars or saved settings
  const apiKey = providedApiKey || integrationSettings.podcastindex?.config?.apiKey || process.env.PODCAST_INDEX_API_KEY;
  const apiSecret = providedApiSecret || integrationSettings.podcastindex?.config?.apiSecret || process.env.PODCAST_INDEX_API_SECRET;

  if (!apiKey || !apiSecret) {
    return { success: false, message: "PodcastIndex credentials not configured. Enter API Key and API Secret." };
  }

  try {
    const apiHeaderTime = Math.floor(Date.now() / 1000);
    const hash = crypto
      .createHash("sha1")
      .update(apiKey + apiSecret + apiHeaderTime)
      .digest("hex");

    const response = await fetch(
      "https://api.podcastindex.org/api/1.0/search/byterm?q=technology&max=1",
      {
        headers: {
          "X-Auth-Date": apiHeaderTime.toString(),
          "X-Auth-Key": apiKey,
          "Authorization": hash,
          "User-Agent": "PodcastOutreach/1.0",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "PodcastIndex API connected successfully",
        details: { status: data.status, description: data.description }
      };
    }

    return { success: false, message: "API connection failed. Check your credentials." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  }
}

async function testListenNotes(apiKey?: string): Promise<TestResult> {
  if (!apiKey) {
    return { success: false, message: "ListenNotes API key not configured" };
  }

  try {
    const response = await fetch(
      "https://listen-api.listennotes.com/api/v2/search?q=technology&type=podcast&len_min=1",
      {
        headers: {
          "X-ListenAPI-Key": apiKey,
        },
      }
    );

    if (response.ok) {
      return {
        success: true,
        message: "ListenNotes API connected successfully"
      };
    } else if (response.status === 401) {
      return { success: false, message: "Invalid API key" };
    }

    return { success: false, message: "API connection failed" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  }
}

async function testApplePodcasts(): Promise<TestResult> {
  try {
    const response = await fetch(
      "https://itunes.apple.com/search?term=podcast&media=podcast&entity=podcast&limit=1"
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "Apple Podcasts API connected successfully",
        details: { resultCount: data.resultCount }
      };
    }

    return { success: false, message: "API connection failed" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  }
}

async function testGmail(): Promise<TestResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { success: false, message: "Gmail OAuth credentials not configured" };
  }

  return {
    success: true,
    message: "Gmail OAuth configured. Click 'Connect' to authorize."
  };
}

async function testResend(apiKey?: string): Promise<TestResult> {
  if (!apiKey) {
    return { success: false, message: "Resend API key not configured" };
  }

  try {
    // Test by fetching domains - this validates the API key
    const response = await fetch("https://api.resend.com/domains", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "Resend API connected successfully",
        details: { domains: data.data?.length || 0 }
      };
    } else if (response.status === 401) {
      return { success: false, message: "Invalid API key" };
    }

    return { success: false, message: "API connection failed" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  }
}

async function testZeroBounce(apiKey?: string): Promise<TestResult> {
  if (!apiKey) {
    return { success: false, message: "ZeroBounce API key not configured" };
  }

  try {
    // Test by checking credits - this validates the API key
    const response = await fetch(
      `https://api.zerobounce.net/v2/getcredits?api_key=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.Credits !== undefined) {
        return {
          success: true,
          message: `ZeroBounce API connected (${data.Credits} credits remaining)`,
          details: { credits: data.Credits }
        };
      }
    }

    // Check for error response
    const errorData = await response.json().catch(() => ({}));
    if (errorData.error) {
      return { success: false, message: errorData.error };
    }

    return { success: false, message: "Invalid API key" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  }
}
