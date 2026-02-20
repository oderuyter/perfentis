import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, User, Image, Type } from "lucide-react";
import { SocialStory, ScopeType, useCreateStory } from "@/hooks/useSocial";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STORY_DURATION_MS = 10000;

// ─── 16:9 canvas crop helper ──────────────────────────────────────────────────
function cropImageTo16x9(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const targetRatio = 9 / 16; // portrait: width/height
      const srcRatio = img.naturalWidth / img.naturalHeight;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (srcRatio > targetRatio) {
        // Too wide — crop sides
        sw = Math.round(img.naturalHeight * targetRatio);
        sx = Math.round((img.naturalWidth - sw) / 2);
      } else {
        // Too tall — crop top/bottom
        sh = Math.round(img.naturalWidth / targetRatio);
        sy = Math.round((img.naturalHeight - sh) / 2);
      }
      const canvas = document.createElement("canvas");
      // Render at a nice size for stories
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 720, 1280);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        "image/jpeg",
        0.9
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Story thumbnail ──────────────────────────────────────────────────────────
function StoryThumb({
  story,
  isOwn,
  onClick,
}: {
  story: SocialStory;
  isOwn: boolean;
  onClick: () => void;
}) {
  const initials = story.author?.display_name?.charAt(0)?.toUpperCase() || "?";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0">
      <div
        className={cn(
          "h-14 w-14 rounded-full overflow-hidden border-2",
          isOwn ? "border-primary" : "border-accent"
        )}
      >
        {story.media_url ? (
          <img src={story.media_url} alt="" className="h-full w-full object-cover" />
        ) : story.author?.avatar_url ? (
          <img src={story.author.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className={cn("h-full w-full flex items-center justify-center text-sm font-bold", isOwn ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground")}>
            {initials}
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground max-w-[56px] truncate">
        {isOwn ? "You" : story.author?.display_name || "User"}
      </span>
    </button>
  );
}

// ─── Full-screen story viewer ─────────────────────────────────────────────────
function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: SocialStory[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const story = stories[index];

  const goNext = useCallback(() => {
    if (index < stories.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  }, [index, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (index > 0) setIndex((i) => i - 1);
  }, [index]);

  // Reset + start progress timer on story change
  useEffect(() => {
    setProgress(0);
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current!);
        goNext();
      }
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, goNext]);

  if (!story) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col"
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-2 pt-safe pt-2 z-10">
        {stories.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width:
                  i < index ? "100%" : i === index ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 pt-safe pt-8 px-4 pb-4 flex items-center gap-3 z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="h-8 w-8 rounded-full overflow-hidden border border-white/40 shrink-0">
          {story.author?.avatar_url ? (
            <img src={story.author.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-white/20 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{story.author?.display_name || "User"}</p>
          <p className="text-white/60 text-xs">
            {new Date(story.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full bg-black/30">
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Story content */}
      <div className="flex-1 flex items-center justify-center relative">
        {story.media_url ? (
          <img
            src={story.media_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40" />
        )}

        {/* Text overlay */}
        {story.caption && (
          <div className="absolute inset-x-0 bottom-24 px-6 z-10">
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <p className="text-white text-lg font-medium leading-snug">{story.caption}</p>
            </div>
          </div>
        )}

        {/* Tap zones */}
        <button
          className="absolute left-0 top-0 bottom-0 w-1/3 z-20"
          onClick={goPrev}
          aria-label="Previous story"
        />
        <button
          className="absolute right-0 top-0 bottom-0 w-2/3 z-20"
          onClick={goNext}
          aria-label="Next story"
        />
      </div>
    </motion.div>
  );
}

// ─── Story creator sheet ──────────────────────────────────────────────────────
function StoryCreator({
  scopeType,
  scopeId,
  onClose,
}: {
  scopeType: ScopeType;
  scopeId?: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"pick" | "compose">("pick");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createStory = useCreateStory();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = await cropImageTo16x9(file);
      setCroppedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setStep("compose");
    } catch {
      // fallback: use original
      setCroppedBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStep("compose");
    }
  };

  const handlePost = async () => {
    if (!croppedBlob) return;
    const ext = "jpg";
    const imageFile = new File([croppedBlob], `story.${ext}`, { type: "image/jpeg" });
    await createStory.mutateAsync({
      caption: caption.trim() || undefined,
      scope_type: scopeType,
      scope_id: scopeId,
      imageFile,
    });
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[120]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] overflow-hidden"
      >
        {step === "pick" ? (
          <div className="p-6 pb-footer-safe">
            {/* Handle */}
            <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-1">Add Story</h2>
            <p className="text-sm text-muted-foreground mb-6">Share a photo with your community — cropped to portrait (9:16)</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors mb-3"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Image className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Choose Photo</p>
                <p className="text-sm text-muted-foreground">From your camera roll</p>
              </div>
            </button>

            <Button variant="ghost" className="w-full" onClick={onClose}>Cancel</Button>
          </div>
        ) : (
          /* Compose step — preview + caption */
          <div className="flex flex-col" style={{ maxHeight: "90vh" }}>
            {/* Handle */}
            <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-2 shrink-0" />

            {/* 9:16 preview */}
            {previewUrl && (
              <div className="relative mx-4 rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "9/16", maxHeight: "45vh" }}>
                <img src={previewUrl} alt="Story preview" className="absolute inset-0 w-full h-full object-cover" />
                {/* Live caption preview */}
                {caption && (
                  <div className="absolute bottom-4 inset-x-4">
                    <div className="bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
                      <p className="text-white text-sm font-medium leading-snug">{caption}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Caption input */}
            <div className="px-4 pt-3 pb-2 flex-1 overflow-y-auto">
              <div className="flex items-start gap-2 border border-border rounded-xl px-3 py-2 bg-muted/30">
                <Type className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <textarea
                  placeholder="Add a caption… (optional)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-4 pb-6">
              <Button variant="outline" className="flex-1" onClick={() => setStep("pick")}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!croppedBlob || createStory.isPending}
                onClick={handlePost}
              >
                {createStory.isPending ? "Posting…" : "Share Story"}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface StoriesRowProps {
  stories: SocialStory[];
  scopeType?: ScopeType;
  scopeId?: string;
}

export function StoriesRow({ stories, scopeType = "public", scopeId }: StoriesRowProps) {
  const { user } = useAuth();
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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

        {stories.map((story, idx) => (
          <StoryThumb
            key={story.id}
            story={story}
            isOwn={story.author_user_id === user?.id}
            onClick={() => setViewingIndex(idx)}
          />
        ))}
      </div>

      {/* Full-screen viewer */}
      <AnimatePresence>
        {viewingIndex !== null && (
          <StoryViewer
            stories={stories}
            startIndex={viewingIndex}
            onClose={() => setViewingIndex(null)}
          />
        )}
      </AnimatePresence>

      {/* Creator sheet */}
      <AnimatePresence>
        {showCreate && (
          <StoryCreator
            scopeType={scopeType}
            scopeId={scopeId}
            onClose={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
