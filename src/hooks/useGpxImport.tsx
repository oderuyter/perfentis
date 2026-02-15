import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { parseGpxFile, GpxParsedData, GpxParseError } from '@/lib/gpxParser';
import { toast } from 'sonner';
import { logAuditEvent } from './useAuditLog';
import { RunModality } from '@/types/run';

export type ImportStep = 'upload' | 'preview' | 'tagging' | 'confirm';

export interface ImportTagging {
  modality: RunModality;
  title: string;
  privacyLevel: 'private' | 'followers' | 'public';
}

interface ImportState {
  step: ImportStep;
  file: File | null;
  parsedData: GpxParsedData | null;
  parseError: GpxParseError | null;
  tagging: ImportTagging;
  duplicateWarning: boolean;
  existingSessionId: string | null;
  isImporting: boolean;
  importedSessionId: string | null;
}

const INITIAL_TAGGING: ImportTagging = {
  modality: 'run',
  title: '',
  privacyLevel: 'private',
};

export function useGpxImport(options?: { forUserId?: string; coachId?: string }) {
  const { user } = useAuth();
  const targetUserId = options?.forUserId || user?.id;

  const [state, setState] = useState<ImportState>({
    step: 'upload',
    file: null,
    parsedData: null,
    parseError: null,
    tagging: INITIAL_TAGGING,
    duplicateWarning: false,
    existingSessionId: null,
    isImporting: false,
    importedSessionId: null,
  });

  const reset = useCallback(() => {
    setState({
      step: 'upload',
      file: null,
      parsedData: null,
      parseError: null,
      tagging: INITIAL_TAGGING,
      duplicateWarning: false,
      existingSessionId: null,
      isImporting: false,
      importedSessionId: null,
    });
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, file, parseError: null }));

    try {
      const text = await file.text();
      const result = parseGpxFile(text);

      if (result.ok === false) {
        setState(prev => ({ ...prev, parseError: result.error, step: 'upload' as ImportStep }));
        return;
      }

      const data = result.data;
      const defaultTitle = data.name || `Imported ${data.startTime ? data.startTime.toLocaleDateString() : 'Run'}`;

      setState(prev => ({
        ...prev,
        parsedData: data,
        tagging: { ...prev.tagging, title: defaultTitle },
        step: 'preview',
      }));
    } catch {
      setState(prev => ({
        ...prev,
        parseError: { type: 'invalid_xml', message: 'Failed to read file.' },
      }));
    }
  }, []);

  const goToTagging = useCallback(() => {
    setState(prev => ({ ...prev, step: 'tagging' }));
  }, []);

  const goToConfirm = useCallback(async () => {
    if (!targetUserId || !state.parsedData) return;

    // Check for duplicates
    const fp = state.parsedData.duplicateFingerprint;
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('modality', state.tagging.modality)
      .eq('status', 'completed')
      .gte('started_at', new Date(state.parsedData.startTime!.getTime() - 120000).toISOString())
      .lte('started_at', new Date(state.parsedData.startTime!.getTime() + 120000).toISOString())
      .limit(1);

    const isDuplicate = existing && existing.length > 0;

    setState(prev => ({
      ...prev,
      step: 'confirm',
      duplicateWarning: isDuplicate || false,
      existingSessionId: isDuplicate ? existing![0].id : null,
    }));
  }, [targetUserId, state.parsedData, state.tagging.modality]);

  const updateTagging = useCallback((updates: Partial<ImportTagging>) => {
    setState(prev => ({ ...prev, tagging: { ...prev.tagging, ...updates } }));
  }, []);

  const setStep = useCallback((step: ImportStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const confirmImport = useCallback(async (): Promise<string | null> => {
    if (!targetUserId || !state.parsedData) return null;

    setState(prev => ({ ...prev, isImporting: true }));
    const data = state.parsedData;

    try {
      // Create workout session
      const { data: session, error: sessionErr } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: targetUserId,
          workout_name: state.tagging.title || `Imported ${state.tagging.modality}`,
          started_at: data.startTime!.toISOString(),
          ended_at: data.endTime!.toISOString(),
          duration_seconds: Math.round(data.elapsedSeconds),
          moving_seconds: Math.round(data.movingSeconds),
          distance_meters: Math.round(data.totalDistanceMeters),
          avg_pace_sec_per_km: data.avgPaceSecPerKm ? Math.round(data.avgPaceSecPerKm) : null,
          elevation_gain_m: Math.round(data.elevationGain),
          elevation_loss_m: Math.round(data.elevationLoss),
          status: 'completed',
          modality: state.tagging.modality,
          privacy_level: state.tagging.privacyLevel,
          session_type: 'imported',
          route_summary: {
            pointCount: data.trackPoints.length,
            startLat: data.trackPoints[0]?.lat,
            startLng: data.trackPoints[0]?.lng,
            endLat: data.trackPoints[data.trackPoints.length - 1]?.lat,
            endLng: data.trackPoints[data.trackPoints.length - 1]?.lng,
            importFingerprint: data.duplicateFingerprint,
          },
        } as any)
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      // Save route points in batches
      const batchSize = 500;
      for (let i = 0; i < data.trackPoints.length; i += batchSize) {
        const batch = data.trackPoints.slice(i, i + batchSize).map((p, idx) => ({
          session_id: session.id,
          idx: i + idx,
          lat: p.lat,
          lng: p.lng,
          timestamp: p.time!.toISOString(),
          accuracy_m: null,
          altitude_m: p.elevation,
          speed_mps: p.speed,
        }));
        await supabase.from('activity_route_points').insert(batch);
      }

      // Save simplified route
      const maxPoly = 50;
      const step = Math.max(1, Math.ceil(data.trackPoints.length / maxPoly));
      const simplified = data.trackPoints.filter((_, i) => i % step === 0);
      if (simplified[simplified.length - 1] !== data.trackPoints[data.trackPoints.length - 1]) {
        simplified.push(data.trackPoints[data.trackPoints.length - 1]);
      }

      const bbox = computeBbox(data.trackPoints);
      await supabase.from('activity_routes').insert({
        session_id: session.id,
        polyline_simplified: JSON.stringify(simplified.map(p => [p.lat, p.lng])),
        bbox,
        total_points: data.trackPoints.length,
      });

      // If no GPX elevation, trigger elevation API
      if (!data.hasElevation) {
        supabase.functions.invoke('compute-elevation', {
          body: { sessionId: session.id },
        }).catch(() => {});
      }

      // Audit log for coach imports
      if (options?.coachId && options?.forUserId) {
        logAuditEvent({
          action: 'coach_imported_activity',
          message: `Coach imported GPX activity for client`,
          category: 'system',
          severity: 'info',
          entityType: 'workout_session',
          entityId: session.id,
          metadata: { coachId: options.coachId, clientUserId: options.forUserId },
        });
      }

      setState(prev => ({ ...prev, isImporting: false, importedSessionId: session.id }));
      toast.success('Run imported successfully!');
      return session.id;
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import run.');
      setState(prev => ({ ...prev, isImporting: false }));
      return null;
    }
  }, [targetUserId, state.parsedData, state.tagging, options]);

  return {
    state,
    handleFileUpload,
    goToTagging,
    goToConfirm,
    updateTagging,
    confirmImport,
    setStep,
    reset,
  };
}

function computeBbox(points: { lat: number; lng: number }[]) {
  if (points.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}
