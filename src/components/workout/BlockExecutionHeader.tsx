// Block Execution Header - shows block context during active workout
import { motion } from "framer-motion";
import { Timer, Zap, Users, Layers, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkoutBlock, BlockType, EmomSettings, AmrapSettings, YgigSettings, SupersetSettings } from "@/types/workout-blocks";

interface BlockExecutionHeaderProps {
  block: WorkoutBlock;
  currentItemIndex: number;
  className?: string;
}

const BLOCK_ICONS: Record<BlockType, typeof Dumbbell> = {
  single: Dumbbell,
  superset: Layers,
  emom: Timer,
  amrap: Zap,
  ygig: Users,
};

const BLOCK_COLORS: Record<BlockType, string> = {
  single: '',
  superset: 'border-primary/20 bg-primary/5',
  emom: 'border-amber-500/20 bg-amber-500/5',
  amrap: 'border-red-500/20 bg-red-500/5',
  ygig: 'border-blue-500/20 bg-blue-500/5',
};

export function BlockExecutionHeader({ block, currentItemIndex, className }: BlockExecutionHeaderProps) {
  if (block.type === 'single') return null;

  const Icon = BLOCK_ICONS[block.type];
  const totalItems = block.items.length;

  let summary = '';
  switch (block.type) {
    case 'superset': {
      const s = block.settings as SupersetSettings;
      summary = `Round ${1} of ${s.rounds || 1}`;
      break;
    }
    case 'emom': {
      const s = block.settings as EmomSettings;
      summary = `${s.rounds} min EMOM`;
      break;
    }
    case 'amrap': {
      const s = block.settings as AmrapSettings;
      summary = `${Math.floor(s.time_cap_seconds / 60)} min cap`;
      break;
    }
    case 'ygig': {
      const s = block.settings as YgigSettings;
      summary = `${s.max_participants} partners`;
      break;
    }
  }

  // Show item notes prominently (weight guidance)
  const currentItem = block.items[currentItemIndex];
  const itemNotes = currentItem?.item_notes;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl p-3 space-y-2", BLOCK_COLORS[block.type], className)}
    >
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-background/50 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{block.title || block.type.toUpperCase()}</p>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {String.fromCharCode(65 + currentItemIndex)} / {totalItems}
        </Badge>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1">
        {block.items.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all flex-1",
              i === currentItemIndex ? "bg-foreground" :
              i < currentItemIndex ? "bg-foreground/40" :
              "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Weight guidance / item notes */}
      {itemNotes && (
        <div className="bg-background/60 rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-amber-600">📝 {itemNotes}</p>
        </div>
      )}
    </motion.div>
  );
}
