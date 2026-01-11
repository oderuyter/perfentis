import { useState } from "react";
import { motion } from "framer-motion";
import { Music, ChevronRight, ExternalLink, Plus, Check, Link2, Trash2, Send, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMusicConnections, useSavedPlaylists, type MusicProvider, type PlaylistTrack } from "@/hooks/useMusicConnections";
import {
  usePlaylistLibrary,
  useMySubmissions,
  PLAYLIST_GENRES,
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  type PlaylistPlatform,
  type PlaylistLibraryItem,
} from "@/hooks/usePlaylistLibrary";
import { PlaylistDetailSheet } from "@/components/playlists/PlaylistDetailSheet";
import { SubmitPlaylistSheet } from "@/components/playlists/SubmitPlaylistSheet";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const providerLogos: Record<MusicProvider, string> = {
  spotify: "🎵",
  youtube_music: "▶️",
  apple_music: "🍎",
};

const platformLogos: Record<PlaylistPlatform, string> = {
  spotify: "🎵",
  youtube_music: "▶️",
  apple_music: "🍎",
  soundcloud: "☁️",
  tidal: "🌊",
};

interface ProviderCardProps {
  provider: MusicProvider;
  name: string;
  isConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  color: string;
}

function ProviderCard({ provider, name, isConnected, isLoading, onConnect, onDisconnect, color }: ProviderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${color}20` }}
        >
          {providerLogos[provider]}
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {isConnected ? "Connected" : "Not connected"}
          </p>
        </div>
      </div>
      <Button
        variant={isConnected ? "outline" : "default"}
        size="sm"
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isLoading}
        className="min-w-[100px]"
      >
        {isLoading ? (
          "..."
        ) : isConnected ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1" />
            Connected
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Connect
          </>
        )}
      </Button>
    </motion.div>
  );
}

export default function Playlists() {
  const { user } = useAuth();
  const {
    connections,
    isLoadingConnections,
    connectProvider,
    disconnectProvider,
    isConnecting,
    isDisconnecting,
    isConnected,
    providerLabels,
    providerColors,
  } = useMusicConnections();
  
  const { playlists: savedPlaylists, savePlaylist, removePlaylist, isSaving } = useSavedPlaylists();
  
  // Library browsing state
  const [platformFilter, setPlatformFilter] = useState<PlaylistPlatform | undefined>();
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sheet states
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistLibraryItem | null>(null);
  const [submitSheetOpen, setSubmitSheetOpen] = useState(false);
  
  // Fetch library and submissions
  const { data: libraryPlaylists = [], isLoading: loadingLibrary } = usePlaylistLibrary(platformFilter, genreFilter);
  const { data: mySubmissions = [], isLoading: loadingSubmissions } = useMySubmissions();

  // Filter library by search
  const filteredLibrary = libraryPlaylists.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const providers: MusicProvider[] = ["spotify", "youtube_music", "apple_music"];

  if (!user) {
    return (
      <div className="min-h-screen gradient-page pt-safe px-4 pb-28 flex items-center justify-center">
        <div className="text-center">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Sign in to manage your playlists</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
      {/* Ambient glow */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Header */}
      <header className="relative pt-14 pb-4">
        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          Playlists
        </motion.h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse the library, save favorites, and submit your own
        </p>
      </header>

      <Tabs defaultValue="library" className="mt-4">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="submissions">My Submissions</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[150px] h-10 px-4 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Select
              value={platformFilter || "all"}
              onValueChange={(v) => setPlatformFilter(v === "all" ? undefined : v as PlaylistPlatform)}
            >
              <SelectTrigger className="w-32 rounded-xl bg-muted border-0">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {(Object.entries(PLATFORM_LABELS) as [PlaylistPlatform, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-32 rounded-xl bg-muted border-0">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {PLAYLIST_GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit CTA */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSubmitSheetOpen(true)}
            className="w-full card-glass p-4 flex items-center gap-3 text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Submit a Playlist</p>
              <p className="text-xs text-muted-foreground">
                Share your favorite workout playlists with the community
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.button>

          {/* Library Grid */}
          {loadingLibrary ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredLibrary.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-glass p-8 text-center"
            >
              <Music className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No playlists found</p>
              <p className="text-xs text-muted-foreground">
                Be the first to submit a playlist!
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredLibrary.map((playlist, index) => (
                <motion.button
                  key={playlist.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedPlaylist(playlist)}
                  className="card-glass overflow-hidden text-left group"
                >
                  <div className="relative aspect-square">
                    {playlist.cover_art_url ? (
                      <img
                        src={playlist.cover_art_url}
                        alt={playlist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Music className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="font-medium text-white text-sm truncate">{playlist.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          {playlist.genre}
                        </Badge>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="text-sm">{platformLogos[playlist.platform as PlaylistPlatform]}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Saved Playlists Tab */}
        <TabsContent value="saved" className="space-y-4">
          {savedPlaylists.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-glass p-8 text-center"
            >
              <Music className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No saved playlists yet</p>
              <p className="text-xs text-muted-foreground">
                Connect a music service and browse playlists to save them here
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {savedPlaylists.map((playlist, index) => {
                const connection = connections.find(c => c.provider === playlist.provider);
                const needsReconnect = !connection || connection.status !== "connected";
                
                return (
                  <motion.div
                    key={playlist.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-full card-glass p-3 flex items-center gap-3"
                  >
                    {playlist.cover_art_url ? (
                      <img
                        src={playlist.cover_art_url}
                        alt={playlist.name}
                        className={cn(
                          "h-14 w-14 rounded-lg object-cover",
                          needsReconnect && "opacity-50 grayscale"
                        )}
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                        <Music className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium truncate", needsReconnect && "text-muted-foreground")}>
                        {playlist.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm">{providerLogos[playlist.provider]}</span>
                        <span className="text-xs text-muted-foreground">
                          {needsReconnect ? "Reconnect to play" : `${playlist.track_count} tracks`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removePlaylist(playlist.id)}
                      className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* My Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          {/* Submit Button */}
          <Button onClick={() => setSubmitSheetOpen(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Submit a Playlist
          </Button>

          {loadingSubmissions ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : mySubmissions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-glass p-8 text-center"
            >
              <Send className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No submissions yet</p>
              <p className="text-xs text-muted-foreground">
                Submit your favorite playlists for the community to enjoy
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {mySubmissions.map((submission, index) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card-glass p-4"
                >
                  <div className="flex items-start gap-3">
                    {submission.cover_art_url ? (
                      <img
                        src={submission.cover_art_url}
                        alt={submission.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{submission.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: `${PLATFORM_COLORS[submission.platform]}20`,
                            color: PLATFORM_COLORS[submission.platform],
                          }}
                          className="text-xs"
                        >
                          {PLATFORM_LABELS[submission.platform]}
                        </Badge>
                        <Badge
                          variant={
                            submission.status === "approved"
                              ? "default"
                              : submission.status === "rejected"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </Badge>
                      </div>
                      {submission.rejection_reason && (
                        <p className="text-xs text-destructive mt-2">
                          {submission.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-3">
          {providers.map(provider => (
            <ProviderCard
              key={provider}
              provider={provider}
              name={providerLabels[provider]}
              isConnected={isConnected(provider)}
              isLoading={isConnecting || isDisconnecting}
              onConnect={() => connectProvider(provider)}
              onDisconnect={() => disconnectProvider(provider)}
              color={providerColors[provider]}
            />
          ))}
          
          <p className="text-xs text-muted-foreground text-center pt-4">
            Connect your music services to browse and save playlists for quick access during workouts
          </p>
        </TabsContent>
      </Tabs>

      {/* Library Playlist Detail Sheet */}
      {selectedPlaylist && (
        <LibraryPlaylistSheet
          playlist={selectedPlaylist}
          isOpen={!!selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
        />
      )}

      {/* Submit Playlist Sheet */}
      <SubmitPlaylistSheet
        isOpen={submitSheetOpen}
        onClose={() => setSubmitSheetOpen(false)}
      />
    </div>
  );
}

// Simple detail sheet for library playlists
function LibraryPlaylistSheet({
  playlist,
  isOpen,
  onClose,
}: {
  playlist: PlaylistLibraryItem;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
        !isOpen && "pointer-events-none"
      )}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: isOpen ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] overflow-hidden"
      >
        <div className="p-6">
          {/* Handle */}
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />

          {/* Cover */}
          <div className="flex justify-center mb-6">
            {playlist.cover_art_url ? (
              <img
                src={playlist.cover_art_url}
                alt={playlist.name}
                className="h-40 w-40 rounded-xl object-cover shadow-lg"
              />
            ) : (
              <div className="h-40 w-40 rounded-xl bg-muted flex items-center justify-center">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">{playlist.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="secondary">
                {PLATFORM_LABELS[playlist.platform as PlaylistPlatform]}
              </Badge>
              <Badge variant="outline">{playlist.genre}</Badge>
            </div>
            {playlist.description && (
              <p className="text-sm text-muted-foreground mt-3">
                {playlist.description}
              </p>
            )}
          </div>

          {/* Open Link */}
          <Button className="w-full" asChild>
            <a
              href={playlist.playlist_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in {PLATFORM_LABELS[playlist.platform as PlaylistPlatform]}
            </a>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
