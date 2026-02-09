// Run tracker types

export type RunModality = 'run' | 'walk';
export type RunStatus = 'idle' | 'active' | 'paused' | 'completed' | 'abandoned';
export type PrivacyLevel = 'private' | 'followers' | 'public';

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number; // ms epoch
  accuracy: number; // meters
  altitude: number | null;
  speed: number | null; // m/s
}

export interface RunPause {
  pausedAt: number; // ms epoch
  resumedAt: number | null;
  durationMs: number | null;
}

export interface RunLap {
  lapNumber: number;
  markedAt: number; // ms epoch
  distanceMeters: number;
  elapsedSeconds: number;
  movingSeconds: number;
}

export interface RunSplit {
  splitNumber: number;
  distanceMeters: number;
  durationSeconds: number;
  paceSecPerKm: number;
  elevationGain: number;
  elevationLoss: number;
}

export interface RunState {
  sessionId: string | null; // DB session id once saved
  modality: RunModality;
  status: RunStatus;
  privacyLevel: PrivacyLevel;
  startedAt: number | null;
  endedAt: number | null;
  
  // Metrics (computed live)
  elapsedSeconds: number;
  movingSeconds: number;
  distanceMeters: number;
  currentPaceSecPerKm: number | null;
  avgPaceSecPerKm: number | null;
  elevationGain: number;
  elevationLoss: number;
  
  // GPS data
  points: GpsPoint[];
  pauses: RunPause[];
  laps: RunLap[];
  
  // Goals (optional)
  goalDistanceMeters: number | null;
  goalTimeSeconds: number | null;
  
  // Sync
  lastSavedAt: number | null;
}

// Haversine distance between two GPS points in meters
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatPace(secPerKm: number | null): string {
  if (!secPerKm || secPerKm <= 0 || !isFinite(secPerKm)) return '--:--';
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatRunDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

const RUN_STATE_KEY = 'active_run_state';

export function saveRunStateLocal(state: RunState) {
  try {
    localStorage.setItem(RUN_STATE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

export function loadRunStateLocal(): RunState | null {
  try {
    const raw = localStorage.getItem(RUN_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearRunStateLocal() {
  localStorage.removeItem(RUN_STATE_KEY);
}
