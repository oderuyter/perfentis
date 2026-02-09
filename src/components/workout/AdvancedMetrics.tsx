import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AdvancedMetricsProps {
  rpe: number | null;
  tempo: string | null;
  note: string | null;
  onUpdate: (updates: { rpe?: number | null; tempo?: string | null; note?: string | null }) => void;
  onClose: () => void;
}

export function AdvancedMetrics({ rpe, tempo, note, onUpdate, onClose }: AdvancedMetricsProps) {
  const [activeMetric, setActiveMetric] = useState<'rpe' | 'tempo' | 'note' | null>(null);
  const [localRpe, setLocalRpe] = useState(rpe);
  const [localTempo, setLocalTempo] = useState(tempo || '');
  const [localNote, setLocalNote] = useState(note || '');

  const handleSave = () => {
    onUpdate({
      rpe: localRpe,
      tempo: localTempo || null,
      note: localNote || null,
    });
    onClose();
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
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] shadow-elevated p-4 pb-safe"
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </button>
        
        <h3 className="text-lg font-semibold text-center pt-4 mb-6">Add Details</h3>
        
        {activeMetric === null ? (
          <div className="space-y-3">
            <button
              onClick={() => setActiveMetric('rpe')}
              className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/30"
            >
              <div>
                <p className="font-medium text-sm">RPE</p>
                <p className="text-xs text-muted-foreground">Rate of Perceived Exertion</p>
              </div>
              {localRpe ? (
                <span className="text-lg font-semibold">{localRpe}</span>
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            
            <button
              onClick={() => setActiveMetric('tempo')}
              className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/30"
            >
              <div>
                <p className="font-medium text-sm">Tempo</p>
                <p className="text-xs text-muted-foreground">e.g., 3-1-2-0</p>
              </div>
              {localTempo ? (
                <span className="text-lg font-semibold">{localTempo}</span>
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            
            <button
              onClick={() => setActiveMetric('note')}
              className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/30"
            >
              <div>
                <p className="font-medium text-sm">Note</p>
                <p className="text-xs text-muted-foreground">Add a comment</p>
              </div>
              {localNote ? (
                <span className="text-sm text-muted-foreground truncate max-w-[100px]">{localNote}</span>
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            
            <Button onClick={handleSave} className="w-full h-12 rounded-xl font-semibold mt-4">
              Done
            </Button>
          </div>
        ) : activeMetric === 'rpe' ? (
          <div>
            <p className="text-center text-sm text-muted-foreground mb-4">
              How hard did that feel?
            </p>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(value => (
                <button
                  key={value}
                  onClick={() => setLocalRpe(value)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                    localRpe === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setActiveMetric(null)} className="flex-1 h-12 rounded-xl">
                Back
              </Button>
              <Button onClick={() => setActiveMetric(null)} className="flex-1 h-12 rounded-xl">
                Set
              </Button>
            </div>
          </div>
        ) : activeMetric === 'tempo' ? (
          <div>
            <p className="text-center text-sm text-muted-foreground mb-4">
              Eccentric-Pause-Concentric-Pause
            </p>
            <Input
              value={localTempo}
              onChange={e => setLocalTempo(e.target.value)}
              placeholder="e.g., 3-1-2-0"
              className="h-12 text-center text-lg font-semibold mb-6"
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setActiveMetric(null)} className="flex-1 h-12 rounded-xl">
                Back
              </Button>
              <Button onClick={() => setActiveMetric(null)} className="flex-1 h-12 rounded-xl">
                Set
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-center text-sm text-muted-foreground mb-4">
              Add a note for this set
            </p>
            <Input
              value={localNote}
              onChange={e => setLocalNote(e.target.value)}
              placeholder="e.g., Felt strong today"
              className="h-12 mb-6"
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setActiveMetric(null)} className="flex-1 h-12 rounded-xl">
                Back
              </Button>
              <Button onClick={() => setActiveMetric(null)} className="flex-1 h-12 rounded-xl">
                Set
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
