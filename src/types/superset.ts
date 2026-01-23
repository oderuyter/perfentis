// Superset (Exercise Block) Types
// Represents grouped exercises that are performed sequentially

export type WorkoutItemType = 'exercise' | 'superset';

// A single exercise item (used both standalone and within supersets)
export interface ExerciseItem {
  type: 'exercise';
  id: string; // unique id for this instance
  exercise_id: string;
  name: string;
  sets: number;
  reps?: number | string; // Can be number or range like "8-10"
  reps_min?: number;
  reps_max?: number;
  sets_min?: number;
  sets_max?: number;
  load_guidance?: string;
  rest_seconds?: number;
  notes?: string;
  order_index: number;
  exercise_type?: 'strength' | 'cardio';
}

// A superset block containing multiple exercises
export interface SupersetBlock {
  type: 'superset';
  id: string; // unique id for this superset
  name?: string; // e.g., "Superset A", "Chest & Back Circuit"
  rounds?: number; // Number of times to repeat the whole block (defaults to 1)
  rest_after_round_seconds?: number; // Rest after completing all exercises once (default 90s)
  rest_between_exercises_seconds?: number; // Rest between exercises within a round (default 0)
  items: ExerciseItem[]; // Exercises in this superset
  order_index: number;
}

// Union type for any workout structure item
export type WorkoutStructureItem = ExerciseItem | SupersetBlock;

// Helper type guards
export function isSuperset(item: WorkoutStructureItem): item is SupersetBlock {
  return item.type === 'superset';
}

export function isExercise(item: WorkoutStructureItem): item is ExerciseItem {
  return item.type === 'exercise';
}

// Helper to generate unique IDs
export function generateItemId(prefix: 'ex' | 'ss' = 'ex'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Convert legacy exercise data to new structure
export function legacyToStructuredItems(legacyData: any[]): WorkoutStructureItem[] {
  return legacyData.map((item, index) => {
    if (item.type === 'superset') {
      return {
        ...item,
        id: item.id || generateItemId('ss'),
        items: item.items.map((ex: any, i: number) => ({
          ...ex,
          type: 'exercise' as const,
          id: ex.id || generateItemId('ex'),
          order_index: i,
        })),
        order_index: index,
      } as SupersetBlock;
    }
    return {
      ...item,
      type: 'exercise' as const,
      id: item.id || generateItemId('ex'),
      order_index: index,
    } as ExerciseItem;
  });
}

// Flatten workout structure for logging - returns all exercises with block info
export interface FlattenedExercise {
  exercise: ExerciseItem;
  blockId?: string;
  blockType?: 'superset';
  blockName?: string;
  blockRound?: number;
  blockOrder: number; // Order within block (0 for standalone)
  globalOrder: number; // Order in the flattened list
}

export function flattenWorkoutStructure(items: WorkoutStructureItem[]): FlattenedExercise[] {
  const result: FlattenedExercise[] = [];
  let globalOrder = 0;

  items.forEach((item) => {
    if (isSuperset(item)) {
      item.items.forEach((exercise, blockOrder) => {
        result.push({
          exercise,
          blockId: item.id,
          blockType: 'superset',
          blockName: item.name,
          blockOrder,
          globalOrder: globalOrder++,
        });
      });
    } else {
      result.push({
        exercise: item,
        blockOrder: 0,
        globalOrder: globalOrder++,
      });
    }
  });

  return result;
}

// Create empty superset block
export function createEmptySuperset(orderIndex: number): SupersetBlock {
  return {
    type: 'superset',
    id: generateItemId('ss'),
    name: 'Superset',
    rounds: 1,
    rest_after_round_seconds: 90,
    rest_between_exercises_seconds: 0,
    items: [],
    order_index: orderIndex,
  };
}

// Create exercise item from library exercise
export function createExerciseItem(
  exercise: { id: string; name: string; exerciseType?: 'strength' | 'cardio' },
  orderIndex: number
): ExerciseItem {
  return {
    type: 'exercise',
    id: generateItemId('ex'),
    exercise_id: exercise.id,
    name: exercise.name,
    sets: 3,
    reps: exercise.exerciseType === 'cardio' ? undefined : 10,
    rest_seconds: 90,
    order_index: orderIndex,
    exercise_type: exercise.exerciseType,
  };
}

// Superset default settings
export const SUPERSET_DEFAULTS = {
  rounds: 1,
  restAfterRound: 90,
  restBetweenExercises: 0,
};
