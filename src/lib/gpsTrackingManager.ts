/**
 * GPS Tracking Manager
 * 
 * Centralized GPS tracking with:
 * - Kalman filtering for noise reduction
 * - Wake Lock API for screen-on persistence
 * - Quality assessment per point
 * - Deduplication and accuracy filtering
 * - Architecture ready for Capacitor native background tracking
 */

import { GpsPoint, haversineDistance } from '@/types/run';

// ── Types ──────────────────────────────────────────────────────────────

export type GpsQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

export interface TrackingPoint extends GpsPoint {
  quality: GpsQuality;
  heading: number | null;
  isFiltered: boolean; // true if Kalman-smoothed
  raw: { lat: number; lng: number }; // original unfiltered coords
}

export interface TrackingConfig {
  accuracyThreshold: number;       // max accuracy to accept (meters)
  minDistanceThreshold: number;    // min distance between points (meters)
  minTimeInterval: number;         // min time between points (ms)
  stationaryTimeInterval: number;  // time between points when stationary (ms)
  stationarySpeedThreshold: number; // speed below which considered stationary (m/s)
  enableWakeLock: boolean;
  enableKalmanFilter: boolean;
}

export interface TrackingState {
  isTracking: boolean;
  quality: GpsQuality;
  pointCount: number;
  lastPointAt: number | null;
  hasWakeLock: boolean;
  backgroundWarning: boolean;
}

type PointCallback = (point: TrackingPoint) => void;
type StateCallback = (state: TrackingState) => void;

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: TrackingConfig = {
  accuracyThreshold: 50,        // accept up to 50m but mark quality
  minDistanceThreshold: 2,      // 2m minimum movement
  minTimeInterval: 2000,        // 2 seconds min between points
  stationaryTimeInterval: 15000, // 15 seconds when stationary
  stationarySpeedThreshold: 0.3, // 0.3 m/s (~1 km/h)
  enableWakeLock: true,
  enableKalmanFilter: true,
};

// ── Kalman Filter (1D, applied separately to lat/lng) ──────────────────

class KalmanFilter1D {
  private estimate: number;
  private errorEstimate: number;
  private errorMeasurement: number;
  private q: number; // process noise

  constructor(initialValue: number, errorMeasurement: number = 3, q: number = 0.1) {
    this.estimate = initialValue;
    this.errorEstimate = errorMeasurement;
    this.errorMeasurement = errorMeasurement;
    this.q = q;
  }

  update(measurement: number, accuracy?: number): number {
    // Adjust measurement noise based on GPS accuracy
    const noise = accuracy ? Math.max(accuracy / 10, this.errorMeasurement) : this.errorMeasurement;
    
    // Prediction
    const predictionError = this.errorEstimate + this.q;
    
    // Update
    const kalmanGain = predictionError / (predictionError + noise);
    this.estimate = this.estimate + kalmanGain * (measurement - this.estimate);
    this.errorEstimate = (1 - kalmanGain) * predictionError;
    
    return this.estimate;
  }
}

// ── Quality Assessment ─────────────────────────────────────────────────

function assessQuality(accuracy: number): GpsQuality {
  if (accuracy <= 5) return 'excellent';
  if (accuracy <= 10) return 'good';
  if (accuracy <= 25) return 'fair';
  if (accuracy <= 50) return 'poor';
  return 'none';
}

export function getQualityColor(quality: GpsQuality): string {
  switch (quality) {
    case 'excellent': return 'text-green-500';
    case 'good': return 'text-green-400';
    case 'fair': return 'text-yellow-500';
    case 'poor': return 'text-orange-500';
    case 'none': return 'text-destructive';
  }
}

export function getQualityLabel(quality: GpsQuality): string {
  switch (quality) {
    case 'excellent': return 'Excellent GPS';
    case 'good': return 'Good GPS';
    case 'fair': return 'Fair GPS';
    case 'poor': return 'Poor GPS';
    case 'none': return 'No GPS Signal';
  }
}

// ── Tracking Manager ───────────────────────────────────────────────────

export class GpsTrackingManager {
  private config: TrackingConfig;
  private watchId: number | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private kalmanLat: KalmanFilter1D | null = null;
  private kalmanLng: KalmanFilter1D | null = null;
  private lastPoint: TrackingPoint | null = null;
  private lastRawTime: number = 0;
  private isStationary: boolean = false;
  private pointCallback: PointCallback | null = null;
  private stateCallback: StateCallback | null = null;
  private _state: TrackingState = {
    isTracking: false,
    quality: 'none',
    pointCount: 0,
    lastPointAt: null,
    hasWakeLock: false,
    backgroundWarning: false,
  };

  constructor(config: Partial<TrackingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get state(): TrackingState {
    return { ...this._state };
  }

  onPoint(cb: PointCallback) {
    this.pointCallback = cb;
  }

  onStateChange(cb: StateCallback) {
    this.stateCallback = cb;
  }

  private updateState(partial: Partial<TrackingState>) {
    this._state = { ...this._state, ...partial };
    this.stateCallback?.(this._state);
  }

  // ── Start / Stop ──

  async start(): Promise<boolean> {
    if (this._state.isTracking) return true;

    if (!navigator.geolocation) {
      console.error('[TrackingManager] Geolocation not supported');
      return false;
    }

    // Request Wake Lock
    if (this.config.enableWakeLock) {
      await this.acquireWakeLock();
    }

    // Detect background limitations
    const isStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone;
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
    const backgroundWarning = !isStandalone && !isCapacitor;

    this.updateState({
      isTracking: true,
      backgroundWarning,
    });

    // Start watching
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    // Listen for visibility changes to re-acquire wake lock
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    return true;
  }

  stop() {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.releaseWakeLock();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    this.kalmanLat = null;
    this.kalmanLng = null;
    this.lastPoint = null;
    this.lastRawTime = 0;
    this.isStationary = false;

    this.updateState({
      isTracking: false,
      quality: 'none',
      hasWakeLock: false,
    });
  }

  pause() {
    // Keep wake lock but stop GPS to save battery
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.updateState({ isTracking: false });
  }

  async resume() {
    if (this._state.isTracking) return;

    this.updateState({ isTracking: true });

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    if (this.config.enableWakeLock && !this.wakeLock) {
      await this.acquireWakeLock();
    }
  }

  // ── Wake Lock ──

  private async acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.updateState({ hasWakeLock: false });
        });
        this.updateState({ hasWakeLock: true });
      }
    } catch (err) {
      console.warn('[TrackingManager] Wake Lock failed:', err);
      this.updateState({ hasWakeLock: false });
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
      this.updateState({ hasWakeLock: false });
    }
  }

  private handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && this._state.isTracking) {
      // Re-acquire wake lock when app comes back to foreground
      if (this.config.enableWakeLock && !this.wakeLock) {
        await this.acquireWakeLock();
      }
    }
  };

  // ── Position Handling ──

  private handlePosition(pos: GeolocationPosition) {
    const now = pos.timestamp;
    const accuracy = pos.coords.accuracy;
    const quality = assessQuality(accuracy);

    // Update quality even if we filter the point
    this.updateState({ quality });

    // Reject extremely bad accuracy but still update quality indicator
    if (accuracy > this.config.accuracyThreshold) {
      return;
    }

    // Time-based deduplication
    const timeSinceLastRaw = now - this.lastRawTime;
    const minInterval = this.isStationary
      ? this.config.stationaryTimeInterval
      : this.config.minTimeInterval;

    if (timeSinceLastRaw < minInterval) {
      return;
    }

    this.lastRawTime = now;

    // Raw coordinates
    const rawLat = pos.coords.latitude;
    const rawLng = pos.coords.longitude;

    // Apply Kalman filter
    let filteredLat = rawLat;
    let filteredLng = rawLng;
    let isFiltered = false;

    if (this.config.enableKalmanFilter) {
      if (!this.kalmanLat) {
        // Initialize filters with first point
        this.kalmanLat = new KalmanFilter1D(rawLat, accuracy / 111320);
        this.kalmanLng = new KalmanFilter1D(rawLng, accuracy / (111320 * Math.cos(rawLat * Math.PI / 180)));
      } else {
        filteredLat = this.kalmanLat.update(rawLat, accuracy / 111320);
        filteredLng = this.kalmanLng!.update(rawLng, accuracy / (111320 * Math.cos(rawLat * Math.PI / 180)));
        isFiltered = true;
      }
    }

    // Distance-based deduplication (using filtered coords)
    if (this.lastPoint) {
      const dist = haversineDistance(
        this.lastPoint.lat, this.lastPoint.lng,
        filteredLat, filteredLng
      );

      if (dist < this.config.minDistanceThreshold) {
        // Detect stationarity
        this.isStationary = true;
        return;
      }
      this.isStationary = false;
    }

    // Detect stationary from speed
    const speed = pos.coords.speed;
    if (speed != null && speed < this.config.stationarySpeedThreshold) {
      this.isStationary = true;
    }

    const point: TrackingPoint = {
      lat: filteredLat,
      lng: filteredLng,
      timestamp: now,
      accuracy,
      altitude: pos.coords.altitude,
      speed,
      heading: pos.coords.heading,
      quality,
      isFiltered,
      raw: { lat: rawLat, lng: rawLng },
    };

    this.lastPoint = point;
    this.updateState({
      pointCount: this._state.pointCount + 1,
      lastPointAt: now,
    });

    this.pointCallback?.(point);
  }

  private handleError(err: GeolocationPositionError) {
    if (err.code === err.PERMISSION_DENIED) {
      this.updateState({ quality: 'none' });
    }
    console.warn('[TrackingManager] GPS error:', err.message);
  }
}

// ── Smoothing utility for post-processing ──────────────────────────────

/**
 * Apply Kalman smoothing to an array of GPS points for display.
 * Returns a new array with smoothed coordinates.
 */
export function smoothGpsPoints(points: GpsPoint[]): GpsPoint[] {
  if (points.length < 3) return points;

  const kalmanLat = new KalmanFilter1D(points[0].lat, 3, 0.05);
  const kalmanLng = new KalmanFilter1D(points[0].lng, 3, 0.05);

  return points.map((p, i) => {
    if (i === 0) return p;
    const smoothedLat = kalmanLat.update(p.lat, p.accuracy / 111320);
    const smoothedLng = kalmanLng.update(p.lng, p.accuracy / (111320 * Math.cos(p.lat * Math.PI / 180)));
    return { ...p, lat: smoothedLat, lng: smoothedLng };
  });
}
