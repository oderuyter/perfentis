import { useState, useRef, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGpxImport, ImportStep } from '@/hooks/useGpxImport';
import { RunRouteMap } from './RunRouteMap';
import { formatPace, formatRunDuration, formatDistance, RunModality } from '@/types/run';
import {
  Upload, FileText, MapPin, Clock, TrendingUp, Mountain, AlertTriangle,
  ChevronRight, ChevronLeft, Check, Loader2, Flag
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forUserId?: string;
  coachId?: string;
  onImported?: (sessionId: string) => void;
}

export function ImportRunSheet({ open, onOpenChange, forUserId, coachId, onImported }: Props) {
  const { state, handleFileUpload, goToTagging, goToConfirm, updateTagging, confirmImport, setStep, reset } = useGpxImport({ forUserId, coachId });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleConfirm = async () => {
    const sessionId = await confirmImport();
    if (sessionId) {
      onImported?.(sessionId);
      setTimeout(() => handleClose(false), 1200);
    }
  };

  const mapPoints = useMemo(() => {
    if (!state.parsedData) return [];
    return state.parsedData.trackPoints.map(p => ({
      lat: p.lat,
      lng: p.lng,
      timestamp: p.time?.getTime() || 0,
      accuracy: 0,
      altitude: p.elevation,
      speed: p.speed,
    }));
  }, [state.parsedData]);

  const steps: ImportStep[] = ['upload', 'preview', 'tagging', 'confirm'];
  const stepIdx = steps.indexOf(state.step);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-lg">Import Run (GPX)</SheetTitle>
        </SheetHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-2 py-3">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`h-1.5 rounded-full flex-1 transition-colors ${
                i <= stepIdx ? 'bg-primary' : 'bg-muted'
              }`} />
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-1 space-y-4">
          {/* STEP 1: Upload */}
          {state.step === 'upload' && (
            <div className="space-y-4">
              <div
                className="card-glass rounded-xl p-8 text-center border-2 border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">Upload GPX File</p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or tap to select a .gpx file
                </p>
                {state.file && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-primary">
                    <FileText className="h-4 w-4" />
                    {state.file.name}
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".gpx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
              </div>

              {state.parseError && (
                <div className="card-glass rounded-xl p-4 border border-destructive/30 bg-destructive/5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive text-sm">{state.parseError.message}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="card-glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Supported:</span> GPX (.gpx)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground/60">Coming soon:</span> TCX, FIT
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {state.step === 'preview' && state.parsedData && (
            <div className="space-y-4">
              {/* Map preview */}
              <div className="card-glass rounded-xl overflow-hidden" style={{ height: 180 }}>
                {mapPoints.length > 1 ? (
                  <RunRouteMap points={mapPoints} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    <MapPin className="h-4 w-4 mr-2" /> No route data
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard icon={<MapPin className="h-3.5 w-3.5" />} label="Distance" value={formatDistance(state.parsedData.totalDistanceMeters)} />
                <StatCard icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={formatRunDuration(state.parsedData.elapsedSeconds)} />
                <StatCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg Pace" value={formatPace(state.parsedData.avgPaceSecPerKm)} unit="/km" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatCard icon={<Clock className="h-3.5 w-3.5" />} label="Moving" value={formatRunDuration(state.parsedData.movingSeconds)} />
                <StatCard icon={<Mountain className="h-3.5 w-3.5" />} label="Elev ↑" value={`${Math.round(state.parsedData.elevationGain)}m`} />
                <StatCard icon={<Mountain className="h-3.5 w-3.5" />} label="Elev ↓" value={`${Math.round(state.parsedData.elevationLoss)}m`} />
              </div>

              {/* Metadata */}
              <div className="card-glass rounded-xl p-4 space-y-2">
                {state.parsedData.name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{state.parsedData.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{state.parsedData.startTime?.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Start Time</span>
                  <span className="font-medium">{state.parsedData.startTime?.toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Points</span>
                  <span className="font-medium">{state.parsedData.trackPoints.length.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Elevation Data</span>
                  <span className="font-medium">{state.parsedData.hasElevation ? 'Yes' : 'Will compute after import'}</span>
                </div>
              </div>

              {/* Splits preview */}
              {state.parsedData.splits.length > 0 && (
                <div className="card-glass rounded-xl overflow-hidden">
                  <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/20">
                    <Flag className="h-3 w-3 inline mr-1" /> Splits
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/20 text-muted-foreground">
                        <th className="py-2 px-3 text-left font-medium">KM</th>
                        <th className="py-2 px-3 text-right font-medium">Pace</th>
                        <th className="py-2 px-3 text-right font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.parsedData.splits.slice(0, 10).map((s) => (
                        <tr key={s.splitNumber} className="border-b border-border/10 last:border-0">
                          <td className="py-1.5 px-3 font-medium">{s.splitNumber}</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">{formatPace(s.paceSecPerKm)}</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">{formatRunDuration(s.durationSeconds)}</td>
                        </tr>
                      ))}
                      {state.parsedData.splits.length > 10 && (
                        <tr>
                          <td colSpan={3} className="py-1.5 px-3 text-center text-muted-foreground">
                            +{state.parsedData.splits.length - 10} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <Button onClick={goToTagging} className="w-full h-12 rounded-xl font-semibold gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 3: Tagging */}
          {state.step === 'tagging' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(['run', 'walk'] as RunModality[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => updateTagging({ modality: m })}
                      className={`p-4 rounded-xl border-2 text-center font-medium capitalize transition-all ${
                        state.tagging.modality === m
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/40 text-foreground/70 hover:border-border'
                      }`}
                    >
                      {m === 'run' ? '🏃 Run' : '🚶 Walk'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-title">Title</Label>
                <Input
                  id="import-title"
                  value={state.tagging.title}
                  onChange={(e) => updateTagging({ title: e.target.value })}
                  placeholder="e.g. Morning Run"
                />
              </div>

              <div className="space-y-2">
                <Label>Privacy</Label>
                <Select
                  value={state.tagging.privacyLevel}
                  onValueChange={(v) => updateTagging({ privacyLevel: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">🔒 Private</SelectItem>
                    <SelectItem value="followers">👥 Followers</SelectItem>
                    <SelectItem value="public">🌍 Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('preview')} className="flex-1 h-12 rounded-xl gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={goToConfirm} className="flex-1 h-12 rounded-xl font-semibold gap-2">
                  Review <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Confirm */}
          {state.step === 'confirm' && state.parsedData && (
            <div className="space-y-4">
              {state.duplicateWarning && (
                <div className="card-glass rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Possible Duplicate</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        A run with a similar start time already exists. You can still import if this is a different activity.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {state.importedSessionId ? (
                <div className="card-glass rounded-xl p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Import Complete!</h3>
                  <p className="text-sm text-muted-foreground">Your run has been added to your activity history.</p>
                </div>
              ) : (
                <>
                  <div className="card-glass rounded-xl p-4 space-y-2">
                    <h4 className="font-semibold text-sm mb-2">Import Summary</h4>
                    <Row label="Title" value={state.tagging.title} />
                    <Row label="Type" value={state.tagging.modality === 'run' ? '🏃 Run' : '🚶 Walk'} />
                    <Row label="Date" value={state.parsedData.startTime?.toLocaleDateString() || '-'} />
                    <Row label="Distance" value={formatDistance(state.parsedData.totalDistanceMeters)} />
                    <Row label="Duration" value={formatRunDuration(state.parsedData.elapsedSeconds)} />
                    <Row label="Moving Time" value={formatRunDuration(state.parsedData.movingSeconds)} />
                    <Row label="Avg Pace" value={`${formatPace(state.parsedData.avgPaceSecPerKm)} /km`} />
                    <Row label="Elevation" value={`↑${Math.round(state.parsedData.elevationGain)}m ↓${Math.round(state.parsedData.elevationLoss)}m`} />
                    <Row label="GPS Points" value={state.parsedData.trackPoints.length.toLocaleString()} />
                    <Row label="Privacy" value={state.tagging.privacyLevel} />
                  </div>

                  {coachId && forUserId && (
                    <div className="card-glass rounded-xl p-3 text-xs text-muted-foreground">
                      ℹ️ This run will be imported under the client's account. An audit log will be created.
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('tagging')} className="flex-1 h-12 rounded-xl gap-2">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      disabled={state.isImporting}
                      className="flex-1 h-12 rounded-xl font-semibold gap-2"
                    >
                      {state.isImporting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                      ) : (
                        <><Check className="h-4 w-4" /> Import Run</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit?: string }) {
  return (
    <div className="card-glass p-3 text-center rounded-xl">
      <div className="flex items-center justify-center gap-1 mb-1 text-muted-foreground/70">
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold tabular-nums">
        {value}
        {unit && <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
