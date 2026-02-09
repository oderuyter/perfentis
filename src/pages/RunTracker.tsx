import { useState } from 'react';
import { useRunTracker } from '@/hooks/useRunTracker';
import { RunPreScreen } from '@/components/run/RunPreScreen';
import { RunActiveScreen } from '@/components/run/RunActiveScreen';
import { RunSummaryScreen } from '@/components/run/RunSummaryScreen';

export default function RunTracker() {
  const tracker = useRunTracker();
  const { state } = tracker;
  
  if (state.status === 'completed') {
    return <RunSummaryScreen state={state} onReset={tracker.reset} />;
  }

  if (state.status === 'active' || state.status === 'paused') {
    return (
      <RunActiveScreen
        state={state}
        onPause={tracker.pause}
        onResume={tracker.resume}
        onStop={tracker.stop}
        onLap={tracker.markLap}
        onDiscard={tracker.discard}
      />
    );
  }

  return (
    <RunPreScreen
      onStart={(modality, privacy) => tracker.start(modality, privacy)}
    />
  );
}
