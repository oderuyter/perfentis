import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, Square, Flag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RunState, formatPace, formatRunDuration, formatDistance } from '@/types/run';

interface Props {
  state: RunState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => Promise<string | null>;
  onLap: () => void;
  onDiscard: () => void;
}

export function RunActiveScreen({ state, onPause, onResume, onStop, onLap, onDiscard }: Props) {
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isPaused = state.status === 'paused';

  const handleStop = async () => {
    setIsSaving(true);
    await onStop();
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] gradient-page flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className={`text-center py-2 text-xs font-semibold uppercase tracking-widest ${
        isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'bg-primary/10 text-primary'
      }`}>
        {isPaused ? '⏸ Paused' : `🏃 ${state.modality === 'walk' ? 'Walking' : 'Running'}`}
      </div>

      {/* Main metrics */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        {/* Distance (hero) */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Distance</p>
          <p className="text-6xl font-bold tabular-nums tracking-tight">
            {(state.distanceMeters / 1000).toFixed(2)}
          </p>
          <p className="text-muted-foreground text-sm mt-0.5">km</p>
        </motion.div>

        {/* Time metrics row */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-sm mt-6">
          <MetricTile label="Elapsed" value={formatRunDuration(state.elapsedSeconds)} />
          <MetricTile label="Moving" value={formatRunDuration(state.movingSeconds)} />
          <MetricTile
            label="Current Pace"
            value={formatPace(state.currentPaceSecPerKm)}
            unit="/km"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
          <MetricTile
            label="Avg Pace"
            value={formatPace(state.avgPaceSecPerKm)}
            unit="/km"
          />
          <MetricTile
            label="Elev Gain"
            value={`${Math.round(state.elevationGain)}`}
            unit="m"
          />
          <MetricTile
            label="Laps"
            value={`${state.laps.length}`}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="pb-safe px-6 py-6">
        <div className="flex items-center justify-center gap-6">
          {/* Lap */}
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={onLap}
            disabled={isPaused}
          >
            <Flag className="h-5 w-5" />
          </Button>

          {/* Pause / Resume */}
          {isPaused ? (
            <Button
              size="icon"
              className="h-20 w-20 rounded-full text-lg"
              onClick={onResume}
            >
              <Play className="h-8 w-8" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-20 w-20 rounded-full text-lg"
              onClick={onPause}
            >
              <Pause className="h-8 w-8" />
            </Button>
          )}

          {/* Stop */}
          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={() => setShowStopDialog(true)}
          >
            <Square className="h-5 w-5" />
          </Button>
        </div>

        {isPaused && (
          <Button
            variant="ghost"
            className="w-full mt-4 text-destructive"
            onClick={() => setShowDiscardDialog(true)}
          >
            <X className="h-4 w-4 mr-2" />
            Discard Run
          </Button>
        )}
      </div>

      {/* Stop dialog */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End {state.modality === 'walk' ? 'walk' : 'run'} and save?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatDistance(state.distanceMeters)} in {formatRunDuration(state.elapsedSeconds)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue</AlertDialogCancel>
            <AlertDialogAction onClick={handleStop} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save & Finish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this run?</AlertDialogTitle>
            <AlertDialogDescription>
              All GPS data will be permanently lost. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={onDiscard} className="bg-destructive text-destructive-foreground">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MetricTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">{label}</p>
      <p className="text-lg font-bold tabular-nums">
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}
