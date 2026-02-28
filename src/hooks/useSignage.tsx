import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SignagePlaylist {
  id: string;
  owner_type: "gym" | "coach";
  owner_id: string;
  name: string;
  is_active: boolean;
  shuffle: boolean;
  transition_style: "fade" | "cut";
  default_slide_duration_seconds: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignageSlide {
  id: string;
  playlist_id: string;
  media_type: "image" | "video" | "text";
  image_url: string | null;
  caption: string | null;
  duration_seconds: number | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignageAssignment {
  id: string;
  display_id: string;
  playlist_id: string;
  assignment_mode: "inherited_default" | "explicit";
  created_at: string;
  updated_at: string;
}

export function useSignage(ownerType: "gym" | "coach", ownerId: string | null) {
  const [playlists, setPlaylists] = useState<SignagePlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlaylists = useCallback(async () => {
    if (!ownerId) { setPlaylists([]); setIsLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("display_signage_playlists")
        .select("*")
        .eq("owner_type", ownerType)
        .eq("owner_id", ownerId)
        .order("created_at");
      if (error) throw error;
      setPlaylists((data || []) as SignagePlaylist[]);
    } catch (err) {
      console.error("Error fetching playlists:", err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  const createPlaylist = async (name: string) => {
    if (!ownerId) return null;
    try {
      const { data, error } = await supabase
        .from("display_signage_playlists")
        .insert({ owner_type: ownerType, owner_id: ownerId, name })
        .select()
        .single();
      if (error) throw error;
      toast.success("Playlist created");
      fetchPlaylists();
      return data as SignagePlaylist;
    } catch (err: any) {
      toast.error(err.message || "Failed to create playlist");
      return null;
    }
  };

  const updatePlaylist = async (id: string, updates: Partial<Pick<SignagePlaylist, "name" | "is_active" | "shuffle" | "transition_style" | "default_slide_duration_seconds" | "is_default">>) => {
    try {
      // If setting as default, unset others first
      if (updates.is_default && ownerId) {
        await supabase
          .from("display_signage_playlists")
          .update({ is_default: false })
          .eq("owner_type", ownerType)
          .eq("owner_id", ownerId)
          .neq("id", id);
      }
      const { error } = await supabase.from("display_signage_playlists").update(updates).eq("id", id);
      if (error) throw error;
      toast.success("Playlist updated");
      fetchPlaylists();
    } catch (err: any) {
      toast.error(err.message || "Failed to update playlist");
    }
  };

  const deletePlaylist = async (id: string) => {
    try {
      const { error } = await supabase.from("display_signage_playlists").delete().eq("id", id);
      if (error) throw error;
      toast.success("Playlist deleted");
      fetchPlaylists();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete playlist");
    }
  };

  // Slides
  const fetchSlides = async (playlistId: string) => {
    const { data, error } = await supabase
      .from("display_signage_slides")
      .select("*")
      .eq("playlist_id", playlistId)
      .order("order_index");
    if (error) { console.error(error); return []; }
    return (data || []) as SignageSlide[];
  };

  const addSlide = async (playlistId: string, imageUrl: string, orderIndex: number, caption?: string) => {
    try {
      const { data, error } = await supabase
        .from("display_signage_slides")
        .insert({ playlist_id: playlistId, image_url: imageUrl, order_index: orderIndex, caption: caption || null })
        .select()
        .single();
      if (error) throw error;
      return data as SignageSlide;
    } catch (err: any) {
      toast.error(err.message || "Failed to add slide");
      return null;
    }
  };

  const updateSlide = async (id: string, updates: Partial<Pick<SignageSlide, "caption" | "duration_seconds" | "order_index" | "is_active">>) => {
    try {
      const { error } = await supabase.from("display_signage_slides").update(updates).eq("id", id);
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to update slide");
    }
  };

  const deleteSlide = async (id: string) => {
    try {
      const { error } = await supabase.from("display_signage_slides").delete().eq("id", id);
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slide");
    }
  };

  const uploadSlideImage = async (file: File, playlistId: string): Promise<string | null> => {
    if (!ownerId) return null;
    const path = `${ownerType}/${ownerId}/${playlistId}/${Date.now()}_${file.name}`;
    try {
      const { error } = await supabase.storage.from("signage").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("signage").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
      return null;
    }
  };

  // Assignments
  const fetchAssignments = async () => {
    if (!ownerId) return [];
    // Get all display IDs for this owner first
    const { data: displays } = await supabase
      .from("displays")
      .select("id")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId);
    if (!displays?.length) return [];
    const { data, error } = await supabase
      .from("display_signage_assignments")
      .select("*")
      .in("display_id", displays.map(d => d.id));
    if (error) { console.error(error); return []; }
    return (data || []) as SignageAssignment[];
  };

  const assignPlaylist = async (displayId: string, playlistId: string, mode: "inherited_default" | "explicit" = "explicit") => {
    try {
      const { error } = await supabase
        .from("display_signage_assignments")
        .upsert({ display_id: displayId, playlist_id: playlistId, assignment_mode: mode }, { onConflict: "display_id" });
      if (error) throw error;
      toast.success("Playlist assigned");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign playlist");
    }
  };

  const removeAssignment = async (displayId: string) => {
    try {
      const { error } = await supabase.from("display_signage_assignments").delete().eq("display_id", displayId);
      if (error) throw error;
      toast.success("Assignment removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove assignment");
    }
  };

  const assignToAllDisplays = async (playlistId: string) => {
    if (!ownerId) return;
    try {
      const { data: displays } = await supabase
        .from("displays")
        .select("id")
        .eq("owner_type", ownerType)
        .eq("owner_id", ownerId);
      if (!displays?.length) return;
      
      const upserts = displays.map(d => ({
        display_id: d.id,
        playlist_id: playlistId,
        assignment_mode: "inherited_default" as const,
      }));
      const { error } = await supabase.from("display_signage_assignments").upsert(upserts, { onConflict: "display_id" });
      if (error) throw error;
      toast.success("Playlist assigned to all displays");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign to all displays");
    }
  };

  return {
    playlists,
    isLoading,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    fetchSlides,
    addSlide,
    updateSlide,
    deleteSlide,
    uploadSlideImage,
    fetchAssignments,
    assignPlaylist,
    removeAssignment,
    assignToAllDisplays,
    refetch: fetchPlaylists,
  };
}
