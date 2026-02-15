// GPX file parser for importing run/walk activities
import { haversineDistance } from '@/types/run';

export interface GpxTrackPoint {
  lat: number;
  lng: number;
  elevation: number | null;
  time: Date | null;
  speed: number | null;
}

export interface GpxSplit {
  splitNumber: number;
  distanceMeters: number;
  durationSeconds: number;
  paceSecPerKm: number;
  elevationGain: number;
  elevationLoss: number;
}

export interface GpxParsedData {
  name: string | null;
  trackPoints: GpxTrackPoint[];
  startTime: Date | null;
  endTime: Date | null;
  totalDistanceMeters: number;
  elapsedSeconds: number;
  movingSeconds: number;
  avgPaceSecPerKm: number | null;
  elevationGain: number;
  elevationLoss: number;
  hasElevation: boolean;
  hasTimestamps: boolean;
  splits: GpxSplit[];
  duplicateFingerprint: string;
}

export interface GpxParseError {
  type: 'invalid_xml' | 'no_trackpoints' | 'no_timestamps' | 'invalid_coords';
  message: string;
}

export type GpxParseResult = 
  | { ok: true; data: GpxParsedData }
  | { ok: false; error: GpxParseError };

const STATIONARY_SPEED_THRESHOLD = 0.3; // m/s - below this is considered paused
const ELEVATION_THRESHOLD = 2; // meters - ignore noise below this

export function parseGpxFile(xmlString: string): GpxParseResult {
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlString, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { ok: false, error: { type: 'invalid_xml', message: 'Invalid GPX file format.' } };
    }
  } catch {
    return { ok: false, error: { type: 'invalid_xml', message: 'Could not parse GPX file.' } };
  }

  // Extract track name
  const nameEl = doc.querySelector('trk > name') || doc.querySelector('metadata > name');
  const name = nameEl?.textContent?.trim() || null;

  // Extract trackpoints from <trkpt> elements
  const trkpts = doc.querySelectorAll('trkpt');
  if (trkpts.length === 0) {
    return { ok: false, error: { type: 'no_trackpoints', message: 'No trackpoints found in GPX file.' } };
  }

  const trackPoints: GpxTrackPoint[] = [];
  let hasTimestamps = true;
  let hasElevation = false;

  trkpts.forEach((pt) => {
    const lat = parseFloat(pt.getAttribute('lat') || '');
    const lng = parseFloat(pt.getAttribute('lon') || '');

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return; // skip invalid
    }

    const eleEl = pt.querySelector('ele');
    const elevation = eleEl ? parseFloat(eleEl.textContent || '') : null;
    if (elevation !== null && !isNaN(elevation)) hasElevation = true;

    const timeEl = pt.querySelector('time');
    let time: Date | null = null;
    if (timeEl?.textContent) {
      time = new Date(timeEl.textContent);
      if (isNaN(time.getTime())) time = null;
    }
    if (!time) hasTimestamps = false;

    trackPoints.push({
      lat,
      lng,
      elevation: elevation !== null && !isNaN(elevation) ? elevation : null,
      time,
      speed: null,
    });
  });

  if (trackPoints.length === 0) {
    return { ok: false, error: { type: 'invalid_coords', message: 'No valid coordinates found in GPX.' } };
  }

  if (!hasTimestamps) {
    return { ok: false, error: { type: 'no_timestamps', message: 'GPX file is missing timestamps on trackpoints. Timestamps are required to compute pace and duration.' } };
  }

  // Sort by time
  trackPoints.sort((a, b) => (a.time!.getTime() - b.time!.getTime()));

  // Compute speeds between points
  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const cur = trackPoints[i];
    const dist = haversineDistance(prev.lat, prev.lng, cur.lat, cur.lng);
    const dt = (cur.time!.getTime() - prev.time!.getTime()) / 1000;
    cur.speed = dt > 0 ? dist / dt : 0;
  }

  // Compute stats
  const startTime = trackPoints[0].time!;
  const endTime = trackPoints[trackPoints.length - 1].time!;
  const elapsedSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

  let totalDistance = 0;
  let movingTime = 0;
  let elevGain = 0;
  let elevLoss = 0;

  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const cur = trackPoints[i];
    const dist = haversineDistance(prev.lat, prev.lng, cur.lat, cur.lng);
    const dt = (cur.time!.getTime() - prev.time!.getTime()) / 1000;
    const speed = dt > 0 ? dist / dt : 0;

    totalDistance += dist;

    // Moving time: only count if speed above threshold and segment < 60s (skip big gaps)
    if (speed > STATIONARY_SPEED_THRESHOLD && dt < 60) {
      movingTime += dt;
    }

    // Elevation
    if (hasElevation && prev.elevation !== null && cur.elevation !== null) {
      const delta = cur.elevation - prev.elevation;
      if (delta > ELEVATION_THRESHOLD) elevGain += delta;
      if (delta < -ELEVATION_THRESHOLD) elevLoss += Math.abs(delta);
    }
  }

  const avgPace = totalDistance > 10 && movingTime > 0
    ? (movingTime / totalDistance) * 1000
    : null;

  // Compute 1km splits
  const splits = computeSplits(trackPoints);

  // Duplicate fingerprint
  const fingerprint = computeFingerprint(startTime, endTime, totalDistance, trackPoints);

  return {
    ok: true,
    data: {
      name,
      trackPoints,
      startTime,
      endTime,
      totalDistanceMeters: totalDistance,
      elapsedSeconds,
      movingSeconds: movingTime,
      avgPaceSecPerKm: avgPace,
      elevationGain: elevGain,
      elevationLoss: elevLoss,
      hasElevation,
      hasTimestamps: true,
      splits,
      duplicateFingerprint: fingerprint,
    },
  };
}

function computeSplits(points: GpxTrackPoint[]): GpxSplit[] {
  const splits: GpxSplit[] = [];
  if (points.length < 2) return splits;

  let splitDist = 0;
  let splitStartIdx = 0;
  let splitNumber = 1;
  let splitElevGain = 0;
  let splitElevLoss = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const d = haversineDistance(prev.lat, prev.lng, cur.lat, cur.lng);
    splitDist += d;

    if (prev.elevation !== null && cur.elevation !== null) {
      const delta = cur.elevation - prev.elevation;
      if (delta > 0) splitElevGain += delta;
      else splitElevLoss += Math.abs(delta);
    }

    if (splitDist >= 1000) {
      const startTime = points[splitStartIdx].time!.getTime();
      const endTime = cur.time!.getTime();
      const durSec = (endTime - startTime) / 1000;

      splits.push({
        splitNumber,
        distanceMeters: Math.round(splitDist),
        durationSeconds: Math.round(durSec),
        paceSecPerKm: Math.round(durSec * (1000 / splitDist)),
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
    const startTime = points[splitStartIdx].time!.getTime();
    const endTime = points[points.length - 1].time!.getTime();
    const durSec = (endTime - startTime) / 1000;
    const pace = splitDist > 0 ? (durSec / splitDist) * 1000 : 0;

    splits.push({
      splitNumber,
      distanceMeters: Math.round(splitDist),
      durationSeconds: Math.round(durSec),
      paceSecPerKm: Math.round(pace),
      elevationGain: Math.round(splitElevGain),
      elevationLoss: Math.round(splitElevLoss),
    });
  }

  return splits;
}

function computeFingerprint(start: Date, end: Date, distance: number, points: GpxTrackPoint[]): string {
  // Round to reduce false negatives from tiny differences
  const startMin = Math.round(start.getTime() / 60000);
  const endMin = Math.round(end.getTime() / 60000);
  const distRounded = Math.round(distance / 100); // 100m buckets

  // Sample 5 points for signature
  const sampleIndices = [0, Math.floor(points.length / 4), Math.floor(points.length / 2), Math.floor(3 * points.length / 4), points.length - 1];
  const samples = sampleIndices.map(i => {
    const p = points[Math.min(i, points.length - 1)];
    return `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
  }).join('|');

  return `${startMin}_${endMin}_${distRounded}_${samples}`;
}
