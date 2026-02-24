/**
 * Strength Score Configuration
 * Canonical lift mapping + anchor ratios for score computation.
 */

export interface LiftMapping {
  canonical: string;
  weight: number;
  primaryNames: string[];
  optionalNames: string[];
}

export const CANONICAL_LIFTS: LiftMapping[] = [
  {
    canonical: 'Squat',
    weight: 0.30,
    primaryNames: ['Barbell Squat', 'Back Squat'],
    optionalNames: ['Front Squat', 'Safety Bar Squat', 'Safety Squat Bar Squat'],
  },
  {
    canonical: 'Bench',
    weight: 0.25,
    primaryNames: ['Barbell Bench Press', 'Bench Press'],
    optionalNames: ['Close Grip Bench Press', 'Close-Grip Bench Press'],
  },
  {
    canonical: 'Deadlift',
    weight: 0.30,
    primaryNames: ['Deadlift', 'Conventional Deadlift'],
    optionalNames: ['Sumo Deadlift', 'Trap Bar Deadlift', 'Hex Bar Deadlift'],
  },
  {
    canonical: 'OHP',
    weight: 0.15,
    primaryNames: ['Overhead Press', 'Strict Press', 'Standing Barbell Press'],
    optionalNames: ['Dumbbell Shoulder Press', 'Arnold Press'],
  },
];

/** Anchor ratios: [R0 (untrained), R1 (beginner), R2 (intermediate), R3 (advanced), R4 (elite)] */
export interface AnchorSet {
  male: number[];
  female: number[];
  unknown: number[];
}

export const LIFT_ANCHORS: Record<string, AnchorSet> = {
  Squat: {
    male:    [0.50, 0.75, 1.25, 1.75, 2.50],
    female:  [0.30, 0.50, 0.85, 1.25, 1.75],
    unknown: [0.40, 0.63, 1.05, 1.50, 2.13],
  },
  Bench: {
    male:    [0.35, 0.55, 1.00, 1.50, 2.00],
    female:  [0.20, 0.35, 0.65, 1.00, 1.40],
    unknown: [0.28, 0.45, 0.83, 1.25, 1.70],
  },
  Deadlift: {
    male:    [0.60, 1.00, 1.50, 2.00, 2.75],
    female:  [0.40, 0.65, 1.00, 1.50, 2.00],
    unknown: [0.50, 0.83, 1.25, 1.75, 2.38],
  },
  OHP: {
    male:    [0.25, 0.40, 0.65, 1.00, 1.40],
    female:  [0.15, 0.25, 0.45, 0.65, 0.95],
    unknown: [0.20, 0.33, 0.55, 0.83, 1.18],
  },
};

/** Score breakpoints corresponding to anchor ratios: [0, 25, 50, 75, 100] */
const SCORE_BREAKPOINTS = [0, 25, 50, 75, 100];

/** Convert a BW ratio to a 0–100 score using piecewise interpolation */
export function ratioToScore(ratio: number, anchors: number[]): number {
  if (ratio <= anchors[0]) return 0;
  if (ratio >= anchors[4]) return 100;

  for (let i = 0; i < anchors.length - 1; i++) {
    if (ratio <= anchors[i + 1]) {
      const t = (ratio - anchors[i]) / (anchors[i + 1] - anchors[i]);
      return SCORE_BREAKPOINTS[i] + t * (SCORE_BREAKPOINTS[i + 1] - SCORE_BREAKPOINTS[i]);
    }
  }
  return 100;
}

export function scoreToLabel(score: number): string {
  if (score >= 90) return 'Elite';
  if (score >= 75) return 'Advanced';
  if (score >= 50) return 'Intermediate';
  if (score >= 25) return 'Novice';
  return 'Beginner';
}

export type Sex = 'male' | 'female' | 'unknown';
