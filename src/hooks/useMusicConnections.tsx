import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type MusicProvider = "spotify" | "youtube_music" | "apple_music";
export type ConnectionStatus = "connected" | "disconnected" | "expired";

export interface MusicConnection {
  id: string;
  user_id: string;
  provider: MusicProvider;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface SavedPlaylist {
  id: string;
  user_id: string;
  provider: MusicProvider;
  external_playlist_id: string;
  name: string;
  cover_art_url: string | null;
  track_count: number;
  cached_tracks_json: PlaylistTrack[] | null;
  created_at: string;
  updated_at: string;
}

export interface PlaylistTrack {
  external_track_id: string;
  title: string;
  artist: string;
  duration_seconds: number | null;
  artwork_url: string | null;
  position_index: number;
}

const providerLabels: Record<MusicProvider, string> = {
  spotify: "Spotify",
  youtube_music: "YouTube Music",
  apple_music: "Apple Music",
};

const providerColors: Record<MusicProvider, string> = {
  spotify: "#1DB954",
  youtube_music: "#FF0000",
  apple_music: "#FC3C44",
};

export function useMusicConnections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ["music-connections", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("music_provider_connections")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as MusicConnection[];
    },
    enabled: !!user?.id,
  });

  const connectProvider = useMutation({
    mutationFn: async (provider: MusicProvider) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Check if already connected
      const existing = connections.find(c => c.provider === provider);
      if (existing && existing.status === "connected") {
        throw new Error("Already connected");
      }

      // For now, create a placeholder connection
      // In production, this would initiate OAuth flow
      const { data, error } = await supabase
        .from("music_provider_connections")
        .upsert({
          user_id: user.id,
          provider,
          status: "connected",
          access_token: "placeholder_token",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,provider" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["music-connections"] });
      toast.success(`Connected to ${providerLabels[provider]}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const disconnectProvider = useMutation({
    mutationFn: async (provider: MusicProvider) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("music_provider_connections")
        .update({ status: "disconnected", updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (error) throw error;
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["music-connections"] });
      toast.success(`Disconnected from ${providerLabels[provider]}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getConnectionStatus = (provider: MusicProvider): ConnectionStatus | null => {
    const connection = connections.find(c => c.provider === provider);
    return connection?.status ?? null;
  };

  const isConnected = (provider: MusicProvider): boolean => {
    return getConnectionStatus(provider) === "connected";
  };

  return {
    connections,
    isLoadingConnections,
    connectProvider: connectProvider.mutate,
    disconnectProvider: disconnectProvider.mutate,
    isConnecting: connectProvider.isPending,
    isDisconnecting: disconnectProvider.isPending,
    getConnectionStatus,
    isConnected,
    providerLabels,
    providerColors,
  };
}

export function useSavedPlaylists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["saved-playlists", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("saved_playlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        provider: row.provider as MusicProvider,
        cached_tracks_json: row.cached_tracks_json as unknown as PlaylistTrack[] | null,
      })) as SavedPlaylist[];
    },
    enabled: !!user?.id,
  });

  const savePlaylist = useMutation({
    mutationFn: async (playlist: Omit<SavedPlaylist, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("saved_playlists")
        .insert([{
          user_id: user.id,
          provider: playlist.provider,
          external_playlist_id: playlist.external_playlist_id,
          name: playlist.name,
          cover_art_url: playlist.cover_art_url,
          track_count: playlist.track_count,
          cached_tracks_json: playlist.cached_tracks_json ? JSON.parse(JSON.stringify(playlist.cached_tracks_json)) : null,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-playlists"] });
      toast.success("Playlist saved!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removePlaylist = useMutation({
    mutationFn: async (playlistId: string) => {
      const { error } = await supabase
        .from("saved_playlists")
        .delete()
        .eq("id", playlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-playlists"] });
      toast.success("Playlist removed");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    playlists,
    isLoading,
    savePlaylist: savePlaylist.mutate,
    removePlaylist: removePlaylist.mutate,
    isSaving: savePlaylist.isPending,
    isRemoving: removePlaylist.isPending,
  };
}
