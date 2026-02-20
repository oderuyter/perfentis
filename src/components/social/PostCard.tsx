import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Flag,
  MoreHorizontal,
  Trash2,
  EyeOff,
  Lock,
  Pin,
  PinOff,
  User,
  Send,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  SocialPost,
  ReactionType,
  useToggleReaction,
  usePostComments,
  useAddComment,
  useDeleteComment,
  useReportContent,
  usePinPost,
  useDeletePost,
  useHidePost,
  useLockComments,
} from "@/hooks/useSocial";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SocialStatsCard } from "./SocialStatsCard";

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like", emoji: "❤️", label: "Like" },
  { type: "fire", emoji: "🔥", label: "Fire" },
  { type: "strong", emoji: "💪", label: "Strong" },
  { type: "clap", emoji: "👏", label: "Clap" },
  { type: "love", emoji: "😍", label: "Love" },
];

const SCOPE_LABELS: Record<string, string> = {
  public: "Public",
  gym: "Gym",
  event: "Event",
  run_club: "Run Club",
};

function formatTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return format(new Date(dateString), "MMM d");
}

interface PostCardProps {
  post: SocialPost;
  showScopeBadge?: boolean;
}

export function PostCard({ post, showScopeBadge = false }: PostCardProps) {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const [showComments, setShowComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleReaction = useToggleReaction();
  const pinPost = usePinPost();
  const deletePost = useDeletePost();
  const hidePost = useHidePost();
  const lockComments = useLockComments();
  const reportContent = useReportContent();
  const { data: comments = [] } = usePostComments(showComments ? post.id : null);
  const addComment = useAddComment(post.id);
  const deleteComment = useDeleteComment();

  const isOwn = user?.id === post.author_user_id;
  const canModerate = isAdmin();
  const myReaction = post.my_reaction;

  const totalReactions = post.reactions?.reduce((s, r) => s + r.count, 0) || 0;
  const topReactions = post.reactions?.slice(0, 3) || [];

  const handleReaction = (type: ReactionType) => {
    setShowReactionPicker(false);
    toggleReaction.mutate({ postId: post.id, reactionType: type });
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await addComment.mutateAsync(commentText);
    setCommentText("");
  };

  const handleReport = async () => {
    if (!reportReason) return;
    await reportContent.mutateAsync({
      targetType: "post",
      targetId: post.id,
      reason: reportReason as "spam" | "harassment" | "inappropriate_content" | "other",
    });
    setShowReport(false);
    setReportReason("");
  };

  return (
    <>
      <div
        className={cn(
          "bg-card rounded-xl border border-border/50 overflow-hidden",
          post.is_pinned && "border-primary/40 shadow-sm"
        )}
      >
        {/* Pinned banner */}
        {post.is_pinned && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/5 border-b border-primary/10">
            <Pin className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary font-medium">Pinned post</span>
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {post.author?.avatar_url ? (
                  <img src={post.author.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{post.author?.display_name || "User"}</span>
                  {showScopeBadge && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {SCOPE_LABELS[post.scope_type] || post.scope_type}
                    </Badge>
                  )}
                  {post.post_type === "workout_share" && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/40 text-primary">
                      Workout
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{formatTimeAgo(post.created_at)}</p>
              </div>
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                {!isOwn && (
                  <DropdownMenuItem onClick={() => setShowReport(true)}>
                    <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
                    Report
                  </DropdownMenuItem>
                )}
                {(isOwn || canModerate) && (
                  <>
                    <DropdownMenuSeparator />
                    {canModerate && (
                      <>
                        <DropdownMenuItem
                          onClick={() => pinPost.mutate({ postId: post.id, pin: !post.is_pinned })}
                        >
                          {post.is_pinned ? (
                            <><PinOff className="h-4 w-4 mr-2" />Unpin</>
                          ) : (
                            <><Pin className="h-4 w-4 mr-2" />Pin Post</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => hidePost.mutate({ postId: post.id, hide: !post.is_hidden })}
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          {post.is_hidden ? "Unhide" : "Hide Post"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => lockComments.mutate({ postId: post.id, lock: !post.comments_locked })}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          {post.comments_locked ? "Unlock Comments" : "Lock Comments"}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Caption */}
          {post.caption && (
            <p className="text-sm mb-3 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
          )}

          {/* Stats card */}
          {post.post_type === "workout_share" && post.stats_card_data && (
            <div className="mb-3">
              <SocialStatsCard data={post.stats_card_data as Parameters<typeof SocialStatsCard>[0]["data"]} />
            </div>
          )}

          {/* Image */}
          {post.image_url && (
            <div className="rounded-lg overflow-hidden mb-3 aspect-video bg-muted">
              <img src={post.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Reactions + Comments bar */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-3">
              {/* Reaction button */}
              <div className="relative">
                <button
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className={cn(
                    "flex items-center gap-1.5 text-sm transition-colors",
                    myReaction ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                  )}
                  onMouseEnter={() => setShowReactionPicker(true)}
                  onMouseLeave={() => setShowReactionPicker(false)}
                >
                  {myReaction ? (
                    <span className="text-base">
                      {REACTIONS.find((r) => r.type === myReaction)?.emoji || "❤️"}
                    </span>
                  ) : (
                    <Heart className="h-5 w-5" />
                  )}
                  {totalReactions > 0 && (
                    <span className="text-xs font-medium">{totalReactions}</span>
                  )}
                </button>

                {/* Reaction picker */}
                <AnimatePresence>
                  {showReactionPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 4 }}
                      className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-full px-2 py-1.5 flex gap-1 shadow-lg z-10"
                      onMouseEnter={() => setShowReactionPicker(true)}
                      onMouseLeave={() => setShowReactionPicker(false)}
                    >
                      {REACTIONS.map((r) => (
                        <button
                          key={r.type}
                          onClick={() => handleReaction(r.type)}
                          className={cn(
                            "text-xl transition-transform hover:scale-125",
                            myReaction === r.type && "scale-125"
                          )}
                          title={r.label}
                        >
                          {r.emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Top reaction emojis */}
              {topReactions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {topReactions.map((r) => REACTIONS.find((rx) => rx.type === r.reaction_type)?.emoji).join("")}
                </span>
              )}

              {/* Comments */}
              <button
                onClick={() => setShowComments(!showComments)}
                disabled={post.comments_locked}
                className={cn(
                  "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors",
                  post.comments_locked && "opacity-40 cursor-not-allowed"
                )}
              >
                <MessageCircle className="h-5 w-5" />
                {post.comment_count !== undefined && post.comment_count > 0 && (
                  <span className="text-xs font-medium">{post.comment_count}</span>
                )}
                {post.comments_locked && <Lock className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Comments section */}
          <AnimatePresence>
            {showComments && !post.comments_locked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-2.5">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {comment.author?.avatar_url ? (
                          <img src={comment.author.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 bg-muted rounded-lg px-2.5 py-1.5 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium truncate">
                            {comment.author?.display_name || "User"}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 break-words">{comment.text}</p>
                      </div>
                      {(comment.user_id === user?.id || canModerate) && (
                        <button
                          onClick={() => deleteComment.mutate({ commentId: comment.id, postId: post.id })}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add comment */}
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                      className="flex-1 h-8 text-xs"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || addComment.isPending}
                      className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Report dialog */}
      <AlertDialog open={showReport} onOpenChange={setShowReport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Post</AlertDialogTitle>
            <AlertDialogDescription>
              Why are you reporting this content?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-2 my-2">
            {[
              { value: "spam", label: "Spam" },
              { value: "harassment", label: "Harassment" },
              { value: "inappropriate_content", label: "Inappropriate" },
              { value: "other", label: "Other" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setReportReason(option.value)}
                className={cn(
                  "p-2.5 rounded-lg border text-sm transition-colors",
                  reportReason === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport} disabled={!reportReason}>
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deletePost.mutate(post.id); setShowDeleteConfirm(false); }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
