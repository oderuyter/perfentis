import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Music, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useWorkoutMediaPreference } from "@/hooks/useWorkoutMediaPreference";

interface MarqueeTextProps {
  text: string;
  className?: string;
}

function MarqueeText({ text, className }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const textWidth = textRef.current.offsetWidth;
      setShouldScroll(textWidth > containerWidth);
    }
  }, [text]);

  return (
    <div ref={containerRef} className={cn("overflow-hidden whitespace-nowrap", className)}>
      <span
        ref={textRef}
        className={cn(
          "inline-block",
          shouldScroll && "animate-marquee"
        )}
        style={shouldScroll ? { animationDuration: `${Math.max(5, text.length * 0.3)}s` } : undefined}
      >
        {text}
        {shouldScroll && <span className="mx-8">{text}</span>}
      </span>
    </div>
  );
}

export function MediaWidget() {
  const { showMediaControls } = useWorkoutMediaPreference();
  const {
    isPlaying,
    track,
    hasActiveSession,
    togglePlayPause,
    handleNext,
    handlePrevious,
    startMockSession,
  } = useMediaSession();
  
  const [isMinimized, setIsMinimized] = useState(false);

  // Don't render if disabled in settings
  if (!showMediaControls) return null;

  // Collapsed state when no media is playing
  if (!hasActiveSession) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={startMockSession}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/30 text-muted-foreground text-xs"
      >
        <Music className="h-3.5 w-3.5" />
        <span>Tap to enable music controls</span>
      </motion.button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsMinimized(false)}
        className="flex items-center gap-2 px-3 py-2 rounded-full gradient-card border border-border/30 shadow-sm"
      >
        {track?.artwork ? (
          <img src={track.artwork} alt="" className="h-6 w-6 rounded-md object-cover" />
        ) : (
          <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
            <Music className="h-3 w-3" />
          </div>
        )}
        <div className="flex items-center gap-1">
          {isPlaying && (
            <span className="flex gap-0.5">
              <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </div>
        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
      </motion.button>
    );
  }

  // Full widget
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="gradient-card rounded-2xl border border-border/30 shadow-card overflow-hidden"
    >
      {/* Header with minimize */}
      <button
        onClick={() => setIsMinimized(true)}
        className="w-full flex items-center justify-center py-1.5 text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      <div className="px-3 pb-3 flex items-center gap-3">
        {/* Album artwork */}
        {track?.artwork ? (
          <img
            src={track.artwork}
            alt={track.album || track.title}
            className="h-12 w-12 rounded-lg object-cover shadow-sm flex-shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Music className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Track info */}
        <div className="flex-1 min-w-0 mr-1">
          <MarqueeText
            text={track?.title || "Unknown Track"}
            className="text-sm font-medium"
          />
          <MarqueeText
            text={track?.artist || "Unknown Artist"}
            className="text-xs text-muted-foreground"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handlePrevious}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={togglePlayPause}
            className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-primary-foreground" />
            ) : (
              <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
            )}
          </button>
          <button
            onClick={handleNext}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
