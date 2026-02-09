import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadRunStateLocal, clearRunStateLocal, formatDistance, formatRunDuration } from '@/types/run';

export function RunRecoveryPrompt() {
  const navigate = useNavigate();
  const [hasRun, setHasRun] = useState(false);
  const [distance, setDistance] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const saved = loadRunStateLocal();
    if (saved && (saved.status === 'active' || saved.status === 'paused')) {
      setHasRun(true);
      setDistance(formatDistance(saved.distanceMeters));
      setTime(formatRunDuration(saved.elapsedSeconds));
    }
  }, []);

  if (!hasRun) return null;

  return (
    <div className="card-glass p-4 mb-4 border border-primary/30 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Run in progress</p>
          <p className="text-xs text-muted-foreground">{distance} · {time}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { clearRunStateLocal(); setHasRun(false); }}>
            Discard
          </Button>
          <Button size="sm" onClick={() => navigate('/run')} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Resume
          </Button>
        </div>
      </div>
    </div>
  );
}
