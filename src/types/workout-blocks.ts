// Unified Workout Block Types
// Represents all block types: single, superset, emom, amrap, ygig

export type BlockType = 'single' | 'superset' | 'emom' | 'amrap' | 'ygig';

// ─── Block Settings ──────────────────────────────────────────
export interface SupersetSettings {
  rounds: number;
  rest_after_round_seconds: number;
  rest_between_exercises_seconds: number;
  notes?: string;
}

export interface EmomSettings {
  rounds: number; // number of minutes/rounds
  work_seconds?: number; // optional cap per minute
  rest_seconds: number; // rest between minutes (default 0)
  rotation_mode: 'rotate' | 'fixed'; // rotate exercises each minute or same each
  notes?: string;
}

export interface AmrapSettings {
  time_cap_seconds: number;
  rest_enabled: boolean;
  score_mode: 'rounds_reps'; // future: other modes
  notes?: string;
}

export interface YgigSettings {
  rounds?: number;
  max_participants: number;
  turn_mode: 'set_based' | 'timed';
  invite_required: boolean;
  share_mode: 'both' | 'initiator_only';
  notes?: string;
}

export type BlockSettings = SupersetSettings | EmomSettings | AmrapSettings | YgigSettings | { notes?: string };

// ─── Block Item (exercise within a block) ────────────────────
export interface BlockExerciseItem {
  id: string;
  exercise_id?: string;
  name: string; // exercise name or override for free text
  order_index: number;
  item_notes?: string; // weight guidance, coaching cues
  sets?: number;
  reps?: number | string;
  reps_min?: number;
  reps_max?: number;
  sets_min?: number;
  sets_max?: number;
  load_guidance?: string;
  rest_seconds?: number;
  exercise_type?: 'strength' | 'cardio';
  target_json?: Record<string, any>;
}

// ─── Workout Block (the container) ───────────────────────────
export interface WorkoutBlock {
  type: BlockType;
  id: string;
  title?: string;
  order_index: number;
  settings: BlockSettings;
  items: BlockExerciseItem[];
}

// ─── Union type for backward compat with old structure ───────
// WorkoutStructureItem can now be a WorkoutBlock
export type UnifiedStructureItem = WorkoutBlock;

// ─── Type Guards ─────────────────────────────────────────────
export function isSingleBlock(block: WorkoutBlock): boolean {
  return block.type === 'single';
}

export function isSupersetBlock(block: WorkoutBlock): boolean {
  return block.type === 'superset';
}

export function isEmomBlock(block: WorkoutBlock): boolean {
  return block.type === 'emom';
}

export function isAmrapBlock(block: WorkoutBlock): boolean {
  return block.type === 'amrap';
}

export function isYgigBlock(block: WorkoutBlock): boolean {
  return block.type === 'ygig';
}

// ─── Helpers ─────────────────────────────────────────────────
export function generateBlockId(prefix: 'blk' | 'bi' = 'blk'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateBlockItemId(): string {
  return `bi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createSingleBlock(exercise: { id?: string; name: string; exerciseType?: 'strength' | 'cardio' }, orderIndex: number): WorkoutBlock {
  return {
    type: 'single',
    id: generateBlockId(),
    order_index: orderIndex,
    settings: {},
    items: [{
      id: generateBlockItemId(),
      exercise_id: exercise.id,
      name: exercise.name,
      order_index: 0,
      sets: 3,
      reps: exercise.exerciseType === 'cardio' ? undefined : 10,
      rest_seconds: 90,
      exercise_type: exercise.exerciseType,
    }],
  };
}

export function createEmptySupersetBlock(orderIndex: number): WorkoutBlock {
  return {
    type: 'superset',
    id: generateBlockId(),
    title: 'Superset',
    order_index: orderIndex,
    settings: {
      rounds: 1,
      rest_after_round_seconds: 90,
      rest_between_exercises_seconds: 0,
    } as SupersetSettings,
    items: [],
  };
}

export function createEmomBlock(orderIndex: number): WorkoutBlock {
  return {
    type: 'emom',
    id: generateBlockId(),
    title: 'EMOM',
    order_index: orderIndex,
    settings: {
      rounds: 10,
      rest_seconds: 0,
      rotation_mode: 'rotate',
    } as EmomSettings,
    items: [],
  };
}

export function createAmrapBlock(orderIndex: number): WorkoutBlock {
  return {
    type: 'amrap',
    id: generateBlockId(),
    title: 'AMRAP',
    order_index: orderIndex,
    settings: {
      time_cap_seconds: 600, // 10 min default
      rest_enabled: false,
      score_mode: 'rounds_reps',
    } as AmrapSettings,
    items: [],
  };
}

export function createYgigBlock(orderIndex: number): WorkoutBlock {
  return {
    type: 'ygig',
    id: generateBlockId(),
    title: 'You Go, I Go',
    order_index: orderIndex,
    settings: {
      rounds: 3,
      max_participants: 2,
      turn_mode: 'set_based',
      invite_required: true,
      share_mode: 'both',
    } as YgigSettings,
    items: [],
  };
}

// ─── Convert legacy superset/exercise items to unified blocks ──
import type { WorkoutStructureItem, ExerciseItem, SupersetBlock } from './superset';

export function legacyItemsToBlocks(items: WorkoutStructureItem[]): WorkoutBlock[] {
  return items.map((item, index) => {
    if (item.type === 'superset') {
      const ss = item as SupersetBlock;
      return {
        type: 'superset' as const,
        id: ss.id,
        title: ss.name,
        order_index: index,
        settings: {
          rounds: ss.rounds || 1,
          rest_after_round_seconds: ss.rest_after_round_seconds || 90,
          rest_between_exercises_seconds: ss.rest_between_exercises_seconds || 0,
        } as SupersetSettings,
        items: ss.items.map((ex, i) => ({
          id: ex.id,
          exercise_id: ex.exercise_id,
          name: ex.name,
          order_index: i,
          sets: ex.sets,
          reps: ex.reps,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          sets_min: ex.sets_min,
          sets_max: ex.sets_max,
          load_guidance: ex.load_guidance,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
          item_notes: ex.notes,
          exercise_type: ex.exercise_type,
        })),
      };
    }
    const ex = item as ExerciseItem;
    return {
      type: 'single' as const,
      id: ex.id,
      order_index: index,
      settings: {},
      items: [{
        id: ex.id,
        exercise_id: ex.exercise_id,
        name: ex.name,
        order_index: 0,
        sets: ex.sets,
        reps: ex.reps,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        sets_min: ex.sets_min,
        sets_max: ex.sets_max,
        load_guidance: ex.load_guidance,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
        item_notes: ex.notes,
        exercise_type: ex.exercise_type,
      }],
    };
  });
}

// Convert blocks back to legacy format for JSONB storage
export function blocksToLegacyItems(blocks: WorkoutBlock[]): WorkoutStructureItem[] {
  return blocks.map((block, index) => {
    if (block.type === 'single' && block.items.length === 1) {
      const item = block.items[0];
      return {
        type: 'exercise' as const,
        id: block.id,
        exercise_id: item.exercise_id || '',
        name: item.name,
        sets: item.sets || 3,
        reps: item.reps,
        reps_min: item.reps_min,
        reps_max: item.reps_max,
        sets_min: item.sets_min,
        sets_max: item.sets_max,
        load_guidance: item.load_guidance,
        rest_seconds: item.rest_seconds,
        notes: item.item_notes,
        order_index: index,
        exercise_type: item.exercise_type,
      } as ExerciseItem;
    }
    if (block.type === 'superset') {
      const s = block.settings as SupersetSettings;
      return {
        type: 'superset' as const,
        id: block.id,
        name: block.title,
        rounds: s.rounds,
        rest_after_round_seconds: s.rest_after_round_seconds,
        rest_between_exercises_seconds: s.rest_between_exercises_seconds,
        items: block.items.map((item, i) => ({
          type: 'exercise' as const,
          id: item.id,
          exercise_id: item.exercise_id || '',
          name: item.name,
          sets: item.sets || 3,
          reps: item.reps,
          reps_min: item.reps_min,
          reps_max: item.reps_max,
          sets_min: item.sets_min,
          sets_max: item.sets_max,
          load_guidance: item.load_guidance,
          rest_seconds: item.rest_seconds,
          notes: item.item_notes,
          order_index: i,
          exercise_type: item.exercise_type,
        })) as ExerciseItem[],
        order_index: index,
      } as SupersetBlock;
    }
    // For emom, amrap, ygig — store as extended block type in JSONB
    return {
      type: block.type as any,
      id: block.id,
      name: block.title,
      settings: block.settings,
      items: block.items.map((item, i) => ({
        type: 'exercise' as const,
        id: item.id,
        exercise_id: item.exercise_id || '',
        name: item.name,
        sets: item.sets || 3,
        reps: item.reps,
        rest_seconds: item.rest_seconds,
        notes: item.item_notes,
        order_index: i,
        exercise_type: item.exercise_type,
        load_guidance: item.load_guidance,
      })),
      order_index: index,
    } as any;
  });
}

// Parse JSONB exercise_data back to WorkoutBlock[]
export function parseExerciseDataToBlocks(data: any[]): WorkoutBlock[] {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map((item, index) => {
    const blockType = item.type as string;
    
    if (blockType === 'superset' || blockType === 'emom' || blockType === 'amrap' || blockType === 'ygig') {
      const items = (item.items || []).map((ex: any, i: number) => ({
        id: ex.id || generateBlockItemId(),
        exercise_id: ex.exercise_id,
        name: ex.name,
        order_index: i,
        item_notes: ex.notes || ex.item_notes,
        sets: ex.sets,
        reps: ex.reps,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        sets_min: ex.sets_min,
        sets_max: ex.sets_max,
        load_guidance: ex.load_guidance,
        rest_seconds: ex.rest_seconds,
        exercise_type: ex.exercise_type,
      }));

      let settings: BlockSettings;
      if (blockType === 'superset') {
        settings = {
          rounds: item.rounds || 1,
          rest_after_round_seconds: item.rest_after_round_seconds || 90,
          rest_between_exercises_seconds: item.rest_between_exercises_seconds || 0,
          notes: item.settings?.notes,
        } as SupersetSettings;
      } else if (blockType === 'emom') {
        settings = (item.settings || {
          rounds: 10,
          rest_seconds: 0,
          rotation_mode: 'rotate',
        }) as EmomSettings;
      } else if (blockType === 'amrap') {
        settings = (item.settings || {
          time_cap_seconds: 600,
          rest_enabled: false,
          score_mode: 'rounds_reps',
        }) as AmrapSettings;
      } else {
        settings = (item.settings || {
          max_participants: 2,
          turn_mode: 'set_based',
          invite_required: true,
          share_mode: 'both',
        }) as YgigSettings;
      }

      return {
        type: blockType as BlockType,
        id: item.id || generateBlockId(),
        title: item.name || item.title,
        order_index: index,
        settings,
        items,
      };
    }

    // Single exercise (legacy 'exercise' type or no type)
    return {
      type: 'single' as const,
      id: item.id || generateBlockId(),
      order_index: index,
      settings: {},
      items: [{
        id: item.id || generateBlockItemId(),
        exercise_id: item.exercise_id,
        name: item.name,
        order_index: 0,
        item_notes: item.notes,
        sets: item.sets,
        reps: item.reps,
        reps_min: item.reps_min,
        reps_max: item.reps_max,
        sets_min: item.sets_min,
        sets_max: item.sets_max,
        load_guidance: item.load_guidance,
        rest_seconds: item.rest_seconds,
        exercise_type: item.exercise_type,
      }],
    };
  });
}

// ─── Active Workout Block State ──────────────────────────────
export interface ActiveBlockState {
  blockId: string;
  blockType: BlockType;
  title?: string;
  settings: BlockSettings;
  status: 'not_started' | 'active' | 'completed' | 'skipped';
  startedAt?: string;
  // EMOM-specific
  currentRound?: number;
  totalRounds?: number;
  minuteStartedAt?: string;
  minuteEndsAt?: string;
  // AMRAP-specific
  timeCapSeconds?: number;
  amrapStartedAt?: string;
  roundsCompleted?: number;
  repsInCurrentRound?: number;
  // YGIG-specific
  participants?: string[]; // user IDs
  activeParticipantUserId?: string;
  turnIndex?: number;
  pendingInvites?: string[];
}

// ─── Flatten blocks to exercise list for active workout ──────
export interface FlattenedBlockExercise {
  exercise: BlockExerciseItem;
  blockId: string;
  blockType: BlockType;
  blockTitle?: string;
  blockPosition: number;
  globalOrder: number;
}

export function flattenBlocks(blocks: WorkoutBlock[]): FlattenedBlockExercise[] {
  const result: FlattenedBlockExercise[] = [];
  let globalOrder = 0;

  for (const block of blocks) {
    for (let i = 0; i < block.items.length; i++) {
      result.push({
        exercise: block.items[i],
        blockId: block.id,
        blockType: block.type,
        blockTitle: block.title,
        blockPosition: i,
        globalOrder: globalOrder++,
      });
    }
  }

  return result;
}
