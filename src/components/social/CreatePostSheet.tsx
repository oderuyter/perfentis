import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Building2, Flag, Footprints, Send, BookOpen } from "lucide-react";
import { ScopeType, useCreatePost, useUserCommunities } from "@/hooks/useSocial";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CreatePostSheetProps {
  open: boolean;
  onClose: () => void;
  defaultScopeType?: ScopeType;
  defaultScopeId?: string;
  prefillStatsCard?: Record<string, unknown>;
  prefillCaption?: string;
  workoutSessionId?: string;
}

const SCOPE_ICONS: Record<string, React.ElementType> = {
  public: Globe,
  gym: Building2,
  event: Flag,
  run_club: Footprints,
};

export function CreatePostSheet({
  open,
  onClose,
  defaultScopeType = "public",
  defaultScopeId,
  prefillStatsCard,
  prefillCaption = "",
  workoutSessionId,
}: CreatePostSheetProps) {
  const [caption, setCaption] = useState<string>(typeof prefillCaption === "string" ? prefillCaption : "");
  const [scopeType, setScopeType] = useState<ScopeType>(defaultScopeType);
  const [scopeId, setScopeId] = useState<string | undefined>(defaultScopeId);
  const [includeStatsCard, setIncludeStatsCard] = useState(!!prefillStatsCard);

  const { data: communities } = useUserCommunities();
  const createPost = useCreatePost();

  const handlePost = async () => {
    if (!caption.trim() && !includeStatsCard) return;
    await createPost.mutateAsync({
      caption: caption.trim(),
      scope_type: scopeType,
      scope_id: scopeId,
      post_type: prefillStatsCard && includeStatsCard ? "workout_share" : "text",
      stats_card_data: includeStatsCard ? prefillStatsCard : undefined,
      workout_session_id: workoutSessionId,
    });
    setCaption(prefillCaption);
    onClose();
  };

  const scopeOptions = [
    { type: "public" as ScopeType, label: "Public", id: undefined },
    ...(communities?.gyms || []).map((g) => ({
      type: "gym" as ScopeType,
      label: g.name,
      id: String(g.id || ""),
    })),
    ...(communities?.events || []).map((e) => ({
      type: "event" as ScopeType,
      label: e.name,
      id: String(e.id || ""),
    })),
    ...(communities?.runClubs || []).map((rc) => ({
      type: "run_club" as ScopeType,
      label: rc.name,
      id: String(rc.id || ""),
    })),
  ];

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[201] shadow-elevated max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-0 shrink-0" />

            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <h2 className="text-lg font-semibold">New Post</h2>
              <button onClick={onClose} className="p-2 rounded-full bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {/* Audience selector */}
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Share to</p>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
                {scopeOptions.map((opt) => {
                  const Icon = SCOPE_ICONS[opt.type] || Globe;
                  const isSelected = scopeType === opt.type && scopeId === opt.id;
                  return (
                    <button
                      key={`${opt.type}-${opt.id || "public"}`}
                      onClick={() => { setScopeType(opt.type); setScopeId(opt.id as string | undefined); }}
                      className={cn(
                        "flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 border text-sm transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="max-w-[120px] truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Stats card toggle */}
              {prefillStatsCard && (
                <button
                  onClick={() => setIncludeStatsCard(!includeStatsCard)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border mb-4 transition-colors text-left",
                    includeStatsCard ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                  )}
                >
                  <BookOpen className={cn("h-5 w-5 shrink-0", includeStatsCard ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className={cn("text-sm font-medium", includeStatsCard ? "text-primary" : "text-foreground")}>
                      Include workout stats card
                    </p>
                    <p className="text-xs text-muted-foreground">Show your workout summary in this post</p>
                  </div>
                  <div className={cn(
                    "ml-auto h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    includeStatsCard ? "border-primary bg-primary" : "border-muted-foreground"
                  )}>
                    {includeStatsCard && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </button>
              )}

              {/* Caption */}
              <Textarea
                placeholder="What's on your mind?"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="resize-none mb-4"
                autoFocus={!prefillCaption}
              />

              <Button
                onClick={handlePost}
                className="w-full"
                disabled={(!caption.trim() && !includeStatsCard) || createPost.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createPost.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
