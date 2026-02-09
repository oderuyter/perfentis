import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  RunState, RunModality, RunStatus, GpsPoint, RunPause, RunLap,
  haversineDistance, saveRunStateLocal, loadRunStateLocal, clearRunStateLocal, PrivacyLevel
} from '@/types/run';
import { toast } from 'sonner';

const ACCURACY_THRESHOLD = 30; // meters – ignore points with worse accuracy
const MIN_DISTANCE_THRESHOLD = 2; // meters – ignore if moved less than this
const PACE_WINDOW = 10; // recent points for current pace

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

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

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

  const addPoint = useCallback((pos: GeolocationPosition) => {
    const s = stateRef.current;
    if (s.status !== 'active') return;

    const point: GpsPoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      timestamp: pos.timestamp,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      speed: pos.coords.speed,
    };

    // Filter poor accuracy
    if (point.accuracy > ACCURACY_THRESHOLD) return;

    setState(prev => {
      const points = [...prev.points];
      let distanceMeters = prev.distanceMeters;
      let elevationGain = prev.elevationGain;
      let elevationLoss = prev.elevationLoss;

      if (points.length > 0) {
        const last = points[points.length - 1];
        const d = haversineDistance(last.lat, last.lng, point.lat, point.lng);
        if (d < MIN_DISTANCE_THRESHOLD) return prev; // too small
        distanceMeters += d;

        // Elevation from GPS (rough, will be refined by API later)
        if (last.altitude != null && point.altitude != null) {
          const elevDelta = point.altitude - last.altitude;
          if (elevDelta > 1) elevationGain += elevDelta;
          if (elevDelta < -1) elevationLoss += Math.abs(elevDelta);
        }
      }

      points.push(point);

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

      // Average pace
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

  const startGps = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      addPoint,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );
  }, [addPoint]);

  const stopGps = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const start = useCallback((modality: RunModality, privacyLevel: PrivacyLevel = 'private') => {
    const now = Date.now();
    setState({
      ...createInitialState(modality, privacyLevel),
      status: 'active',
      startedAt: now,
    });
    startGps();
  }, [startGps]);

  const pause = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'paused',
      pauses: [...prev.pauses, { pausedAt: Date.now(), resumedAt: null, durationMs: null }],
    }));
    stopGps();
  }, [stopGps]);

  const resume = useCallback(() => {
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
    startGps();
  }, [startGps]);

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
    stopGps();
    const s = stateRef.current;
    const endedAt = Date.now();

    // Finalize pauses
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

    // Save to DB
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

      // Save route points in batches of 500
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

      // Save pauses
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

      // Save laps
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

      // Create simplified route
      const simplifiedPoints = simplifyRoute(s.points, 50);
      const bbox = computeBbox(s.points);
      await supabase.from('activity_routes').insert({
        session_id: session.id,
        polyline_simplified: JSON.stringify(simplifiedPoints.map(p => [p.lat, p.lng])),
        bbox,
        total_points: s.points.length,
      });

      // Trigger elevation computation (fire and forget)
      supabase.functions.invoke('compute-elevation', {
        body: { sessionId: session.id },
      }).catch(() => { /* will retry later */ });

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
  }, [user, stopGps]);

  const discard = useCallback(() => {
    stopGps();
    clearRunStateLocal();
    setState(createInitialState('run', 'private'));
  }, [stopGps]);

  const reset = useCallback(() => {
    setState(createInitialState('run', 'private'));
  }, []);

  return { state, start, pause, resume, stop, markLap, discard, reset };
}

// Simple route simplification (keep every Nth point)
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
