import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, User, ChevronLeft, ChevronRight } from "lucide-react";
import { SocialStory, ScopeType, useCreateStory } from "@/hooks/useSocial";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { SocialStatsCard } from "./SocialStatsCard";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface StoriesRowProps {
  stories: SocialStory[];
  scopeType?: ScopeType;
  scopeId?: string;
}

export function StoriesRow({ stories, scopeType = "public", scopeId }: StoriesRowProps) {
  const { user } = useAuth();
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [storyText, setStoryText] = useState("");
  const createStory = useCreateStory();

  const handleCreate = async () => {
    if (!storyText.trim()) return;
    await createStory.mutateAsync({
      caption: storyText.trim(),
      scope_type: scopeType,
      scope_id: scopeId,
      story_type: "text",
    });
    setStoryText("");
    setShowCreate(false);
  };

  const currentStory = viewingIndex !== null ? stories[viewingIndex] : null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-4">
        {/* Add story button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="h-14 w-14 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-[10px] text-muted-foreground">Your Story</span>
        </button>

        {stories.map((story, idx) => {
          const initials = story.author?.display_name?.charAt(0)?.toUpperCase() || "?";
          const isOwn = story.author_user_id === user?.id;
          return (
            <button
              key={story.id}
              onClick={() => setViewingIndex(idx)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center text-sm font-bold border-2",
                  isOwn
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-accent bg-accent/10 text-accent-foreground"
                )}
              >
                {story.author?.avatar_url ? (
                  <img
                    src={story.author.avatar_url}
                    alt={story.author.display_name || ""}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[56px] truncate">
                {isOwn ? "You" : story.author?.display_name || "User"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Story viewer */}
      <AnimatePresence>
        {viewingIndex !== null && currentStory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-[200]"
              onClick={() => setViewingIndex(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-x-4 top-16 bottom-16 z-[210] flex flex-col bg-card rounded-2xl overflow-hidden shadow-2xl max-w-sm mx-auto"
            >
              {/* Progress bar */}
              <div className="flex gap-1 p-2">
                {stories.map((_, i) => (
                  <div key={i} className={cn("h-0.5 flex-1 rounded-full", i === viewingIndex ? "bg-primary" : i < viewingIndex ? "bg-primary/60" : "bg-muted")} />
                ))}
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  {currentStory.author?.avatar_url ? (
                    <img src={currentStory.author.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{currentStory.author?.display_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(currentStory.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={() => setViewingIndex(null)} className="p-1.5 rounded-full bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 flex items-center justify-center p-6">
                {currentStory.story_type === "stats_card" && currentStory.stats_card_data ? (
                  <SocialStatsCard data={currentStory.stats_card_data as Parameters<typeof SocialStatsCard>[0]["data"]} />
                ) : (
                  <p className="text-lg font-medium text-center">{currentStory.caption}</p>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between p-4">
                <button
                  onClick={() => setViewingIndex(Math.max(0, viewingIndex - 1))}
                  disabled={viewingIndex === 0}
                  className="p-2 rounded-full bg-muted disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    if (viewingIndex < stories.length - 1) setViewingIndex(viewingIndex + 1);
                    else setViewingIndex(null);
                  }}
                  className="p-2 rounded-full bg-muted"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create story sheet */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[120]"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] p-6 pb-footer-safe"
            >
              <h2 className="text-lg font-semibold mb-4">Add Story</h2>
              <Textarea
                placeholder="Share something with your community..."
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                rows={4}
                className="resize-none mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!storyText.trim() || createStory.isPending}
                  onClick={handleCreate}
                >
                  Post Story
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
