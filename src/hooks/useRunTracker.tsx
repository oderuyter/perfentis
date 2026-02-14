import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  RunState, RunModality, RunStatus, GpsPoint, RunPause, RunLap,
  haversineDistance, saveRunStateLocal, loadRunStateLocal, clearRunStateLocal, PrivacyLevel
} from '@/types/run';
import { GpsTrackingManager, TrackingPoint, TrackingState, GpsQuality } from '@/lib/gpsTrackingManager';
import { toast } from 'sonner';

const PACE_WINDOW = 10;

function createInitialState(modality: RunModality, privacyLevel: PrivacyLevel): RunState {
  return {
    sessionId: null,
    modality,
    status: 'idle',
    privacyLevel,
    startedAt: null,
    endedAt: null,
    elapsedSeconds: 0,
    movingSeconds: 0,
    distanceMeters: 0,
    currentPaceSecPerKm: null,
    avgPaceSecPerKm: null,
    elevationGain: 0,
    elevationLoss: 0,
    points: [],
    pauses: [],
    laps: [],
    goalDistanceMeters: null,
    goalTimeSeconds: null,
    lastSavedAt: null,
  };
}

export function useRunTracker() {
  const { user } = useAuth();
  const [state, setState] = useState<RunState>(() => {
    const saved = loadRunStateLocal();
    if (saved && (saved.status === 'active' || saved.status === 'paused')) return saved;
    return createInitialState('run', 'private');
  });

  const [gpsState, setGpsState] = useState<TrackingState>({
    isTracking: false,
    quality: 'none' as GpsQuality,
    pointCount: 0,
    lastPointAt: null,
    hasWakeLock: false,
    backgroundWarning: false,
  });

  const trackerRef = useRef<GpsTrackingManager | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Create tracker once
  useEffect(() => {
    const manager = new GpsTrackingManager({
      accuracyThreshold: 50,
      minDistanceThreshold: 2,
      minTimeInterval: 2000,
      stationaryTimeInterval: 15000,
      enableWakeLock: true,
      enableKalmanFilter: true,
    });

    manager.onPoint((point: TrackingPoint) => {
      addPoint(point);
    });

    manager.onStateChange((ts: TrackingState) => {
      setGpsState(ts);
    });

    trackerRef.current = manager;

    return () => {
      manager.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resume tracking on mount if session was active
  useEffect(() => {
    if ((state.status === 'active') && trackerRef.current && !trackerRef.current.state.isTracking) {
      trackerRef.current.start();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist state on every change
  useEffect(() => {
    if (state.status === 'active' || state.status === 'paused') {
      saveRunStateLocal(state);
    }
  }, [state]);

  // Timer tick for elapsed/moving time
  useEffect(() => {
    if (state.status === 'active') {
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          elapsedSeconds: prev.startedAt ? (Date.now() - prev.startedAt) / 1000 - prev.pauses.reduce((s, p) => s + (p.durationMs || 0), 0) / 1000 : 0,
          movingSeconds: prev.movingSeconds + 1,
        }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.status]);

  const addPoint = useCallback((point: TrackingPoint) => {
    const s = stateRef.current;
    if (s.status !== 'active') return;

    const gpsPoint: GpsPoint = {
      lat: point.lat,
      lng: point.lng,
      timestamp: point.timestamp,
      accuracy: point.accuracy,
      altitude: point.altitude,
      speed: point.speed,
    };

    setState(prev => {
      const points = [...prev.points];
      let distanceMeters = prev.distanceMeters;
      let elevationGain = prev.elevationGain;
      let elevationLoss = prev.elevationLoss;

      if (points.length > 0) {
        const last = points[points.length - 1];
        const d = haversineDistance(last.lat, last.lng, gpsPoint.lat, gpsPoint.lng);
        if (d < 1) return prev; // extra safety
        distanceMeters += d;

        if (last.altitude != null && gpsPoint.altitude != null) {
          const elevDelta = gpsPoint.altitude - last.altitude;
          if (elevDelta > 1) elevationGain += elevDelta;
          if (elevDelta < -1) elevationLoss += Math.abs(elevDelta);
        }
      }

      points.push(gpsPoint);

      // Current pace from recent window
      let currentPaceSecPerKm = prev.currentPaceSecPerKm;
      if (points.length >= 2) {
        const windowPoints = points.slice(-PACE_WINDOW);
        if (windowPoints.length >= 2) {
          const first = windowPoints[0];
          const lastP = windowPoints[windowPoints.length - 1];
          const windowDist = windowPoints.slice(1).reduce((sum, p, i) => {
            return sum + haversineDistance(windowPoints[i].lat, windowPoints[i].lng, p.lat, p.lng);
          }, 0);
          const windowTime = (lastP.timestamp - first.timestamp) / 1000;
          if (windowDist > 5) {
            currentPaceSecPerKm = (windowTime / windowDist) * 1000;
          }
        }
      }

      const avgPaceSecPerKm = distanceMeters > 10 && prev.movingSeconds > 0
        ? (prev.movingSeconds / distanceMeters) * 1000
        : null;

      return {
        ...prev,
        points,
        distanceMeters,
        elevationGain,
        elevationLoss,
        currentPaceSecPerKm,
        avgPaceSecPerKm,
      };
    });
  }, []);

  const start = useCallback(async (modality: RunModality, privacyLevel: PrivacyLevel = 'private') => {
    const now = Date.now();
    setState({
      ...createInitialState(modality, privacyLevel),
      status: 'active',
      startedAt: now,
    });

    const ok = await trackerRef.current?.start();
    if (!ok) {
      toast.error('Could not start GPS tracking. Check location permissions.');
    }
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'paused',
      pauses: [...prev.pauses, { pausedAt: Date.now(), resumedAt: null, durationMs: null }],
    }));
    trackerRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    setState(prev => {
      const pauses = [...prev.pauses];
      if (pauses.length > 0) {
        const last = pauses[pauses.length - 1];
        if (!last.resumedAt) {
          const now = Date.now();
          pauses[pauses.length - 1] = {
            ...last,
            resumedAt: now,
            durationMs: now - last.pausedAt,
          };
        }
      }
      return { ...prev, status: 'active', pauses };
    });
    await trackerRef.current?.resume();
  }, []);

  const markLap = useCallback(() => {
    setState(prev => {
      const lap: RunLap = {
        lapNumber: prev.laps.length + 1,
        markedAt: Date.now(),
        distanceMeters: prev.distanceMeters,
        elapsedSeconds: Math.round(prev.elapsedSeconds),
        movingSeconds: Math.round(prev.movingSeconds),
      };
      return { ...prev, laps: [...prev.laps, lap] };
    });
  }, []);

  const stop = useCallback(async (): Promise<string | null> => {
    trackerRef.current?.stop();
    const s = stateRef.current;
    const endedAt = Date.now();

    const pauses = s.pauses.map(p => {
      if (!p.resumedAt) return { ...p, resumedAt: endedAt, durationMs: endedAt - p.pausedAt };
      return p;
    });

    const totalPausedMs = pauses.reduce((sum, p) => sum + (p.durationMs || 0), 0);
    const elapsedSeconds = s.startedAt ? (endedAt - s.startedAt) / 1000 : 0;
    const movingSeconds = elapsedSeconds - totalPausedMs / 1000;
    const avgPaceSecPerKm = s.distanceMeters > 10 && movingSeconds > 0
      ? (movingSeconds / s.distanceMeters) * 1000
      : null;

    const finalState: RunState = {
      ...s,
      status: 'completed',
      endedAt,
      pauses,
      elapsedSeconds,
      movingSeconds,
      avgPaceSecPerKm,
    };

    setState(finalState);

    if (!user) return null;
    try {
      const { data: session, error: sessionErr } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          workout_name: `${s.modality === 'walk' ? 'Walk' : 'Run'} – ${(s.distanceMeters / 1000).toFixed(2)} km`,
          started_at: new Date(s.startedAt!).toISOString(),
          ended_at: new Date(endedAt).toISOString(),
          duration_seconds: Math.round(elapsedSeconds),
          status: 'completed',
          modality: s.modality,
          moving_seconds: Math.round(movingSeconds),
          distance_meters: Math.round(s.distanceMeters),
          avg_pace_sec_per_km: avgPaceSecPerKm ? Math.round(avgPaceSecPerKm) : null,
          elevation_gain_m: Math.round(s.elevationGain),
          elevation_loss_m: Math.round(s.elevationLoss),
          privacy_level: s.privacyLevel,
          route_summary: {
            pointCount: s.points.length,
            startLat: s.points[0]?.lat,
            startLng: s.points[0]?.lng,
            endLat: s.points[s.points.length - 1]?.lat,
            endLng: s.points[s.points.length - 1]?.lng,
          },
        } as any)
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      // Save route points in batches
      if (s.points.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < s.points.length; i += batchSize) {
          const batch = s.points.slice(i, i + batchSize).map((p, idx) => ({
            session_id: session.id,
            idx: i + idx,
            lat: p.lat,
            lng: p.lng,
            timestamp: new Date(p.timestamp).toISOString(),
            accuracy_m: p.accuracy,
            altitude_m: p.altitude,
            speed_mps: p.speed,
          }));
          await supabase.from('activity_route_points').insert(batch);
        }
      }

      if (pauses.length > 0) {
        await supabase.from('activity_pauses').insert(
          pauses.map(p => ({
            session_id: session.id,
            paused_at: new Date(p.pausedAt).toISOString(),
            resumed_at: p.resumedAt ? new Date(p.resumedAt).toISOString() : null,
            duration_seconds: p.durationMs ? Math.round(p.durationMs / 1000) : null,
          }))
        );
      }

      if (s.laps.length > 0) {
        await supabase.from('activity_laps').insert(
          s.laps.map(l => ({
            session_id: session.id,
            lap_number: l.lapNumber,
            marked_at: new Date(l.markedAt).toISOString(),
            distance_meters_at_mark: Math.round(l.distanceMeters),
            elapsed_seconds_at_mark: l.elapsedSeconds,
            moving_seconds_at_mark: l.movingSeconds,
          }))
        );
      }

      const simplifiedPoints = simplifyRoute(s.points, 50);
      const bbox = computeBbox(s.points);
      await supabase.from('activity_routes').insert({
        session_id: session.id,
        polyline_simplified: JSON.stringify(simplifiedPoints.map(p => [p.lat, p.lng])),
        bbox,
        total_points: s.points.length,
      });

      supabase.functions.invoke('compute-elevation', {
        body: { sessionId: session.id },
      }).catch(() => {});

      clearRunStateLocal();
      setState(prev => ({ ...prev, sessionId: session.id }));
      toast.success('Run saved!');
      return session.id;
    } catch (err) {
      console.error('Error saving run:', err);
      toast.error('Failed to save run. Data preserved locally.');
      saveRunStateLocal(finalState);
      return null;
    }
  }, [user]);

  const discard = useCallback(() => {
    trackerRef.current?.stop();
    clearRunStateLocal();
    setState(createInitialState('run', 'private'));
  }, []);

  const reset = useCallback(() => {
    setState(createInitialState('run', 'private'));
  }, []);

  return { state, gpsState, start, pause, resume, stop, markLap, discard, reset };
}

function simplifyRoute(points: GpsPoint[], maxPoints: number): GpsPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const result: GpsPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    result.push(points[i]);
  }
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }
  return result;
}

function computeBbox(points: GpsPoint[]) {
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
