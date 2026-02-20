import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const discoverySchema = z.object({
  type: z.enum(["seed_guest", "category", "guest_appearances"]),
  query: z.string().min(1),
  category: z.string().optional(),
  limit: z.number().default(50),
});

// ============================================================
// Apple Podcasts (iTunes) - always available, no API key needed
// ============================================================

interface ApplePodcastResult {
  collectionId: number;
  collectionName: string;
  artistName: string;
  collectionViewUrl: string;
  artworkUrl100?: string;
  artworkUrl600?: string;
  primaryGenreName?: string;
  genres?: string[];
  trackCount?: number;
  releaseDate?: string;
  country?: string;
  contentAdvisoryRating?: string;
  feedUrl?: string;
}

async function searchApplePodcasts(query: string, limit: number) {
  const cappedLimit = Math.min(limit, 200); // iTunes max is 200
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&limit=${cappedLimit}&country=US`;

  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      console.error("Apple API error:", response.status);
      return [];
    }

    const data = await response.json();

    return (data.results || [])
      .filter((item: ApplePodcastResult) =>
        item.collectionViewUrl && item.collectionId && item.collectionName
      )
      .map((item: ApplePodcastResult) => ({
        showName: item.collectionName,
        hostName: item.artistName || null,
        showDescription: null,
        primaryPlatformUrl: item.collectionViewUrl,
        applePodcastUrl: item.collectionViewUrl,
        websiteUrl: null,
        spotifyUrl: null,
        dedupeKey: `apple:${item.collectionId}`,
        recentEpisodeTitles: [],
        recentGuests: [],
        primaryEmail: null,
        primaryEmailSourceUrl: null,
        backupEmail: null,
        backupEmailSourceUrl: null,
        discoverySource: "Apple Podcasts",
        riskSignals: detectRiskSignals(item),
        artworkUrl: item.artworkUrl600 || item.artworkUrl100 || null,
        genre: item.primaryGenreName || null,
        genres: item.genres || [],
        episodeCount: item.trackCount || 0,
        lastReleaseDate: item.releaseDate || null,
        country: item.country || null,
        contentRating: item.contentAdvisoryRating || null,
        feedUrl: item.feedUrl || null,
      }));
  } catch (error) {
    console.error("Apple search error:", error);
    return [];
  }
}

// Search Apple for episodes (guest appearances)
async function searchAppleEpisodes(personName: string, limit: number) {
  const cappedLimit = Math.min(limit, 200);
  // Search for podcast episodes mentioning the person
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(personName)}&media=podcast&entity=podcastEpisode&limit=${cappedLimit}&country=US`;

  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) return [];

    const data = await response.json();
    
    // Group episodes by their parent podcast (collectionId)
    const podcastMap = new Map<number, {
      collectionId: number;
      collectionName: string;
      artistName: string;
      collectionViewUrl: string;
      artworkUrl600?: string;
      artworkUrl100?: string;
      primaryGenreName?: string;
      genres?: string[];
      trackCount?: number;
      releaseDate?: string;
      contentAdvisoryRating?: string;
      feedUrl?: string;
      matchingEpisodes: string[];
    }>();

    for (const ep of (data.results || [])) {
      if (!ep.collectionId || !ep.collectionName) continue;

      if (!podcastMap.has(ep.collectionId)) {
        podcastMap.set(ep.collectionId, {
          collectionId: ep.collectionId,
          collectionName: ep.collectionName,
          artistName: ep.artistName || "",
          collectionViewUrl: ep.collectionViewUrl || "",
          artworkUrl600: ep.artworkUrl600,
          artworkUrl100: ep.artworkUrl100,
          primaryGenreName: ep.primaryGenreName,
          genres: ep.genres,
          trackCount: ep.trackCount,
          releaseDate: ep.releaseDate,
          contentAdvisoryRating: ep.contentAdvisoryRating,
          feedUrl: ep.feedUrl,
          matchingEpisodes: [],
        });
      }

      const podcast = podcastMap.get(ep.collectionId)!;
      if (ep.trackName) {
        podcast.matchingEpisodes.push(ep.trackName);
      }
    }

    // Convert to our standard format, sorted by number of matching episodes
    return Array.from(podcastMap.values())
      .sort((a, b) => b.matchingEpisodes.length - a.matchingEpisodes.length)
      .map((item) => ({
        showName: item.collectionName,
        hostName: item.artistName || null,
        showDescription: null,
        primaryPlatformUrl: item.collectionViewUrl,
        applePodcastUrl: item.collectionViewUrl,
        websiteUrl: null,
        spotifyUrl: null,
        dedupeKey: `apple:${item.collectionId}`,
        recentEpisodeTitles: item.matchingEpisodes.slice(0, 5),
        recentGuests: [personName],
        primaryEmail: null,
        primaryEmailSourceUrl: null,
        backupEmail: null,
        backupEmailSourceUrl: null,
        discoverySource: `Apple Podcasts (${item.matchingEpisodes.length} episode${item.matchingEpisodes.length !== 1 ? "s" : ""})`,
        riskSignals: detectRiskSignals(item as any),
        artworkUrl: item.artworkUrl600 || item.artworkUrl100 || null,
        genre: item.primaryGenreName || null,
        genres: (item.genres || []).map(g => typeof g === "string" ? g : (g as any).name || ""),
        episodeCount: item.trackCount || 0,
        lastReleaseDate: item.releaseDate || null,
        country: null,
        contentRating: item.contentAdvisoryRating || null,
        feedUrl: item.feedUrl || null,
      }));
  } catch (error) {
    console.error("Apple episode search error:", error);
    return [];
  }
}

// ============================================================
// PodcastIndex - requires API key + secret
// ============================================================

function getPodcastIndexHeaders(): Record<string, string> | null {
  const apiKey = process.env.PODCAST_INDEX_API_KEY;
  const apiSecret = process.env.PODCAST_INDEX_API_SECRET;
  if (!apiKey || !apiSecret) return null;

  const apiHeaderTime = Math.floor(Date.now() / 1000);
  const hash = crypto
    .createHash("sha1")
    .update(apiKey + apiSecret + apiHeaderTime)
    .digest("hex");

  return {
    "X-Auth-Date": apiHeaderTime.toString(),
    "X-Auth-Key": apiKey,
    "Authorization": hash,
    "User-Agent": "PodcastOutreach/1.0",
  };
}

async function searchPodcastIndex(query: string, limit: number) {
  const headers = getPodcastIndexHeaders();
  if (!headers) return [];

  try {
    const url = `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(query)}&max=${Math.min(limit, 100)}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return [];

    const data = await response.json();
    return (data.feeds || []).map((feed: any) => ({
      showName: feed.title,
      hostName: feed.author || feed.ownerName || null,
      showDescription: feed.description || null,
      primaryPlatformUrl: feed.link || feed.url,
      applePodcastUrl: feed.itunesId ? `https://podcasts.apple.com/podcast/id${feed.itunesId}` : null,
      websiteUrl: feed.link || null,
      spotifyUrl: null,
      dedupeKey: `podcastindex:${feed.id}`,
      recentEpisodeTitles: [],
      recentGuests: [],
      primaryEmail: feed.ownerEmail || null,
      primaryEmailSourceUrl: null,
      backupEmail: null,
      backupEmailSourceUrl: null,
      discoverySource: "PodcastIndex",
      riskSignals: [] as string[],
      artworkUrl: feed.image || feed.artwork || null,
      genre: feed.categories ? Object.values(feed.categories)[0] || null : null,
      genres: feed.categories ? Object.values(feed.categories) : [],
      episodeCount: feed.episodeCount || 0,
      lastReleaseDate: feed.newestItemPubdate ? new Date(feed.newestItemPubdate * 1000).toISOString() : null,
      country: null,
      contentRating: feed.explicit ? "Explicit" : null,
      feedUrl: feed.url || null,
    }));
  } catch (error) {
    console.error("PodcastIndex search error:", error);
    return [];
  }
}

// PodcastIndex episode search (for guest appearances)
async function searchPodcastIndexEpisodes(personName: string, limit: number) {
  const headers = getPodcastIndexHeaders();
  if (!headers) return [];

  try {
    const url = `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(personName)}&max=${Math.min(limit, 100)}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return [];

    const data = await response.json();
    return (data.feeds || []).map((feed: any) => ({
      showName: feed.title,
      hostName: feed.author || feed.ownerName || null,
      showDescription: feed.description || null,
      primaryPlatformUrl: feed.link || feed.url,
      applePodcastUrl: feed.itunesId ? `https://podcasts.apple.com/podcast/id${feed.itunesId}` : null,
      websiteUrl: feed.link || null,
      spotifyUrl: null,
      dedupeKey: `podcastindex:${feed.id}`,
      recentEpisodeTitles: [],
      recentGuests: [personName],
      primaryEmail: feed.ownerEmail || null,
      primaryEmailSourceUrl: null,
      backupEmail: null,
      backupEmailSourceUrl: null,
      discoverySource: "PodcastIndex",
      riskSignals: [] as string[],
      artworkUrl: feed.image || feed.artwork || null,
      genre: feed.categories ? Object.values(feed.categories)[0] || null : null,
      genres: feed.categories ? Object.values(feed.categories) : [],
      episodeCount: feed.episodeCount || 0,
      lastReleaseDate: feed.newestItemPubdate ? new Date(feed.newestItemPubdate * 1000).toISOString() : null,
      country: null,
      contentRating: feed.explicit ? "Explicit" : null,
      feedUrl: feed.url || null,
    }));
  } catch (error) {
    console.error("PodcastIndex episode search error:", error);
    return [];
  }
}

// ============================================================
// Spotify - requires client ID + secret
// ============================================================

let spotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string | null> {
  if (spotifyToken && spotifyToken.expiresAt > Date.now()) return spotifyToken.token;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (response.ok) {
      const data = await response.json();
      spotifyToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
      };
      return spotifyToken.token;
    }
  } catch (error) {
    console.error("Failed to get Spotify token:", error);
  }
  return null;
}

async function searchSpotify(query: string, limit: number) {
  const token = await getSpotifyToken();
  if (!token) return [];

  try {
    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "show");
    searchUrl.searchParams.set("market", "US");
    searchUrl.searchParams.set("limit", Math.min(limit, 50).toString());

    const response = await fetch(searchUrl.toString(), {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.shows?.items || []).map((show: any) => ({
      showName: show.name,
      hostName: show.publisher || null,
      showDescription: show.description || null,
      primaryPlatformUrl: show.external_urls?.spotify || null,
      applePodcastUrl: null,
      websiteUrl: null,
      spotifyUrl: show.external_urls?.spotify || null,
      dedupeKey: `spotify:${show.id}`,
      recentEpisodeTitles: [],
      recentGuests: [],
      primaryEmail: null,
      primaryEmailSourceUrl: null,
      backupEmail: null,
      backupEmailSourceUrl: null,
      discoverySource: "Spotify",
      riskSignals: show.explicit ? ["EXPLICIT_CONTENT"] : [],
      artworkUrl: show.images?.[0]?.url || null,
      genre: null,
      genres: [] as string[],
      episodeCount: show.total_episodes || 0,
      lastReleaseDate: null,
      country: null,
      contentRating: show.explicit ? "Explicit" : null,
      feedUrl: null,
    }));
  } catch (error) {
    console.error("Spotify search error:", error);
    return [];
  }
}

// ============================================================
// Helpers
// ============================================================

function detectRiskSignals(item: ApplePodcastResult): string[] {
  const signals: string[] = [];
  const rawGenres = item.genres || [];
  const genres = rawGenres.map(g =>
    (typeof g === "string" ? g : (g as any).name || "").toLowerCase()
  );

  if (item.contentAdvisoryRating === "Explicit") {
    signals.push("EXPLICIT_CONTENT");
  }
  if (genres.includes("politics") || genres.includes("government")) {
    signals.push("POTENTIAL_POLITICS");
  }
  if (item.releaseDate) {
    const lastRelease = new Date(item.releaseDate);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (lastRelease < oneYearAgo) {
      signals.push("POTENTIALLY_INACTIVE");
    }
  }
  if (item.trackCount && item.trackCount < 10) {
    signals.push("FEW_EPISODES");
  }
  return signals;
}

/**
 * Deduplicate results from multiple sources by normalized show name.
 * Prefers results with more data (artwork, description, email).
 */
function deduplicateResults(results: any[]): any[] {
  const seen = new Map<string, any>();

  for (const result of results) {
    const normalizedName = (result.showName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    
    if (seen.has(normalizedName)) {
      // Merge: keep the one with more data, but combine sources
      const existing = seen.get(normalizedName);
      const existingSources = existing.discoverySource || "";
      const newSource = result.discoverySource || "";
      
      // Prefer the one with artwork, email, description
      const existingScore = (existing.artworkUrl ? 1 : 0) + (existing.primaryEmail ? 2 : 0) + (existing.showDescription ? 1 : 0) + (existing.episodeCount || 0 > 0 ? 1 : 0);
      const newScore = (result.artworkUrl ? 1 : 0) + (result.primaryEmail ? 2 : 0) + (result.showDescription ? 1 : 0) + (result.episodeCount || 0 > 0 ? 1 : 0);
      
      if (newScore > existingScore) {
        seen.set(normalizedName, {
          ...result,
          discoverySource: `${newSource}, ${existingSources}`,
          // Merge URLs from both
          applePodcastUrl: result.applePodcastUrl || existing.applePodcastUrl,
          spotifyUrl: result.spotifyUrl || existing.spotifyUrl,
          websiteUrl: result.websiteUrl || existing.websiteUrl,
          primaryEmail: result.primaryEmail || existing.primaryEmail,
          recentEpisodeTitles: result.recentEpisodeTitles?.length > 0 ? result.recentEpisodeTitles : existing.recentEpisodeTitles,
        });
      } else {
        seen.set(normalizedName, {
          ...existing,
          discoverySource: `${existingSources}, ${newSource}`,
          applePodcastUrl: existing.applePodcastUrl || result.applePodcastUrl,
          spotifyUrl: existing.spotifyUrl || result.spotifyUrl,
          websiteUrl: existing.websiteUrl || result.websiteUrl,
          primaryEmail: existing.primaryEmail || result.primaryEmail,
          recentEpisodeTitles: existing.recentEpisodeTitles?.length > 0 ? existing.recentEpisodeTitles : result.recentEpisodeTitles,
        });
      }
    } else {
      seen.set(normalizedName, result);
    }
  }

  return Array.from(seen.values());
}

// ============================================================
// Main POST handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, query, category, limit } = discoverySchema.parse(body);

    let results: any[] = [];
    let sources: string[] = ["Apple Podcasts"];

    if (type === "guest_appearances") {
      // ─── Guest Appearances: search EPISODES across all sources ───
      // This finds podcasts where a person has appeared as a guest
      const [appleEpisodes, podcastIndexResults] = await Promise.all([
        searchAppleEpisodes(query, limit),
        searchPodcastIndexEpisodes(query, Math.min(limit, 100)),
      ]);

      results = [...appleEpisodes, ...podcastIndexResults];
      sources = ["Apple Podcasts"];
      if (podcastIndexResults.length > 0) sources.push("PodcastIndex");

      // Deduplicate across sources
      results = deduplicateResults(results);

    } else if (type === "seed_guest") {
      // ─── Seed Guest: search by person name + optional categories ───
      if (category) {
        const categories = category.split(",").map((c) => c.trim()).filter(Boolean);
        const allResults: any[] = [];

        // Search each category combination across all sources in parallel
        const searchPromises: Promise<any[]>[] = [];

        for (const cat of categories) {
          const searchQuery = `${query} ${cat} podcast`;
          searchPromises.push(searchApplePodcasts(searchQuery, Math.ceil(limit / categories.length) + 10));
          searchPromises.push(searchPodcastIndex(searchQuery, Math.ceil(limit / categories.length) + 10));
          searchPromises.push(searchSpotify(searchQuery, Math.min(Math.ceil(limit / categories.length) + 10, 50)));
        }

        // Also do a plain name search
        searchPromises.push(searchApplePodcasts(query, 30));
        searchPromises.push(searchPodcastIndex(query, 30));
        searchPromises.push(searchSpotify(query, 30));

        const allSearchResults = await Promise.all(searchPromises);
        for (const batch of allSearchResults) {
          allResults.push(...batch);
        }

        // Deduplicate
        results = deduplicateResults(allResults);

        // Boost results matching categories
        const categoryLower = categories.map((c) => c.toLowerCase());
        results = results
          .map((r: any) => {
            const genres = ((r.genres as string[]) || []).map((g: string) => g.toLowerCase());
            const genreStr = genres.join(" ");
            const showName = ((r.showName as string) || "").toLowerCase();
            const desc = ((r.showDescription as string) || "").toLowerCase();
            const matchesCategory = categoryLower.some(
              (cat) => genreStr.includes(cat) || showName.includes(cat) || desc.includes(cat)
            );
            return { ...r, _matchesCategory: matchesCategory, recentGuests: [query] };
          })
          .sort((a: any, b: any) => {
            if (a._matchesCategory && !b._matchesCategory) return -1;
            if (!a._matchesCategory && b._matchesCategory) return 1;
            return 0;
          })
          .map(({ _matchesCategory, ...rest }: any) => rest)
          .slice(0, limit);

        sources = ["Apple Podcasts", "PodcastIndex", "Spotify"];
      } else {
        // No category - search all sources for the name
        const [appleResults, piResults, spotifyResults] = await Promise.all([
          searchApplePodcasts(query, limit),
          searchPodcastIndex(query, Math.min(limit, 100)),
          searchSpotify(query, Math.min(limit, 50)),
        ]);

        results = deduplicateResults([...appleResults, ...piResults, ...spotifyResults]);
        results = results.map((r: any) => ({ ...r, recentGuests: [query] }));
        sources = ["Apple Podcasts"];
        if (piResults.length > 0) sources.push("PodcastIndex");
        if (spotifyResults.length > 0) sources.push("Spotify");
      }

    } else {
      // ─── Category search: search all sources in parallel ───
      const [appleResults, piResults, spotifyResults] = await Promise.all([
        searchApplePodcasts(query, limit),
        searchPodcastIndex(query, Math.min(limit, 100)),
        searchSpotify(query, Math.min(limit, 50)),
      ]);

      results = deduplicateResults([...appleResults, ...piResults, ...spotifyResults]);
      sources = ["Apple Podcasts"];
      if (piResults.length > 0) sources.push("PodcastIndex");
      if (spotifyResults.length > 0) sources.push("Spotify");
    }

    // Final limit
    results = results.slice(0, limit);

    return NextResponse.json({
      results,
      count: results.length,
      query,
      type,
      sources,
      platform: sources.join(", "),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Discovery error:", error);
    return NextResponse.json(
      { error: "Discovery failed" },
      { status: 500 }
    );
  }
}
