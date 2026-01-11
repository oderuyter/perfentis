import { useState } from "react";
import { motion } from "framer-motion";
import { X, Music, Send, ExternalLink } from "lucide-react";
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
  PLAYLIST_GENRES,
  PLATFORM_LABELS,
  type PlaylistPlatform,
} from "@/hooks/usePlaylistLibrary";

interface SubmitPlaylistSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubmitPlaylistSheet({ isOpen, onClose }: SubmitPlaylistSheetProps) {
  const [platform, setPlatform] = useState<PlaylistPlatform>("spotify");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverArtUrl, setCoverArtUrl] = useState("");
  const [suggestedGenre, setSuggestedGenre] = useState("");

  const { mutate: submitPlaylist, isPending } = useSubmitPlaylist();

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
          setPlatform("spotify");
          setPlaylistUrl("");
          setName("");
          setDescription("");
          setCoverArtUrl("");
          setSuggestedGenre("");
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
          {/* Platform */}
          <div className="space-y-2">
            <Label>Platform *</Label>
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
          </div>

          {/* Playlist URL */}
          <div className="space-y-2">
            <Label>Playlist URL *</Label>
            <Input
              type="url"
              placeholder="https://open.spotify.com/playlist/..."
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Paste the share link from your music app
            </p>
          </div>

          {/* Playlist Name */}
          <div className="space-y-2">
            <Label>Playlist Name *</Label>
            <Input
              type="text"
              placeholder="My Workout Mix"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What makes this playlist great for workouts?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Cover Art URL */}
          <div className="space-y-2">
            <Label>Cover Image URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={coverArtUrl}
              onChange={(e) => setCoverArtUrl(e.target.value)}
            />
            {coverArtUrl && (
              <div className="mt-2">
                <img
                  src={coverArtUrl}
                  alt="Cover preview"
                  className="h-20 w-20 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
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
          <Button type="submit" className="w-full" disabled={isPending || !playlistUrl || !name}>
            {isPending ? (
              "Submitting..."
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
