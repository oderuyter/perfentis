import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders as makeCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

// Curated workout templates
const CURATED_WORKOUTS = [
  {
    title: 'Push Day Essentials',
    description: 'Classic push workout targeting chest, shoulders, and triceps. Perfect for intermediate lifters.',
    workout_type: 'strength',
    difficulty_level: 'intermediate',
    estimated_duration_minutes: 50,
    exercise_data: [
      { name: 'Barbell Bench Press', sets: 4, reps: 8, rest_seconds: 120, order_index: 0 },
      { name: 'Overhead Press', sets: 3, reps: 10, rest_seconds: 90, order_index: 1 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 12, rest_seconds: 90, order_index: 2 },
      { name: 'Lateral Raises', sets: 3, reps: 15, rest_seconds: 60, order_index: 3 },
      { name: 'Tricep Pushdowns', sets: 3, reps: 15, rest_seconds: 60, order_index: 4 },
      { name: 'Overhead Tricep Extension', sets: 3, reps: 12, rest_seconds: 60, order_index: 5 },
    ],
  },
  {
    title: 'Pull Day Essentials',
    description: 'Complete back and bicep workout for building a strong, defined back.',
    workout_type: 'strength',
    difficulty_level: 'intermediate',
    estimated_duration_minutes: 50,
    exercise_data: [
      { name: 'Deadlift', sets: 4, reps: 6, rest_seconds: 180, order_index: 0 },
      { name: 'Pull-ups', sets: 4, reps: 8, rest_seconds: 120, order_index: 1 },
      { name: 'Barbell Rows', sets: 3, reps: 10, rest_seconds: 90, order_index: 2 },
      { name: 'Face Pulls', sets: 3, reps: 15, rest_seconds: 60, order_index: 3 },
      { name: 'Barbell Curls', sets: 3, reps: 12, rest_seconds: 60, order_index: 4 },
      { name: 'Hammer Curls', sets: 3, reps: 12, rest_seconds: 60, order_index: 5 },
    ],
  },
  {
    title: 'Leg Day Foundations',
    description: 'Build strong legs with this comprehensive lower body workout.',
    workout_type: 'strength',
    difficulty_level: 'intermediate',
    estimated_duration_minutes: 55,
    exercise_data: [
      { name: 'Barbell Squat', sets: 4, reps: 8, rest_seconds: 180, order_index: 0 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10, rest_seconds: 120, order_index: 1 },
      { name: 'Leg Press', sets: 3, reps: 12, rest_seconds: 90, order_index: 2 },
      { name: 'Walking Lunges', sets: 3, reps: 12, rest_seconds: 90, order_index: 3 },
      { name: 'Leg Curls', sets: 3, reps: 15, rest_seconds: 60, order_index: 4 },
      { name: 'Calf Raises', sets: 4, reps: 15, rest_seconds: 60, order_index: 5 },
    ],
  },
  {
    title: 'Full Body Strength',
    description: 'Efficient full body workout for when you have limited training days.',
    workout_type: 'strength',
    difficulty_level: 'beginner',
    estimated_duration_minutes: 45,
    exercise_data: [
      { name: 'Goblet Squat', sets: 3, reps: 12, rest_seconds: 90, order_index: 0 },
      { name: 'Dumbbell Bench Press', sets: 3, reps: 10, rest_seconds: 90, order_index: 1 },
      { name: 'Dumbbell Rows', sets: 3, reps: 10, rest_seconds: 90, order_index: 2 },
      { name: 'Shoulder Press', sets: 3, reps: 12, rest_seconds: 60, order_index: 3 },
      { name: 'Romanian Deadlift', sets: 3, reps: 12, rest_seconds: 90, order_index: 4 },
      { name: 'Plank', sets: 3, reps: 60, rest_seconds: 60, order_index: 5 },
    ],
  },
  {
    title: 'HIIT Cardio Blast',
    description: 'High intensity interval training for maximum calorie burn in minimum time.',
    workout_type: 'cardio',
    difficulty_level: 'advanced',
    estimated_duration_minutes: 30,
    exercise_data: [
      { name: 'Burpees', sets: 4, reps: 15, rest_seconds: 30, exercise_type: 'cardio', order_index: 0 },
      { name: 'Mountain Climbers', sets: 4, reps: 30, rest_seconds: 30, exercise_type: 'cardio', order_index: 1 },
      { name: 'Jump Squats', sets: 4, reps: 20, rest_seconds: 30, exercise_type: 'cardio', order_index: 2 },
      { name: 'High Knees', sets: 4, reps: 40, rest_seconds: 30, exercise_type: 'cardio', order_index: 3 },
      { name: 'Box Jumps', sets: 4, reps: 12, rest_seconds: 45, exercise_type: 'cardio', order_index: 4 },
    ],
  },
  {
    title: 'Upper Body Hypertrophy',
    description: 'Higher volume upper body work for muscle growth.',
    workout_type: 'strength',
    difficulty_level: 'advanced',
    estimated_duration_minutes: 60,
    exercise_data: [
      { name: 'Incline Bench Press', sets: 4, reps: 10, rest_seconds: 90, order_index: 0 },
      { name: 'Weighted Pull-ups', sets: 4, reps: 8, rest_seconds: 120, order_index: 1 },
      { name: 'Dumbbell Shoulder Press', sets: 4, reps: 12, rest_seconds: 90, order_index: 2 },
      { name: 'Cable Rows', sets: 4, reps: 12, rest_seconds: 90, order_index: 3 },
      { name: 'Chest Flyes', sets: 3, reps: 15, rest_seconds: 60, order_index: 4 },
      { name: 'Rear Delt Flyes', sets: 3, reps: 15, rest_seconds: 60, order_index: 5 },
      { name: 'EZ Bar Curls', sets: 3, reps: 12, rest_seconds: 60, order_index: 6 },
      { name: 'Skull Crushers', sets: 3, reps: 12, rest_seconds: 60, order_index: 7 },
    ],
  },
];

// Curated training splits
const CURATED_SPLITS = [
  {
    title: 'Push Pull Legs',
    description: 'The classic PPL split - train each muscle group twice per week with optimal recovery.',
    workout_type: 'strength',
    difficulty_level: 'intermediate',
    weeks_count: 8,
    days_per_week: 6,
    goal_tags: ['strength', 'muscle building', 'hypertrophy'],
    weeks: [
      {
        week_number: 1,
        name: 'Week 1',
        workouts: [
          { day_label: 'Push A', order_index: 0 },
          { day_label: 'Pull A', order_index: 1 },
          { day_label: 'Legs A', order_index: 2 },
          { day_label: 'Push B', order_index: 3 },
          { day_label: 'Pull B', order_index: 4 },
          { day_label: 'Legs B', order_index: 5 },
        ],
      },
    ],
  },
  {
    title: 'Upper Lower Split',
    description: 'Simple and effective 4-day split perfect for intermediate lifters.',
    workout_type: 'strength',
    difficulty_level: 'intermediate',
    weeks_count: 6,
    days_per_week: 4,
    goal_tags: ['strength', 'balanced'],
    weeks: [
      {
        week_number: 1,
        name: 'Week 1',
        workouts: [
          { day_label: 'Upper A', order_index: 0 },
          { day_label: 'Lower A', order_index: 1 },
          { day_label: 'Upper B', order_index: 2 },
          { day_label: 'Lower B', order_index: 3 },
        ],
      },
    ],
  },
  {
    title: 'Full Body 3x',
    description: 'Full body training 3 times per week. Great for beginners or those with limited time.',
    workout_type: 'strength',
    difficulty_level: 'beginner',
    weeks_count: 12,
    days_per_week: 3,
    goal_tags: ['full body', 'beginner', 'efficient'],
    weeks: [
      {
        week_number: 1,
        name: 'Week 1',
        workouts: [
          { day_label: 'Full Body A', order_index: 0 },
          { day_label: 'Full Body B', order_index: 1 },
          { day_label: 'Full Body C', order_index: 2 },
        ],
      },
    ],
  },
  {
    title: 'Bro Split Classic',
    description: 'One muscle group per day - the traditional bodybuilding approach.',
    workout_type: 'strength',
    difficulty_level: 'intermediate',
    weeks_count: 8,
    days_per_week: 5,
    goal_tags: ['bodybuilding', 'hypertrophy'],
    weeks: [
      {
        week_number: 1,
        name: 'Week 1',
        workouts: [
          { day_label: 'Chest', order_index: 0 },
          { day_label: 'Back', order_index: 1 },
          { day_label: 'Shoulders', order_index: 2 },
          { day_label: 'Legs', order_index: 3 },
          { day_label: 'Arms', order_index: 4 },
        ],
      },
    ],
  },
  {
    title: 'Strength Foundation',
    description: 'Focus on the big 4 lifts with progressive overload for pure strength gains.',
    workout_type: 'strength',
    difficulty_level: 'intermediate',
    weeks_count: 12,
    days_per_week: 4,
    goal_tags: ['powerlifting', 'strength', 'compound lifts'],
    weeks: [
      {
        week_number: 1,
        name: 'Week 1',
        workouts: [
          { day_label: 'Squat Focus', order_index: 0 },
          { day_label: 'Bench Focus', order_index: 1 },
          { day_label: 'Deadlift Focus', order_index: 2 },
          { day_label: 'OHP Focus', order_index: 3 },
        ],
      },
    ],
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(req);
  }
  const corsHeaders = makeCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      workouts_created: 0,
      splits_created: 0,
      errors: [] as string[],
    };

    // Seed workout templates
    for (const workout of CURATED_WORKOUTS) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('workout_templates')
          .select('id')
          .eq('title', workout.title)
          .eq('is_curated', true)
          .maybeSingle();

        if (existing) continue;

        const { error } = await supabase
          .from('workout_templates')
          .insert({
            ...workout,
            owner_user_id: null,
            status: 'approved',
            is_curated: true,
            source: 'admin',
            version: 1,
          });

        if (error) throw error;
        results.workouts_created++;
      } catch (e: any) {
        results.errors.push(`Workout ${workout.title}: ${e.message}`);
      }
    }

    // Seed training splits
    for (const split of CURATED_SPLITS) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('training_splits')
          .select('id')
          .eq('title', split.title)
          .eq('is_curated', true)
          .maybeSingle();

        if (existing) continue;

        const { weeks, ...splitData } = split;

        // Create split
        const { data: newSplit, error: splitError } = await supabase
          .from('training_splits')
          .insert({
            ...splitData,
            owner_user_id: null,
            status: 'approved',
            is_curated: true,
            source: 'admin',
            version: 1,
          })
          .select()
          .single();

        if (splitError) throw splitError;

        // Create weeks
        for (const week of weeks) {
          const { workouts, ...weekData } = week;

          const { data: newWeek, error: weekError } = await supabase
            .from('split_weeks')
            .insert({
              split_id: newSplit.id,
              ...weekData,
            })
            .select()
            .single();

          if (weekError) throw weekError;

          // Create workouts for this week
          for (const workout of workouts) {
            const { error: workoutError } = await supabase
              .from('split_workouts')
              .insert({
                week_id: newWeek.id,
                ...workout,
              });

            if (workoutError) throw workoutError;
          }
        }

        results.splits_created++;
      } catch (e: any) {
        results.errors.push(`Split ${split.title}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
