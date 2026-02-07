// Fuzzy exercise matching utilities

import type { Exercise } from '@/types/exercise';

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Normalize exercise name for matching
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common aliases mapping
const ALIASES: Record<string, string[]> = {
  'bench press': ['flat bench', 'barbell bench', 'bp', 'flat press', 'chest press barbell'],
  'incline bench press': ['incline press', 'incline barbell press', 'incline bp'],
  'overhead press': ['ohp', 'military press', 'shoulder press', 'standing press'],
  'squat': ['back squat', 'barbell squat', 'bb squat'],
  'front squat': ['front barbell squat'],
  'deadlift': ['conventional deadlift', 'barbell deadlift', 'dl'],
  'romanian deadlift': ['rdl', 'stiff leg deadlift', 'straight leg deadlift'],
  'pull up': ['pullup', 'pull-up', 'chin up', 'chinup'],
  'lat pulldown': ['lat pull down', 'cable pulldown', 'pulldown'],
  'barbell row': ['bent over row', 'bb row', 'barbell bent over row'],
  'dumbbell row': ['db row', 'single arm row', '1 arm row'],
  'bicep curl': ['barbell curl', 'bb curl', 'biceps curl', 'arm curl'],
  'dumbbell curl': ['db curl'],
  'tricep extension': ['triceps extension', 'skull crusher', 'skullcrusher'],
  'lateral raise': ['side raise', 'side lateral raise', 'lat raise'],
  'calf raise': ['calf raises', 'standing calf raise'],
  'leg press': ['machine leg press'],
  'leg curl': ['hamstring curl', 'lying leg curl'],
  'leg extension': ['quad extension'],
  'hip thrust': ['barbell hip thrust', 'glute bridge barbell'],
  'cable fly': ['cable flye', 'cable chest fly'],
  'face pull': ['face pulls', 'rear delt pull'],
  'dip': ['dips', 'chest dip', 'tricep dip'],
  'plank': ['front plank', 'forearm plank'],
  'running': ['run', 'treadmill', 'jogging'],
  'cycling': ['bike', 'stationary bike', 'spin'],
  'rowing': ['row machine', 'erg', 'ergometer'],
};

// Check if input matches any alias
function findAliasMatch(input: string): string | null {
  const normalized = normalize(input);
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    if (normalized === normalize(canonical)) return canonical;
    for (const alias of aliases) {
      if (normalized === normalize(alias)) return canonical;
    }
  }
  return null;
}

export interface MatchResult {
  exercise: Exercise;
  confidence: number;
  matchType: 'exact' | 'alias' | 'fuzzy';
}

// Find best match for an exercise name against the library
export function findBestMatch(
  inputName: string,
  exercises: Exercise[],
  topN: number = 5
): MatchResult[] {
  const normalizedInput = normalize(inputName);
  const results: MatchResult[] = [];

  // 1. Exact match
  for (const ex of exercises) {
    if (normalize(ex.name) === normalizedInput) {
      results.push({ exercise: ex, confidence: 1.0, matchType: 'exact' });
      return results; // Perfect match, return immediately
    }
  }

  // 2. Alias match
  const aliasCanonical = findAliasMatch(inputName);
  if (aliasCanonical) {
    for (const ex of exercises) {
      if (normalize(ex.name) === normalize(aliasCanonical)) {
        results.push({ exercise: ex, confidence: 0.95, matchType: 'alias' });
      }
    }
    if (results.length > 0) return results.slice(0, topN);
  }

  // 3. Fuzzy match using Levenshtein distance
  const scored: { exercise: Exercise; score: number }[] = [];
  for (const ex of exercises) {
    const normalizedEx = normalize(ex.name);
    const distance = levenshtein(normalizedInput, normalizedEx);
    const maxLen = Math.max(normalizedInput.length, normalizedEx.length);
    const similarity = maxLen > 0 ? 1 - distance / maxLen : 0;

    // Also check substring containment
    const containsBonus = normalizedEx.includes(normalizedInput) || normalizedInput.includes(normalizedEx) ? 0.2 : 0;

    // Word overlap bonus
    const inputWords = new Set(normalizedInput.split(' '));
    const exWords = new Set(normalizedEx.split(' '));
    const commonWords = [...inputWords].filter(w => exWords.has(w)).length;
    const wordBonus = commonWords > 0 ? (commonWords / Math.max(inputWords.size, exWords.size)) * 0.3 : 0;

    const finalScore = Math.min(similarity + containsBonus + wordBonus, 0.99);
    
    if (finalScore > 0.3) {
      scored.push({ exercise: ex, score: finalScore });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  for (const s of scored.slice(0, topN)) {
    results.push({
      exercise: s.exercise,
      confidence: Math.round(s.score * 100) / 100,
      matchType: 'fuzzy',
    });
  }

  return results;
}

// Auto-match threshold
export const AUTO_MATCH_THRESHOLD = 0.85;

// Batch match all parsed exercises against the library
export function batchMatchExercises(
  parsedNames: string[],
  exercises: Exercise[]
): Map<string, MatchResult[]> {
  const results = new Map<string, MatchResult[]>();
  
  for (const name of parsedNames) {
    results.set(name, findBestMatch(name, exercises));
  }
  
  return results;
}
