import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Music, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useSubmitPlaylist,
  fetchPlaylistMetadata,
  PLAYLIST_GENRES,
  PLATFORM_LABELS,
  type PlaylistPlatform,
} from "@/hooks/usePlaylistLibrary";

interface SubmitPlaylistSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// Detect platform from URL
function detectPlatformFromUrl(url: string): PlaylistPlatform | null {
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("music.youtube.com") || url.includes("youtube.com")) return "youtube_music";
  if (url.includes("music.apple.com")) return "apple_music";
  if (url.includes("soundcloud.com")) return "soundcloud";
  if (url.includes("tidal.com")) return "tidal";
  return null;
}

export function SubmitPlaylistSheet({ isOpen, onClose }: SubmitPlaylistSheetProps) {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverArtUrl, setCoverArtUrl] = useState("");
  const [suggestedGenre, setSuggestedGenre] = useState("");
  const [platform, setPlatform] = useState<PlaylistPlatform>("spotify");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadataFetched, setMetadataFetched] = useState(false);

  const { mutate: submitPlaylist, isPending } = useSubmitPlaylist();

  // Auto-fetch metadata when URL changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!playlistUrl || playlistUrl.length < 20) {
        setMetadataFetched(false);
        return;
      }

      // Detect platform from URL
      const detectedPlatform = detectPlatformFromUrl(playlistUrl);
      if (detectedPlatform) {
        setPlatform(detectedPlatform);
      }

      // Only fetch if it looks like a valid URL
      if (!playlistUrl.startsWith("http")) return;

      setIsFetchingMetadata(true);
      setMetadataFetched(false);

      try {
        const metadata = await fetchPlaylistMetadata(playlistUrl);
        
        if (metadata) {
          if (metadata.name && !name) {
            setName(metadata.name);
          }
          if (metadata.description && !description) {
            setDescription(metadata.description);
          }
          if (metadata.cover_art_url) {
            setCoverArtUrl(metadata.cover_art_url);
          }
          if (metadata.platform) {
            setPlatform(metadata.platform as PlaylistPlatform);
          }
          setMetadataFetched(true);
        }
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      } finally {
        setIsFetchingMetadata(false);
      }
    };

    const debounce = setTimeout(fetchMetadata, 500);
    return () => clearTimeout(debounce);
  }, [playlistUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!playlistUrl || !name) return;

    submitPlaylist(
      {
        platform,
        playlist_url: playlistUrl,
        name,
        description: description || undefined,
        cover_art_url: coverArtUrl || undefined,
        suggested_genre: suggestedGenre || undefined,
      },
      {
        onSuccess: () => {
          // Reset form
          setPlaylistUrl("");
          setName("");
          setDescription("");
          setCoverArtUrl("");
          setSuggestedGenre("");
          setPlatform("spotify");
          setMetadataFetched(false);
          onClose();
        },
      }
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Submit a Playlist
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[calc(85vh-100px)] pb-8">
          {/* Playlist URL - Primary input */}
          <div className="space-y-2">
            <Label>Playlist URL *</Label>
            <div className="relative">
              <Input
                type="url"
                placeholder="Paste your playlist link here..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                required
                className="pr-10"
              />
              {isFetchingMetadata && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {metadataFetched && !isFetchingMetadata && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Paste the share link from Spotify, YouTube Music, Apple Music, etc.
            </p>
          </div>

          {/* Cover Art Preview */}
          {coverArtUrl && (
            <div className="flex justify-center">
              <img
                src={coverArtUrl}
                alt="Playlist cover"
                className="h-32 w-32 rounded-xl object-cover shadow-lg"
                onError={() => setCoverArtUrl("")}
              />
            </div>
          )}

          {/* Platform (auto-detected but editable) */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as PlaylistPlatform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PLATFORM_LABELS) as [PlaylistPlatform, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto-detected from URL
            </p>
          </div>

          {/* Playlist Name */}
          <div className="space-y-2">
            <Label>Playlist Name *</Label>
            <Input
              type="text"
              placeholder="e.g. My Workout Mix"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {metadataFetched && (
              <p className="text-xs text-muted-foreground">
                Auto-filled from playlist
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="What makes this playlist great for workouts?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Suggested Genre */}
          <div className="space-y-2">
            <Label>Suggested Genre</Label>
            <Select value={suggestedGenre} onValueChange={setSuggestedGenre}>
              <SelectTrigger>
                <SelectValue placeholder="Select a genre..." />
              </SelectTrigger>
              <SelectContent>
                {PLAYLIST_GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isPending || isFetchingMetadata || !playlistUrl || !name}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Submissions are reviewed by our team before being added to the library
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
