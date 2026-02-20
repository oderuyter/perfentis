import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type ScopeType = "public" | "gym" | "event" | "run_club";
export type ReactionType = "like" | "fire" | "strong" | "clap" | "love";
export type PostType = "workout_share" | "image" | "text" | "mixed";

export interface SocialAuthor {
  display_name: string | null;
  avatar_url: string | null;
}

export interface SocialReactionSummary {
  reaction_type: ReactionType;
  count: number;
}

export interface SocialPost {
  id: string;
  author_user_id: string;
  scope_type: ScopeType;
  scope_id: string | null;
  post_type: PostType;
  caption: string | null;
  image_url: string | null;
  stats_card_data: Record<string, unknown> | null;
  workout_session_id: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_by_user_id: string | null;
  comments_locked: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Enriched
  author?: SocialAuthor;
  reactions?: SocialReactionSummary[];
  my_reaction?: ReactionType | null;
  comment_count?: number;
  scope_label?: string; // e.g. "CrossFit HQ" or "Public"
}

export interface SocialStory {
  id: string;
  author_user_id: string;
  scope_type: ScopeType;
  scope_id: string | null;
  story_type: "text" | "image" | "stats_card";
  caption: string | null;
  media_url: string | null;
  stats_card_data: Record<string, unknown> | null;
  expires_at: string;
  created_at: string;
  author?: SocialAuthor;
  viewed?: boolean;
}

export interface SocialComment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  deleted_at: string | null;
  author?: SocialAuthor;
}

export interface FeedFilter {
  scopeType?: ScopeType;
  scopeId?: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function groupReactions(rawReactions: { reaction_type: string }[]): SocialReactionSummary[] {
  const counts: Record<string, number> = {};
  for (const r of rawReactions) {
    counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([reaction_type, count]) => ({ reaction_type: reaction_type as ReactionType, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── useSocialFeed ───────────────────────────────────────────────────────────

export function useSocialFeed(filter?: FeedFilter) {
  const { user } = useAuth();

  return useQuery<SocialPost[]>({
    queryKey: ["social_feed", filter?.scopeType, filter?.scopeId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("social_posts")
        .select(`
          *,
          profiles:author_user_id(display_name, avatar_url),
          social_reactions(reaction_type, user_id),
          social_comments(id, deleted_at)
        `)
        .is("deleted_at", null)
        .eq("is_hidden", false)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter?.scopeType && filter.scopeType !== "public") {
        query = query.eq("scope_type", filter.scopeType);
        if (filter.scopeId) {
          query = query.eq("scope_id", filter.scopeId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((post: Record<string, unknown>) => {
        const profileData = post.profiles as { display_name: string | null; avatar_url: string | null } | null;
        const rawReactions = (post.social_reactions as Array<{ reaction_type: string; user_id: string }>) || [];
        const rawComments = (post.social_comments as Array<{ id: string; deleted_at: string | null }>) || [];
        const myReaction = user
          ? rawReactions.find((r) => r.user_id === user.id)?.reaction_type as ReactionType | undefined
          : undefined;

        return {
          ...post,
          author: profileData || undefined,
          reactions: groupReactions(rawReactions),
          my_reaction: myReaction || null,
          comment_count: rawComments.filter((c) => !c.deleted_at).length,
        } as SocialPost;
      });
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

// ─── useSocialStories ────────────────────────────────────────────────────────

export function useSocialStories(filter?: FeedFilter) {
  const { user } = useAuth();

  return useQuery<SocialStory[]>({
    queryKey: ["social_stories", filter?.scopeType, filter?.scopeId],
    queryFn: async () => {
      let query = supabase
        .from("social_stories")
        .select(`*, profiles:author_user_id(display_name, avatar_url)`)
        .is("deleted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(30);

      if (filter?.scopeType && filter.scopeType !== "public") {
        query = query.eq("scope_type", filter.scopeType);
        if (filter.scopeId) {
          query = query.eq("scope_id", filter.scopeId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((story: Record<string, unknown>) => ({
        ...story,
        author: story.profiles as SocialAuthor,
      })) as SocialStory[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

// ─── usePostComments ─────────────────────────────────────────────────────────

export function usePostComments(postId: string | null) {
  const { user } = useAuth();

  return useQuery<SocialComment[]>({
    queryKey: ["social_comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_comments")
        .select(`*, profiles:user_id(display_name, avatar_url)`)
        .eq("post_id", postId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((c: Record<string, unknown>) => ({
        ...c,
        author: c.profiles as SocialAuthor,
      })) as SocialComment[];
    },
    enabled: !!user && !!postId,
  });
}

// ─── useCreatePost ───────────────────────────────────────────────────────────

export function useCreatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      caption: string;
      scope_type: ScopeType;
      scope_id?: string;
      post_type?: PostType;
      stats_card_data?: Record<string, unknown>;
      workout_session_id?: string;
      image_url?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const insertPayload = {
        author_user_id: user.id,
        content: payload.caption || "",
        caption: payload.caption,
        scope_type: payload.scope_type,
        scope_id: payload.scope_id || null,
        post_type: payload.post_type || "text",
        stats_card_data: (payload.stats_card_data || null) as unknown as null,
        workout_session_id: payload.workout_session_id || null,
        image_url: payload.image_url || null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("social_posts") as any)
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_feed"] });
      toast.success("Posted!");
    },
    onError: () => toast.error("Failed to post"),
  });
}

// ─── useCreateStory ──────────────────────────────────────────────────────────

export function useCreateStory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      caption?: string;
      scope_type: ScopeType;
      scope_id?: string;
      story_type?: "text" | "image" | "stats_card";
      stats_card_data?: Record<string, unknown>;
      imageFile?: File;
    }) => {
      if (!user) throw new Error("Not authenticated");

      let media_url: string | null = null;

      // Upload image if provided
      if (payload.imageFile) {
        const ext = payload.imageFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("social-stories")
          .upload(path, payload.imageFile, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("social-stories").getPublicUrl(path);
        media_url = urlData.publicUrl;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("social_stories") as any)
        .insert({
          author_user_id: user.id,
          caption: payload.caption || null,
          scope_type: payload.scope_type,
          scope_id: payload.scope_id || null,
          story_type: payload.imageFile ? "image" : (payload.story_type || "text"),
          media_url,
          stats_card_data: payload.stats_card_data || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_stories"] });
      toast.success("Story posted!");
    },
  });
}

// ─── useToggleReaction ───────────────────────────────────────────────────────

export function useToggleReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: ReactionType }) => {
      if (!user) throw new Error("Not authenticated");

      // Check existing reaction
      const { data: existing } = await supabase
        .from("social_reactions")
        .select("id, reaction_type")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction (toggle off)
          await supabase.from("social_reactions").delete().eq("id", existing.id);
          return null;
        } else {
          // Switch reaction
          await supabase
            .from("social_reactions")
            .update({ reaction_type: reactionType })
            .eq("id", existing.id);
          return reactionType;
        }
      } else {
        // Add reaction
        await supabase.from("social_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        });
        return reactionType;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_feed"] });
    },
  });
}

// ─── useAddComment ───────────────────────────────────────────────────────────

export function useAddComment(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("social_comments").insert({
        post_id: postId,
        user_id: user.id,
        text: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["social_feed"] });
    },
    onError: () => toast.error("Failed to post comment"),
  });
}

// ─── useDeleteComment ────────────────────────────────────────────────────────

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      const { error } = await supabase
        .from("social_comments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", commentId);
      if (error) throw error;
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ["social_comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["social_feed"] });
    },
  });
}

// ─── useReportContent ────────────────────────────────────────────────────────

export function useReportContent() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      targetType,
      targetId,
      reason,
      details,
    }: {
      targetType: "post" | "comment" | "story";
      targetId: string;
      reason: "spam" | "harassment" | "inappropriate_content" | "other";
      details?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("social_reports").insert({
        reporter_user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details || null,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Report submitted. Thank you."),
    onError: () => toast.error("Failed to submit report"),
  });
}

// ─── usePinPost ──────────────────────────────────────────────────────────────

export function usePinPost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, pin }: { postId: string; pin: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("social_posts")
        .update({
          is_pinned: pin,
          pinned_at: pin ? new Date().toISOString() : null,
          pinned_by_user_id: pin ? user.id : null,
        })
        .eq("id", postId);
      if (error) {
        if (error.message?.includes("PIN_LIMIT_EXCEEDED")) {
          toast.error("Max 3 pinned posts per community. Unpin one first.");
        } else {
          toast.error("Failed to pin post");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_feed"] });
      toast.success("Post updated");
    },
  });
}

// ─── useDeletePost ───────────────────────────────────────────────────────────

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("social_posts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_feed"] });
      toast.success("Post deleted");
    },
  });
}

// ─── useHidePost (moderator) ─────────────────────────────────────────────────

export function useHidePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, hide }: { postId: string; hide: boolean }) => {
      const { error } = await supabase
        .from("social_posts")
        .update({ is_hidden: hide })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_feed"] });
    },
  });
}

// ─── useLockComments ────────────────────────────────────────────────────────

export function useLockComments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, lock }: { postId: string; lock: boolean }) => {
      const { error } = await supabase
        .from("social_posts")
        .update({ comments_locked: lock })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_feed"] });
    },
  });
}

// ─── useAdminSocialData ──────────────────────────────────────────────────────

export function useAdminSocialData() {
  return useQuery({
    queryKey: ["admin_social_reports"],
    queryFn: async () => {
      const [reportsRes, statsRes] = await Promise.all([
        supabase
          .from("social_reports")
          .select(`*, profiles:reporter_user_id(display_name)`)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("social_posts")
          .select("id, is_hidden, deleted_at, created_at")
          .limit(1000),
      ]);

      return {
        reports: reportsRes.data || [],
        allPosts: statsRes.data || [],
      };
    },
    staleTime: 30_000,
  });
}

export function useAdminModerationAction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      action_type: string;
      target_type: "post" | "comment" | "story" | "user";
      target_id: string;
      reason?: string;
      scope_type?: string;
      scope_id?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("social_moderation_actions").insert({
        actor_user_id: user.id,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_social_reports"] });
      queryClient.invalidateQueries({ queryKey: ["social_feed"] });
    },
  });
}

// ─── useUserMemberships (for feed selector) ──────────────────────────────────

export function useUserCommunities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_communities", user?.id],
    queryFn: async () => {
      if (!user) return { gyms: [], events: [], runClubs: [] };

      const [gymsRes, eventsRes, rcRes] = await Promise.all([
        supabase
          .from("memberships")
          .select("gym_id, gyms(id, name)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .is("suspended_at", null),
        supabase
          .from("event_registrations")
          .select("event_id, events(id, name)")
          .eq("user_id", user.id)
          .eq("status", "confirmed"),
        supabase
          .from("run_club_members")
          .select("run_club_id, run_clubs(id, name)")
          .eq("user_id", user.id)
          .eq("status", "active"),
      ]);

      // Deduplicate by id
      const uniqueById = <T extends { id: unknown }>(arr: T[]) =>
        arr.filter((item, idx, self) => self.findIndex((x) => x.id === item.id) === idx);

      return {
        gyms: uniqueById((gymsRes.data || []).map((m: Record<string, unknown>) => {
          const gym = m.gyms as { id: string; name: string } | null;
          return { id: gym?.id || String(m.gym_id), name: gym?.name || "Gym" };
        })),
        events: uniqueById((eventsRes.data || []).map((m: Record<string, unknown>) => {
          const ev = m.events as { id: string; name: string } | null;
          return { id: ev?.id || String(m.event_id), name: ev?.name || "Event" };
        })),
        runClubs: uniqueById((rcRes.data || []).map((m: Record<string, unknown>) => {
          const rc = m.run_clubs as { id: string; name: string } | null;
          return { id: rc?.id || String(m.run_club_id), name: rc?.name || "Run Club" };
        })),
      };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}
