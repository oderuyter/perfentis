import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type PlaylistPlatform = 'spotify' | 'youtube_music' | 'apple_music' | 'soundcloud' | 'tidal';

export interface PlaylistLibraryItem {
  id: string;
  platform: PlaylistPlatform;
  playlist_url: string;
  name: string;
  description: string | null;
  cover_art_url: string | null;
  genre: string;
  track_count: number | null;
  submitted_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaylistSubmission {
  id: string;
  user_id: string;
  platform: PlaylistPlatform;
  playlist_url: string;
  name: string;
  description: string | null;
  cover_art_url: string | null;
  suggested_genre: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PLAYLIST_GENRES = [
  'general',
  'hip-hop',
  'electronic',
  'rock',
  'pop',
  'metal',
  'r&b',
  'latin',
  'country',
  'classical',
  'jazz',
  'indie',
  'ambient',
  'workout',
  'running',
  'hiit',
  'yoga',
  'stretching',
] as const;

export const PLATFORM_LABELS: Record<PlaylistPlatform, string> = {
  spotify: 'Spotify',
  youtube_music: 'YouTube Music',
  apple_music: 'Apple Music',
  soundcloud: 'SoundCloud',
  tidal: 'Tidal',
};

export const PLATFORM_COLORS: Record<PlaylistPlatform, string> = {
  spotify: '#1DB954',
  youtube_music: '#FF0000',
  apple_music: '#FC3C44',
  soundcloud: '#FF5500',
  tidal: '#000000',
};

// Hook for browsing the public playlist library
export function usePlaylistLibrary(platformFilter?: PlaylistPlatform, genreFilter?: string) {
  return useQuery({
    queryKey: ['playlist-library', platformFilter, genreFilter],
    queryFn: async () => {
      let query = supabase
        .from('playlist_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (platformFilter) {
        query = query.eq('platform', platformFilter);
      }

      if (genreFilter && genreFilter !== 'all') {
        query = query.eq('genre', genreFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PlaylistLibraryItem[];
    },
  });
}

// Hook for user's own submissions
export function useMySubmissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-playlist-submissions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('playlist_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PlaylistSubmission[];
    },
    enabled: !!user,
  });
}

// Hook for submitting a playlist
export function useSubmitPlaylist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (submission: {
      platform: PlaylistPlatform;
      playlist_url: string;
      name: string;
      description?: string;
      cover_art_url?: string;
      suggested_genre?: string;
    }) => {
      if (!user) throw new Error('Must be logged in to submit');

      const { data, error } = await supabase
        .from('playlist_submissions')
        .insert({
          user_id: user.id,
          platform: submission.platform,
          playlist_url: submission.playlist_url,
          name: submission.name,
          description: submission.description || null,
          cover_art_url: submission.cover_art_url || null,
          suggested_genre: submission.suggested_genre || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-playlist-submissions'] });
      toast.success('Playlist submitted for review!');
    },
    onError: (error) => {
      toast.error('Failed to submit playlist: ' + error.message);
    },
  });
}

// Admin hooks
export function useAllSubmissions(statusFilter?: 'pending' | 'approved' | 'rejected') {
  return useQuery({
    queryKey: ['admin-playlist-submissions', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('playlist_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PlaylistSubmission[];
    },
  });
}

export function useApproveSubmission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      submission,
      genre,
    }: {
      submission: PlaylistSubmission;
      genre: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Add to library
      const { error: libraryError } = await supabase
        .from('playlist_library')
        .insert({
          platform: submission.platform,
          playlist_url: submission.playlist_url,
          name: submission.name,
          description: submission.description,
          cover_art_url: submission.cover_art_url,
          genre: genre,
          submitted_by: submission.user_id,
          approved_by: user.id,
        });

      if (libraryError) throw libraryError;

      // Update submission status
      const { error: updateError } = await supabase
        .from('playlist_submissions')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlist-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-library'] });
      toast.success('Playlist approved and added to library!');
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    },
  });
}

export function useRejectSubmission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      submissionId,
      reason,
    }: {
      submissionId: string;
      reason?: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('playlist_submissions')
        .update({
          status: 'rejected',
          rejection_reason: reason || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-playlist-submissions'] });
      toast.success('Submission rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject: ' + error.message);
    },
  });
}

export function useUpdateLibraryPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<PlaylistLibraryItem, 'name' | 'description' | 'genre' | 'cover_art_url'>>;
    }) => {
      const { error } = await supabase
        .from('playlist_library')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist-library'] });
      toast.success('Playlist updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
}

export function useDeleteLibraryPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('playlist_library')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist-library'] });
      toast.success('Playlist removed from library');
    },
    onError: (error) => {
      toast.error('Failed to remove: ' + error.message);
    },
  });
}

export function useAddToLibrary() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (playlist: {
      platform: PlaylistPlatform;
      playlist_url: string;
      name: string;
      description?: string;
      cover_art_url?: string;
      genre: string;
      track_count?: number;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('playlist_library')
        .insert({
          ...playlist,
          approved_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist-library'] });
      toast.success('Playlist added to library');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    },
  });
}
