import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface RestTimerEditProps {
  currentDuration: number;
  onUpdate: (duration: number, applyToAll?: boolean) => void;
  onClose: () => void;
}

const presets = [30, 60, 90, 120, 180, 240];

export function RestTimerEdit({ currentDuration, onUpdate, onClose }: RestTimerEditProps) {
  const [duration, setDuration] = useState(currentDuration);
  const [applyToAll, setApplyToAll] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const adjustDuration = (delta: number) => {
    setDuration(prev => Math.max(15, Math.min(600, prev + delta)));
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 shadow-elevated p-4 pb-safe"
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </button>
        
        <h3 className="text-lg font-semibold text-center pt-4 mb-6">Edit Rest Time</h3>
        
        {/* Custom Duration Picker */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => adjustDuration(-15)}
            className="h-14 w-14 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <Minus className="h-6 w-6" />
          </button>
          
          <div className="text-center min-w-[120px]">
            <p className="text-5xl font-bold tracking-tight">{formatDuration(duration)}</p>
            <p className="text-xs text-muted-foreground mt-1">15s increments</p>
          </div>
          
          <button
            onClick={() => adjustDuration(15)}
            className="h-14 w-14 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
        
        {/* Presets */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {presets.map(preset => (
            <button
              key={preset}
              onClick={() => setDuration(preset)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                duration === preset 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {formatDuration(preset)}
            </button>
          ))}
        </div>

        {/* Apply to all toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl mb-6">
          <div className="space-y-0.5">
            <Label htmlFor="apply-all" className="text-sm font-medium">
              Apply to all remaining sets
            </Label>
            <p className="text-xs text-muted-foreground">
              Use this rest time for all upcoming sets
            </p>
          </div>
          <Switch
            id="apply-all"
            checked={applyToAll}
            onCheckedChange={setApplyToAll}
          />
        </div>
        
        <Button 
          onClick={() => {
            onUpdate(duration, applyToAll);
            onClose();
          }}
          className="w-full h-12 rounded-xl font-semibold"
        >
          Apply
        </Button>
      </motion.div>
    </>
  );
}
