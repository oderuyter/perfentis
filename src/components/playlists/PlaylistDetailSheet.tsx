import { motion, AnimatePresence } from "framer-motion";
import { X, Music, ExternalLink, Plus, Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MusicProvider, PlaylistTrack } from "@/hooks/useMusicConnections";

interface PlaylistDetailSheetProps {
  playlist: {
    provider: MusicProvider;
    external_playlist_id: string;
    name: string;
    cover_art_url: string;
    track_count: number;
    cached_tracks_json: PlaylistTrack[];
  };
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onSave: () => void;
  isSaving: boolean;
}

const providerLabels: Record<MusicProvider, string> = {
  spotify: "Spotify",
  youtube_music: "YouTube Music",
  apple_music: "Apple Music",
};

const providerDeepLinks: Record<MusicProvider, (id: string) => string> = {
  spotify: (id) => `https://open.spotify.com/playlist/${id}`,
  youtube_music: (id) => `https://music.youtube.com/playlist?list=${id}`,
  apple_music: (id) => `https://music.apple.com/playlist/${id}`,
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PlaylistDetailSheet({
  playlist,
  isOpen,
  onClose,
  isSaved,
  onSave,
  isSaving,
}: PlaylistDetailSheetProps) {
  const deepLink = providerDeepLinks[playlist.provider](playlist.external_playlist_id);
  
  const handleOpenInProvider = () => {
    window.open(deepLink, "_blank");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 max-h-[85vh] flex flex-col shadow-elevated"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="px-6 pb-4 flex gap-4">
              {playlist.cover_art_url ? (
                <img
                  src={playlist.cover_art_url}
                  alt={playlist.name}
                  className="h-24 w-24 rounded-xl object-cover shadow-md"
                />
              ) : (
                <div className="h-24 w-24 rounded-xl bg-muted flex items-center justify-center">
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 py-1">
                <h2 className="text-xl font-bold truncate">{playlist.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {providerLabels[playlist.provider]} • {playlist.track_count} tracks
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-4 flex gap-2">
              <Button
                onClick={onSave}
                disabled={isSaved || isSaving}
                className="flex-1"
              >
                {isSaved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Save to My App
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleOpenInProvider}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Open in {providerLabels[playlist.provider]}
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </Button>
            </div>

            {/* Track list */}
            <div className="flex-1 overflow-y-auto border-t border-border">
              <p className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tracks
              </p>
              
              {playlist.cached_tracks_json.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Track list not available
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Open in {providerLabels[playlist.provider]} to view tracks
                  </p>
                </div>
              ) : (
                <div className="pb-safe">
                  {playlist.cached_tracks_json.map((track, index) => (
                    <div
                      key={track.external_track_id}
                      className="px-6 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="w-6 text-center text-sm text-muted-foreground">
                        {index + 1}
                      </span>
                      {track.artwork_url ? (
                        <img
                          src={track.artwork_url}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Music className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(track.duration_seconds)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
