import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Heart, 
  MessageCircle, 
  X,
  Image as ImageIcon,
  Send,
  User
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  user_id: string;
  text: string;
  image_url: string | null;
  created_at: string;
  likes?: number;
  comments?: number;
  liked?: boolean;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
}

// Mock posts for demo
const mockPosts: Post[] = [
  {
    id: "1",
    user_id: "u1",
    text: "Just crushed my morning workout! 5x5 squats at a new PR weight. Feeling strong! 💪",
    image_url: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes: 24,
    comments: 3,
    liked: false,
    author: { display_name: "Alex Runner", avatar_url: null },
  },
  {
    id: "2",
    user_id: "u2",
    text: "Day 30 of my fitness journey. The consistency is paying off. Remember: progress, not perfection!",
    image_url: null,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    likes: 45,
    comments: 8,
    liked: true,
    author: { display_name: "Jamie Fit", avatar_url: null },
  },
  {
    id: "3",
    user_id: "u3",
    text: "Post-run recovery stretch session. Taking care of the body is just as important as pushing it.",
    image_url: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    likes: 18,
    comments: 2,
    liked: false,
    author: { display_name: "Taylor Swift Runner", avatar_url: null },
  },
];

export default function Social() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [localLikes, setLocalLikes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      // Merge with mock data for demo
      setPosts([...data, ...mockPosts.slice(0, 3 - Math.min(data.length, 3))]);
    }
    
    setLoading(false);
  };

  const handleCreatePost = async () => {
    if (!user || !newPostText.trim()) return;

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      text: newPostText.trim(),
    });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post created!");
      setNewPostText("");
      setShowCreatePost(false);
      fetchPosts();
    }
  };

  const handleLike = async (postId: string) => {
    setLocalLikes((prev) => ({ ...prev, [postId]: !prev[postId] }));
    // In production, this would call the API
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(date, "MMM d");
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-safe px-4 pb-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-safe px-4 pb-24">
      {/* Header */}
      <header className="pt-6 pb-4 flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-semibold tracking-tight"
          >
            Social
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-muted-foreground text-sm mt-1"
          >
            Community feed
          </motion.p>
        </div>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => setShowCreatePost(true)}
          className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
        </motion.button>
      </header>

      {/* Feed */}
      <div className="mt-4 space-y-4">
        {posts.map((post, idx) => {
          const isLiked = localLikes[post.id] ?? post.liked;
          const likeCount = (post.likes || 0) + (localLikes[post.id] && !post.liked ? 1 : 0) - (localLikes[post.id] === false && post.liked ? 1 : 0);

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card rounded-xl p-4 shadow-card border border-border/50"
            >
              {/* Author */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  {post.author?.avatar_url ? (
                    <img
                      src={post.author.avatar_url}
                      alt={post.author.display_name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {post.author?.display_name || "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(post.created_at)}
                  </p>
                </div>
              </div>

              {/* Content */}
              <p className="text-sm mb-3 whitespace-pre-wrap">{post.text}</p>

              {post.image_url && (
                <div className="rounded-lg overflow-hidden mb-3 bg-muted aspect-video">
                  <img
                    src={post.image_url}
                    alt="Post image"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <Heart
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isLiked ? "fill-destructive text-destructive" : "text-muted-foreground"
                    )}
                  />
                  <span className={isLiked ? "text-destructive" : "text-muted-foreground"}>
                    {likeCount}
                  </span>
                </button>
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.comments || 0}</span>
                </button>
              </div>
            </motion.div>
          );
        })}

        {posts.length === 0 && (
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
            <p className="text-muted-foreground">No posts yet</p>
            <button
              onClick={() => setShowCreatePost(true)}
              className="text-sm text-accent-foreground mt-2"
            >
              Create the first post
            </button>
          </div>
        )}
      </div>

      {/* Create Post Sheet */}
      <AnimatePresence>
        {showCreatePost && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[120]"
              onClick={() => setShowCreatePost(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] shadow-elevated max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 pb-0 relative flex-shrink-0">
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="absolute right-4 top-4 p-2 rounded-full bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
                <h2 className="text-lg font-semibold">Create Post</h2>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 pb-footer-safe">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  rows={5}
                  className="resize-none mb-4"
                  autoFocus
                />

                <div className="flex items-center gap-3 mb-4">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm opacity-50" disabled>
                    <ImageIcon className="h-4 w-4" />
                    Add Photo
                  </button>
                </div>

                <Button
                  onClick={handleCreatePost}
                  className="w-full"
                  disabled={!newPostText.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
