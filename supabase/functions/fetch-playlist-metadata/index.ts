import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PlaylistMetadata {
  name?: string;
  description?: string;
  cover_art_url?: string;
  track_count?: number;
  tracks?: Array<{
    title: string;
    artist?: string;
    duration_seconds?: number;
  }>;
  platform: string;
}

// Extract Spotify playlist ID from URL
function extractSpotifyId(url: string): string | null {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// Extract YouTube Music playlist ID from URL
function extractYouTubePlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}

// Detect platform from URL
function detectPlatform(url: string): string {
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("music.youtube.com") || url.includes("youtube.com")) return "youtube_music";
  if (url.includes("music.apple.com")) return "apple_music";
  if (url.includes("soundcloud.com")) return "soundcloud";
  if (url.includes("tidal.com")) return "tidal";
  return "unknown";
}

// Fetch Spotify playlist metadata using public embed endpoint
async function fetchSpotifyMetadata(playlistId: string): Promise<PlaylistMetadata | null> {
  try {
    // Use Spotify's oEmbed endpoint which doesn't require authentication
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${playlistId}`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      console.error("Spotify oEmbed failed:", response.status);
      return null;
    }
    
    const data = await response.json();
    
    return {
      name: data.title || undefined,
      description: data.provider_name ? `Playlist on ${data.provider_name}` : undefined,
      cover_art_url: data.thumbnail_url || undefined,
      platform: "spotify",
    };
  } catch (error) {
    console.error("Error fetching Spotify metadata:", error);
    return null;
  }
}

// For other platforms, return basic info
function getBasicMetadata(url: string, platform: string): PlaylistMetadata {
  return {
    platform,
    name: undefined,
    description: undefined,
    cover_art_url: undefined,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const platform = detectPlatform(url);
    let metadata: PlaylistMetadata | null = null;

    switch (platform) {
      case "spotify": {
        const playlistId = extractSpotifyId(url);
        if (playlistId) {
          metadata = await fetchSpotifyMetadata(playlistId);
        }
        break;
      }
      case "youtube_music": {
        // YouTube requires API key for metadata, return basic info
        metadata = getBasicMetadata(url, platform);
        break;
      }
      default:
        metadata = getBasicMetadata(url, platform);
    }

    if (!metadata) {
      metadata = { platform };
    }

    return new Response(
      JSON.stringify({ success: true, metadata }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-playlist-metadata:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
