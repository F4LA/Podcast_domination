import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getSetting } from "./settings";

// Lazy-loaded clients (only initialized when first used, not at build time)
let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

export type AIProvider = "anthropic" | "openai";

/**
 * Detect which AI provider is available.
 * Checks database settings first (via getSetting), then falls back to env vars.
 * Prefers whichever key is configured. If both are available, prefers Anthropic.
 */
export async function getAvailableProvider(): Promise<AIProvider | null> {
  const anthropicKey = await getSetting("ANTHROPIC_API_KEY");
  if (anthropicKey) return "anthropic";

  const openaiKey = await getSetting("OPENAI_API_KEY");
  if (openaiKey) return "openai";

  return null;
}

export async function getAnthropicClient(): Promise<Anthropic> {
  if (!_anthropic) {
    const apiKey = await getSetting("ANTHROPIC_API_KEY");
    _anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

export async function getOpenAIClient(): Promise<OpenAI> {
  if (!_openai) {
    const apiKey = await getSetting("OPENAI_API_KEY");
    _openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// Default model configurations
export const AI_CONFIG = {
  claude: {
    model: "claude-sonnet-4-20250514",
    maxTokens: 4096,
  },
  gpt: {
    model: "gpt-4o",
    maxTokens: 4096,
  },
} as const;

/**
 * Unified AI completion function that works with either Anthropic or OpenAI.
 * Automatically detects which provider is available.
 */
export async function aiComplete(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number } = {}
): Promise<string> {
  const provider = await getAvailableProvider();

  if (!provider) {
    throw new Error(
      "No AI API key configured. Please add either OPENAI_API_KEY or ANTHROPIC_API_KEY in Settings."
    );
  }

  const maxTokens = options.maxTokens || 4096;

  if (provider === "anthropic") {
    const anthropic = await getAnthropicClient();
    const response = await anthropic.messages.create({
      model: AI_CONFIG.claude.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Anthropic");
    }
    return content.text;
  } else {
    const openai = await getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.gpt.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("No response from OpenAI");
    }
    return text;
  }
}

// Analyze podcast for pitch angles
export async function analyzePodcastForAngles(
  podcastName: string,
  podcastDescription: string,
  recentEpisodes: { title: string; description?: string }[],
  guestProfile: string
): Promise<{
  angles: Array<{
    title: string;
    description: string;
    hook: string;
    talkingPoints: string[];
    relevanceScore: number;
  }>;
}> {
  const episodeContext = recentEpisodes
    .map((ep) => `- ${ep.title}${ep.description ? `: ${ep.description}` : ""}`)
    .join("\n");

  const systemPrompt = "You are an expert podcast analyst. Respond with valid JSON only.";

  const userPrompt = `Analyze this podcast and generate 2-3 compelling pitch angles for a guest appearance.

PODCAST: ${podcastName}
DESCRIPTION: ${podcastDescription}

RECENT EPISODES:
${episodeContext}

GUEST PROFILE:
${guestProfile}

Generate pitch angles that:
1. Align with the podcast's themes and audience
2. Offer unique value the guest can provide
3. Include a compelling hook for the email
4. Have specific talking points

Respond in JSON format:
{
  "angles": [
    {
      "title": "Brief angle title",
      "description": "Why this angle works for this podcast",
      "hook": "Opening sentence for the pitch email",
      "talkingPoints": ["Point 1", "Point 2", "Point 3"],
      "relevanceScore": 0.85
    }
  ]
}`;

  const text = await aiComplete(systemPrompt, userPrompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");
  return JSON.parse(jsonMatch[0]);
}

// Generate personalized email draft
export async function generateEmailDraft(
  podcastName: string,
  hostName: string,
  angle: {
    title: string;
    hook: string;
    talkingPoints: string[];
  },
  guestProfile: string,
  template?: string
): Promise<{
  subject: string;
  body: string;
}> {
  const systemPrompt = "You are an expert email copywriter for podcast guest outreach. Respond with valid JSON only.";

  const userPrompt = `Write a personalized podcast guest pitch email.

PODCAST: ${podcastName}
HOST: ${hostName}
ANGLE: ${angle.title}
HOOK: ${angle.hook}
TALKING POINTS: ${angle.talkingPoints.join(", ")}

GUEST PROFILE:
${guestProfile}

${template ? `USE THIS TEMPLATE STRUCTURE:\n${template}` : ""}

Write a concise, personalized email that:
1. Opens with a genuine connection to their show
2. Clearly states the value proposition
3. Includes 2-3 specific talking points
4. Has a clear call to action
5. Keeps it under 200 words

Respond in JSON format:
{
  "subject": "Email subject line",
  "body": "Full email body"
}`;

  const text = await aiComplete(systemPrompt, userPrompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");
  return JSON.parse(jsonMatch[0]);
}
