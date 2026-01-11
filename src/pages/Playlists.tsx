import { useState } from "react";
import { motion } from "framer-motion";
import { Music, ChevronRight, ExternalLink, Plus, Check, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useMusicConnections, useSavedPlaylists, type MusicProvider, type PlaylistTrack } from "@/hooks/useMusicConnections";
import { PlaylistDetailSheet } from "@/components/playlists/PlaylistDetailSheet";
import { useAuth } from "@/hooks/useAuth";

// Mock playlist data for browsing
const mockBrowsePlaylists = [
  {
    provider: "spotify" as MusicProvider,
    external_playlist_id: "pl1",
    name: "Workout Beats",
    cover_art_url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=300&h=300&fit=crop",
    track_count: 42,
    cached_tracks_json: [
      { external_track_id: "t1", title: "Stronger", artist: "Kanye West", duration_seconds: 312, artwork_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100", position_index: 0 },
      { external_track_id: "t2", title: "Pump It", artist: "Black Eyed Peas", duration_seconds: 213, artwork_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100", position_index: 1 },
      { external_track_id: "t3", title: "Eye of the Tiger", artist: "Survivor", duration_seconds: 245, artwork_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100", position_index: 2 },
    ] as PlaylistTrack[],
  },
  {
    provider: "spotify" as MusicProvider,
    external_playlist_id: "pl2",
    name: "Running Mix",
    cover_art_url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=300&h=300&fit=crop",
    track_count: 28,
    cached_tracks_json: [
      { external_track_id: "t4", title: "Run Boy Run", artist: "Woodkid", duration_seconds: 216, artwork_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100", position_index: 0 },
    ] as PlaylistTrack[],
  },
  {
    provider: "youtube_music" as MusicProvider,
    external_playlist_id: "pl3",
    name: "Gym Pump",
    cover_art_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=300&fit=crop",
    track_count: 56,
    cached_tracks_json: [] as PlaylistTrack[],
  },
  {
    provider: "apple_music" as MusicProvider,
    external_playlist_id: "pl4",
    name: "Morning Motivation",
    cover_art_url: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&h=300&fit=crop",
    track_count: 35,
    cached_tracks_json: [] as PlaylistTrack[],
  },
];

const providerLogos: Record<MusicProvider, string> = {
  spotify: "🎵",
  youtube_music: "▶️",
  apple_music: "🍎",
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
  
  const [selectedPlaylist, setSelectedPlaylist] = useState<typeof mockBrowsePlaylists[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<MusicProvider | "all">("all");

  // Filter browse playlists based on connected providers
  const connectedProviders = connections
    .filter(c => c.status === "connected")
    .map(c => c.provider);
  
  const availablePlaylists = mockBrowsePlaylists.filter(p =>
    connectedProviders.includes(p.provider)
  );

  const filteredPlaylists = availablePlaylists.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = providerFilter === "all" || p.provider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const isPlaylistSaved = (externalId: string, provider: MusicProvider) => {
    return savedPlaylists.some(p => p.external_playlist_id === externalId && p.provider === provider);
  };

  const handleSavePlaylist = (playlist: typeof mockBrowsePlaylists[0]) => {
    savePlaylist({
      provider: playlist.provider,
      external_playlist_id: playlist.external_playlist_id,
      name: playlist.name,
      cover_art_url: playlist.cover_art_url,
      track_count: playlist.track_count,
      cached_tracks_json: playlist.cached_tracks_json,
    });
  };

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
          Connect music services and save your workout playlists
        </p>
      </header>

      <Tabs defaultValue="saved" className="mt-4">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

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
                  <motion.button
                    key={playlist.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => !needsReconnect && setSelectedPlaylist({
                      provider: playlist.provider,
                      external_playlist_id: playlist.external_playlist_id,
                      name: playlist.name,
                      cover_art_url: playlist.cover_art_url || "",
                      track_count: playlist.track_count,
                      cached_tracks_json: (playlist.cached_tracks_json as PlaylistTrack[]) || [],
                    })}
                    className="w-full card-glass p-3 flex items-center gap-3 text-left"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlaylist(playlist.id);
                      }}
                      className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-4">
          {connectedProviders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-glass p-8 text-center"
            >
              <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No music services connected</p>
              <p className="text-xs text-muted-foreground">
                Go to Services tab to connect Spotify, YouTube Music, or Apple Music
              </p>
            </motion.div>
          ) : (
            <>
              {/* Search and filter */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search playlists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 h-10 px-4 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value as MusicProvider | "all")}
                  className="h-10 px-3 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">All</option>
                  {connectedProviders.map(p => (
                    <option key={p} value={p}>{providerLabels[p]}</option>
                  ))}
                </select>
              </div>

              {/* Playlist grid */}
              <div className="grid grid-cols-2 gap-3">
                {filteredPlaylists.map((playlist, index) => {
                  const saved = isPlaylistSaved(playlist.external_playlist_id, playlist.provider);
                  
                  return (
                    <motion.button
                      key={playlist.external_playlist_id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedPlaylist(playlist)}
                      className="card-glass overflow-hidden text-left group"
                    >
                      <div className="relative aspect-square">
                        <img
                          src={playlist.cover_art_url}
                          alt={playlist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="font-medium text-white text-sm truncate">{playlist.name}</p>
                          <p className="text-xs text-white/70">{playlist.track_count} tracks</p>
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <span className="text-sm">{providerLogos[playlist.provider]}</span>
                          {saved && (
                            <span className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {filteredPlaylists.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No playlists found</p>
              )}
            </>
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

      {/* Playlist Detail Sheet */}
      {selectedPlaylist && (
        <PlaylistDetailSheet
          playlist={selectedPlaylist}
          isOpen={!!selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
          isSaved={isPlaylistSaved(selectedPlaylist.external_playlist_id, selectedPlaylist.provider)}
          onSave={() => handleSavePlaylist(selectedPlaylist)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
