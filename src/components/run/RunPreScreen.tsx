import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, MapPin, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { RunModality, PrivacyLevel } from '@/types/run';

interface RunPreScreenProps {
  onStart: (modality: RunModality, privacy: PrivacyLevel) => void;
}

export function RunPreScreen({ onStart }: RunPreScreenProps) {
  const navigate = useNavigate();
  const [modality, setModality] = useState<RunModality>('run');
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  const checkPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(result.state);
      if (result.state === 'denied') {
        return false;
      }
    } catch {
      // permissions API not supported, proceed anyway
    }
    return true;
  };

  const handleStart = async () => {
    const ok = await checkPermission();
    if (!ok) return;
    onStart(modality, 'private');
  };

  return (
    <div className="min-h-screen gradient-page px-5 overflow-x-hidden">
      <div className="fixed inset-0 gradient-glow pointer-events-none" />

      <header className="relative pt-6 pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Run Tracker
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="text-muted-foreground mt-1"
        >
          Track your outdoor activity
        </motion.p>
      </header>

      <div className="relative space-y-6 mt-4">
        {/* Activity Type */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="card-glass p-5"
        >
          <p className="section-label mb-3">Activity Type</p>
          <div className="grid grid-cols-2 gap-3">
            {(['run', 'walk'] as RunModality[]).map((m) => (
              <button
                key={m}
                onClick={() => setModality(m)}
                className={`p-4 rounded-xl border-2 text-center font-medium capitalize transition-all ${
                  modality === m
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/40 text-foreground/70 hover:border-border'
                }`}
              >
                {m === 'run' ? '🏃 Run' : '🚶 Walk'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="card-glass p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <p className="section-label">Privacy</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Your run will be <span className="font-medium text-foreground">private</span> by default.
            Sharing features coming soon.
          </p>
        </motion.div>

        {/* Location note */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="card-glass p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <p className="section-label">GPS Tracking</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {typeof window !== 'undefined' && 'standalone' in window.navigator
              ? 'GPS will track in the background. Keep the app running for best results.'
              : 'Background tracking may be limited in browser mode. For best results, keep this tab active.'
            }
          </p>
          {permissionStatus === 'denied' && (
            <p className="text-sm text-destructive mt-2">
              Location permission is denied. Please enable it in your browser settings.
            </p>
          )}
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={handleStart}
            size="lg"
            className="w-full h-16 text-lg font-bold gap-3 rounded-2xl"
          >
            <Play className="h-6 w-6" />
            Start {modality === 'run' ? 'Run' : 'Walk'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
