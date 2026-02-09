import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, Download, MapPin, Clock, TrendingUp, Mountain, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { RunState, formatPace, formatRunDuration, formatDistance, RunSplit } from '@/types/run';
import { RunRouteMap } from './RunRouteMap';
import { RunCharts } from './RunCharts';

interface Props {
  state: RunState;
  onReset: () => void;
}

export function RunSummaryScreen({ state, onReset }: Props) {
  const navigate = useNavigate();
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleDone = () => {
    onReset();
    navigate('/progress');
  };

  // Compute auto splits (per km)
  const autoSplits = useMemo(() => {
    const splits: RunSplit[] = [];
    if (state.points.length < 2) return splits;

    let splitDist = 0;
    let splitStartIdx = 0;
    let splitNumber = 1;
    let splitElevGain = 0;
    let splitElevLoss = 0;

    for (let i = 1; i < state.points.length; i++) {
      const prev = state.points[i - 1];
      const cur = state.points[i];
      const d = Math.sqrt(
        ((cur.lat - prev.lat) * 111320) ** 2 +
        ((cur.lng - prev.lng) * 111320 * Math.cos(cur.lat * Math.PI / 180)) ** 2
      );
      splitDist += d;

      if (prev.altitude != null && cur.altitude != null) {
        const delta = cur.altitude - prev.altitude;
        if (delta > 0) splitElevGain += delta;
        else splitElevLoss += Math.abs(delta);
      }

      if (splitDist >= 1000) {
        const startTime = state.points[splitStartIdx].timestamp;
        const endTime = cur.timestamp;
        const durationSec = (endTime - startTime) / 1000;
        const pace = durationSec; // per km since splitDist ~= 1000m

        splits.push({
          splitNumber,
          distanceMeters: splitDist,
          durationSeconds: Math.round(durationSec),
          paceSecPerKm: Math.round(pace),
          elevationGain: Math.round(splitElevGain),
          elevationLoss: Math.round(splitElevLoss),
        });

        splitNumber++;
        splitDist = 0;
        splitStartIdx = i;
        splitElevGain = 0;
        splitElevLoss = 0;
      }
    }

    // Final partial split
    if (splitDist > 50) {
      const startTime = state.points[splitStartIdx].timestamp;
      const endTime = state.points[state.points.length - 1].timestamp;
      const durationSec = (endTime - startTime) / 1000;
      const pace = splitDist > 0 ? (durationSec / splitDist) * 1000 : 0;

      splits.push({
        splitNumber,
        distanceMeters: Math.round(splitDist),
        durationSeconds: Math.round(durationSec),
        paceSecPerKm: Math.round(pace),
        elevationGain: Math.round(splitElevGain),
        elevationLoss: Math.round(splitElevLoss),
      });
    }

    return splits;
  }, [state.points]);

  // Manual lap splits
  const lapSplits = useMemo(() => {
    return state.laps.map((lap, i) => {
      const prevDist = i > 0 ? state.laps[i - 1].distanceMeters : 0;
      const prevTime = i > 0 ? state.laps[i - 1].movingSeconds : 0;
      const segDist = lap.distanceMeters - prevDist;
      const segTime = lap.movingSeconds - prevTime;
      const segPace = segDist > 0 ? (segTime / segDist) * 1000 : 0;
      return {
        lap: lap.lapNumber,
        distance: formatDistance(segDist),
        time: formatRunDuration(segTime),
        pace: formatPace(segPace),
      };
    });
  }, [state.laps]);

  return (
    <div className="min-h-screen gradient-page px-5 pb-24 overflow-x-hidden">
      <div className="fixed inset-0 gradient-glow pointer-events-none" />

      {/* Header */}
      <header className="relative pt-6 pb-4 flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-semibold tracking-tight"
          >
            {state.modality === 'walk' ? 'Walk' : 'Run'} Complete 🎉
          </motion.h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="card-glass rounded-2xl overflow-hidden mb-5"
        style={{ height: 220 }}
      >
        {state.points.length > 1 ? (
          <RunRouteMap points={state.points} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <MapPin className="h-4 w-4 mr-2" />
            No GPS data recorded
          </div>
        )}
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 mb-5"
      >
        <SummaryCard icon={<MapPin className="h-4 w-4" />} label="Distance" value={formatDistance(state.distanceMeters)} />
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Moving Time" value={formatRunDuration(state.movingSeconds)} />
        <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Avg Pace" value={formatPace(state.avgPaceSecPerKm)} unit="/km" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Elapsed" value={formatRunDuration(state.elapsedSeconds)} />
        <SummaryCard icon={<Mountain className="h-4 w-4" />} label="Elev Gain" value={`${Math.round(state.elevationGain)}m`} />
        <SummaryCard icon={<Mountain className="h-4 w-4" />} label="Elev Loss" value={`${Math.round(state.elevationLoss)}m`} />
      </motion.div>

      {/* Charts + Splits Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <Tabs defaultValue="charts">
          <TabsList className="grid w-full grid-cols-3 mb-4 h-11">
            <TabsTrigger value="charts" className="text-sm font-semibold">Charts</TabsTrigger>
            <TabsTrigger value="splits" className="text-sm font-semibold">Splits</TabsTrigger>
            <TabsTrigger value="laps" className="text-sm font-semibold">Laps</TabsTrigger>
          </TabsList>

          <TabsContent value="charts">
            <RunCharts points={state.points} />
          </TabsContent>

          <TabsContent value="splits">
            {autoSplits.length > 0 ? (
              <div className="card-glass rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 text-muted-foreground text-xs">
                      <th className="py-2.5 px-3 text-left font-medium">KM</th>
                      <th className="py-2.5 px-3 text-right font-medium">Pace</th>
                      <th className="py-2.5 px-3 text-right font-medium">Time</th>
                      <th className="py-2.5 px-3 text-right font-medium">↑/↓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoSplits.map((s) => (
                      <tr key={s.splitNumber} className="border-b border-border/10 last:border-0">
                        <td className="py-2.5 px-3 font-medium">{s.splitNumber}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatPace(s.paceSecPerKm)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatRunDuration(s.durationSeconds)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">
                          +{s.elevationGain} / -{s.elevationLoss}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-glass p-8 text-center text-muted-foreground text-sm">
                Not enough data for splits
              </div>
            )}
          </TabsContent>

          <TabsContent value="laps">
            {lapSplits.length > 0 ? (
              <div className="card-glass rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 text-muted-foreground text-xs">
                      <th className="py-2.5 px-3 text-left font-medium">Lap</th>
                      <th className="py-2.5 px-3 text-right font-medium">Dist</th>
                      <th className="py-2.5 px-3 text-right font-medium">Time</th>
                      <th className="py-2.5 px-3 text-right font-medium">Pace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lapSplits.map((l) => (
                      <tr key={l.lap} className="border-b border-border/10 last:border-0">
                        <td className="py-2.5 px-3 font-medium">{l.lap}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{l.distance}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{l.time}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{l.pace}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-glass p-8 text-center text-muted-foreground text-sm">
                <Flag className="h-5 w-5 mx-auto mb-2 opacity-50" />
                No manual laps recorded
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Done button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="mt-8"
      >
        <Button onClick={handleDone} className="w-full h-14 text-base font-semibold rounded-2xl">
          Done
        </Button>
        <div className="flex gap-3 mt-3 justify-center">
          <Button variant="ghost" size="sm" disabled className="text-xs text-muted-foreground">
            <Download className="h-3.5 w-3.5 mr-1" />
            Export GPX (coming soon)
          </Button>
        </div>
      </motion.div>

      {showShareDialog && (
        <div className="fixed inset-0 z-[300] bg-background/80 flex items-center justify-center p-6"
          onClick={() => setShowShareDialog(false)}
        >
          <div className="card-glass p-6 rounded-2xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <Share2 className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="text-lg font-semibold mb-1">Sharing Coming Soon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We're building sharing features. Your run data is saved and ready for when sharing launches.
            </p>
            <Button onClick={() => setShowShareDialog(false)} className="w-full rounded-xl">
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit?: string }) {
  return (
    <div className="card-glass p-4 text-center rounded-xl">
      <div className="flex items-center justify-center gap-1.5 mb-1.5 text-muted-foreground/70">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums">
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}
