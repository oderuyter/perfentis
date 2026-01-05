-- Seed system exercises
-- Using a fixed UUID for exercise_id to ensure consistency across environments

-- CHEST EXERCISES
INSERT INTO public.exercises (exercise_id, name, type, source, primary_muscle, secondary_muscles, equipment, instructions) VALUES
('11111111-1111-1111-1111-111111111001', 'Barbell Bench Press', 'strength', 'system', 'chest', ARRAY['triceps', 'shoulders']::muscle_group[], ARRAY['barbell', 'bench']::equipment_type[], 'Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up'),
('11111111-1111-1111-1111-111111111002', 'Dumbbell Bench Press', 'strength', 'system', 'chest', ARRAY['triceps', 'shoulders']::muscle_group[], ARRAY['dumbbell', 'bench']::equipment_type[], 'Lie on bench with dumbbells, press up and together'),
('11111111-1111-1111-1111-111111111003', 'Incline Barbell Press', 'strength', 'system', 'chest', ARRAY['triceps', 'shoulders']::muscle_group[], ARRAY['barbell', 'bench']::equipment_type[], 'Set bench to 30-45 degrees, press barbell from upper chest'),
('11111111-1111-1111-1111-111111111004', 'Incline Dumbbell Press', 'strength', 'system', 'chest', ARRAY['triceps', 'shoulders']::muscle_group[], ARRAY['dumbbell', 'bench']::equipment_type[], 'Set bench to 30-45 degrees, press dumbbells up'),
('11111111-1111-1111-1111-111111111005', 'Dumbbell Fly', 'strength', 'system', 'chest', ARRAY[]::muscle_group[], ARRAY['dumbbell', 'bench']::equipment_type[], 'Lie on bench, arms extended, lower in arc motion'),
('11111111-1111-1111-1111-111111111006', 'Cable Fly', 'strength', 'system', 'chest', ARRAY[]::muscle_group[], ARRAY['cable']::equipment_type[], 'Stand between cables, bring handles together in front'),
('11111111-1111-1111-1111-111111111007', 'Push-Up', 'strength', 'system', 'chest', ARRAY['triceps', 'shoulders']::muscle_group[], ARRAY['bodyweight']::equipment_type[], 'Hands shoulder-width, lower chest to floor, push up'),
('11111111-1111-1111-1111-111111111008', 'Chest Dip', 'strength', 'system', 'chest', ARRAY['triceps', 'shoulders']::muscle_group[], ARRAY['dip_bars']::equipment_type[], 'Lean forward, lower body, push back up'),

-- BACK EXERCISES
('11111111-1111-1111-1111-111111111011', 'Barbell Row', 'strength', 'system', 'back', ARRAY['biceps', 'lats']::muscle_group[], ARRAY['barbell']::equipment_type[], 'Bend at hips, pull bar to lower chest'),
('11111111-1111-1111-1111-111111111012', 'Dumbbell Row', 'strength', 'system', 'back', ARRAY['biceps', 'lats']::muscle_group[], ARRAY['dumbbell', 'bench']::equipment_type[], 'One arm on bench, row dumbbell to hip'),
('11111111-1111-1111-1111-111111111013', 'Pull-Up', 'strength', 'system', 'lats', ARRAY['biceps', 'back']::muscle_group[], ARRAY['pull_up_bar']::equipment_type[], 'Overhand grip, pull chin above bar'),
('11111111-1111-1111-1111-111111111014', 'Chin-Up', 'strength', 'system', 'lats', ARRAY['biceps', 'back']::muscle_group[], ARRAY['pull_up_bar']::equipment_type[], 'Underhand grip, pull chin above bar'),
('11111111-1111-1111-1111-111111111015', 'Lat Pulldown', 'strength', 'system', 'lats', ARRAY['biceps', 'back']::muscle_group[], ARRAY['cable', 'machine']::equipment_type[], 'Pull bar to upper chest, squeeze lats'),
('11111111-1111-1111-1111-111111111016', 'Seated Cable Row', 'strength', 'system', 'back', ARRAY['biceps', 'lats']::muscle_group[], ARRAY['cable']::equipment_type[], 'Sit upright, pull handle to abdomen'),
('11111111-1111-1111-1111-111111111017', 'Deadlift', 'strength', 'system', 'back', ARRAY['hamstrings', 'glutes', 'lower_back']::muscle_group[], ARRAY['barbell']::equipment_type[], 'Hinge at hips, grip bar, stand up straight'),
('11111111-1111-1111-1111-111111111018', 'T-Bar Row', 'strength', 'system', 'back', ARRAY['biceps', 'lats']::muscle_group[], ARRAY['barbell']::equipment_type[], 'Straddle bar, pull to chest'),

-- SHOULDER EXERCISES
('11111111-1111-1111-1111-111111111021', 'Overhead Press', 'strength', 'system', 'shoulders', ARRAY['triceps']::muscle_group[], ARRAY['barbell']::equipment_type[], 'Press bar from shoulders overhead'),
('11111111-1111-1111-1111-111111111022', 'Dumbbell Shoulder Press', 'strength', 'system', 'shoulders', ARRAY['triceps']::muscle_group[], ARRAY['dumbbell']::equipment_type[], 'Press dumbbells from shoulders overhead'),
('11111111-1111-1111-1111-111111111023', 'Lateral Raise', 'strength', 'system', 'shoulders', ARRAY[]::muscle_group[], ARRAY['dumbbell']::equipment_type[], 'Raise dumbbells to sides until parallel'),
('11111111-1111-1111-1111-111111111024', 'Front Raise', 'strength', 'system', 'shoulders', ARRAY[]::muscle_group[], ARRAY['dumbbell']::equipment_type[], 'Raise dumbbells in front until parallel'),
('11111111-1111-1111-1111-111111111025', 'Rear Delt Fly', 'strength', 'system', 'shoulders', ARRAY['back']::muscle_group[], ARRAY['dumbbell']::equipment_type[], 'Bend over, raise dumbbells to sides'),
('11111111-1111-1111-1111-111111111026', 'Face Pull', 'strength', 'system', 'shoulders', ARRAY['traps', 'back']::muscle_group[], ARRAY['cable']::equipment_type[], 'Pull rope to face, externally rotate'),
('11111111-1111-1111-1111-111111111027', 'Arnold Press', 'strength', 'system', 'shoulders', ARRAY['triceps']::muscle_group[], ARRAY['dumbbell']::equipment_type[], 'Start palms facing you, rotate and press up'),

-- ARM EXERCISES
('11111111-1111-1111-1111-111111111031', 'Barbell Curl', 'strength', 'system', 'biceps', ARRAY['forearms']::muscle_group[], ARRAY['barbell']::equipment_type[], 'Curl bar from thighs to shoulders'),
('11111111-1111-1111-1111-111111111032', 'Dumbbell Curl', 'strength', 'system', 'biceps', ARRAY['forearms']::muscle_group[], ARRAY['dumbbell']::equipment_type[], 'Curl dumbbells alternating or together'),
('11111111-1111-1111-1111-111111111033', 'Hammer Curl', 'strength', 'system', 'biceps', ARRAY['forearms']::muscle_group[], ARRAY['dumbbell']::equipment_type[], 'Curl with neutral grip, thumbs up'),
('11111111-1111-1111-1111-111111111034', 'Preacher Curl', 'strength', 'system', 'biceps', ARRAY[]::muscle_group[], ARRAY['dumbbell', 'bench']::equipment_type[], 'Curl with arms on preacher pad'),
('11111111-1111-1111-1111-111111111035', 'Tricep Pushdown', 'strength', 'system', 'triceps', ARRAY[]::muscle_group[], ARRAY['cable']::equipment_type[], 'Push cable attachment down, keep elbows fixed'),
('11111111-1111-1111-1111-111111111036', 'Skull Crusher', 'strength', 'system', 'triceps', ARRAY[]::muscle_group[], ARRAY['barbell', 'bench']::equipment_type[], 'Lower bar to forehead, extend arms'),
('11111111-1111-1111-1111-111111111037', 'Overhead Tricep Extension', 'strength', 'system', 'triceps', ARRAY[]::muscle_group[], ARRAY['dumbbell']::equipment_type[], 'Hold weight overhead, lower behind head'),
('11111111-1111-1111-1111-111111111038', 'Tricep Dip', 'strength', 'system', 'triceps', ARRAY['chest', 'shoulders']::muscle_group[], ARRAY['dip_bars']::equipment_type[], 'Keep torso upright, lower and push up'),

-- LEG EXERCISES
('11111111-1111-1111-1111-111111111041', 'Barbell Squat', 'strength', 'system', 'quadriceps', ARRAY['glutes', 'hamstrings']::muscle_group[], ARRAY['barbell']::equipment_type[], 'Bar on upper back, squat to parallel or below'),
('11111111-1111-1111-1111-111111111042', 'Front Squat', 'strength', 'system', 'quadriceps', ARRAY['glutes', 'abs']::muscle_group[], ARRAY['barbell']::equipment_type[], 'Bar on front shoulders, squat down'),
('11111111-1111-1111-1111-111111111043', 'Goblet Squat', 'strength', 'system', 'quadriceps', ARRAY['glutes']::muscle_group[], ARRAY['dumbbell', 'kettlebell']::equipment_type[], 'Hold weight at chest, squat down'),
('11111111-1111-1111-1111-111111111044', 'Leg Press', 'strength', 'system', 'quadriceps', ARRAY['glutes', 'hamstrings']::muscle_group[], ARRAY['machine']::equipment_type[], 'Push platform away, control return'),
('11111111-1111-1111-1111-111111111045', 'Romanian Deadlift', 'strength', 'system', 'hamstrings', ARRAY['glutes', 'lower_back']::muscle_group[], ARRAY['barbell']::equipment_type[], 'Hinge at hips, lower bar along legs'),
('11111111-1111-1111-1111-111111111046', 'Leg Curl', 'strength', 'system', 'hamstrings', ARRAY[]::muscle_group[], ARRAY['machine']::equipment_type[], 'Curl weight toward glutes'),
('11111111-1111-1111-1111-111111111047', 'Leg Extension', 'strength', 'system', 'quadriceps', ARRAY[]::muscle_group[], ARRAY['machine']::equipment_type[], 'Extend legs against resistance'),
('11111111-1111-1111-1111-111111111048', 'Walking Lunge', 'strength', 'system', 'quadriceps', ARRAY['glutes', 'hamstrings']::muscle_group[], ARRAY['dumbbell', 'bodyweight']::equipment_type[], 'Step forward into lunge, alternate legs'),
('11111111-1111-1111-1111-111111111049', 'Bulgarian Split Squat', 'strength', 'system', 'quadriceps', ARRAY['glutes']::muscle_group[], ARRAY['dumbbell', 'bench']::equipment_type[], 'Rear foot elevated, squat on front leg'),
('11111111-1111-1111-1111-111111111050', 'Hip Thrust', 'strength', 'system', 'glutes', ARRAY['hamstrings']::muscle_group[], ARRAY['barbell', 'bench']::equipment_type[], 'Back on bench, thrust hips up'),
('11111111-1111-1111-1111-111111111051', 'Calf Raise', 'strength', 'system', 'calves', ARRAY[]::muscle_group[], ARRAY['machine', 'bodyweight']::equipment_type[], 'Rise onto toes, lower controlled'),

-- CORE EXERCISES
('11111111-1111-1111-1111-111111111061', 'Plank', 'strength', 'system', 'abs', ARRAY['obliques', 'lower_back']::muscle_group[], ARRAY['bodyweight']::equipment_type[], 'Hold body straight on forearms and toes'),
('11111111-1111-1111-1111-111111111062', 'Hanging Leg Raise', 'strength', 'system', 'abs', ARRAY['hip_flexors']::muscle_group[], ARRAY['pull_up_bar']::equipment_type[], 'Hang and raise legs to parallel'),
('11111111-1111-1111-1111-111111111063', 'Cable Crunch', 'strength', 'system', 'abs', ARRAY[]::muscle_group[], ARRAY['cable']::equipment_type[], 'Kneel at cable, crunch down'),
('11111111-1111-1111-1111-111111111064', 'Russian Twist', 'strength', 'system', 'obliques', ARRAY['abs']::muscle_group[], ARRAY['medicine_ball', 'bodyweight']::equipment_type[], 'Sit with feet up, twist side to side'),
('11111111-1111-1111-1111-111111111065', 'Ab Wheel Rollout', 'strength', 'system', 'abs', ARRAY['lower_back']::muscle_group[], ARRAY['bodyweight']::equipment_type[], 'Roll wheel out, maintain flat back'),
('11111111-1111-1111-1111-111111111066', 'Dead Bug', 'strength', 'system', 'abs', ARRAY['lower_back']::muscle_group[], ARRAY['bodyweight']::equipment_type[], 'Lie on back, extend opposite arm and leg'),

-- CARDIO EXERCISES
('11111111-1111-1111-1111-111111111071', 'Treadmill Run', 'cardio', 'system', NULL, NULL, ARRAY['cardio_machine']::equipment_type[], 'Run on treadmill at desired pace'),
('11111111-1111-1111-1111-111111111072', 'Outdoor Run', 'cardio', 'system', NULL, NULL, ARRAY['none']::equipment_type[], 'Run outdoors on road or trail'),
('11111111-1111-1111-1111-111111111073', 'Stationary Bike', 'cardio', 'system', NULL, NULL, ARRAY['cardio_machine']::equipment_type[], 'Cycle on stationary bike'),
('11111111-1111-1111-1111-111111111074', 'Rowing Machine', 'cardio', 'system', NULL, NULL, ARRAY['cardio_machine']::equipment_type[], 'Row with proper form on ergometer'),
('11111111-1111-1111-1111-111111111075', 'Elliptical', 'cardio', 'system', NULL, NULL, ARRAY['cardio_machine']::equipment_type[], 'Stride on elliptical machine'),
('11111111-1111-1111-1111-111111111076', 'Stair Climber', 'cardio', 'system', NULL, NULL, ARRAY['cardio_machine']::equipment_type[], 'Climb on stair machine'),
('11111111-1111-1111-1111-111111111077', 'Jump Rope', 'cardio', 'system', NULL, NULL, ARRAY['none']::equipment_type[], 'Skip rope at consistent pace'),
('11111111-1111-1111-1111-111111111078', 'Walking', 'cardio', 'system', NULL, NULL, ARRAY['none']::equipment_type[], 'Walk at brisk pace'),
('11111111-1111-1111-1111-111111111079', 'Swimming', 'cardio', 'system', NULL, NULL, ARRAY['none']::equipment_type[], 'Swim laps in pool'),
('11111111-1111-1111-1111-111111111080', 'Assault Bike', 'cardio', 'system', NULL, NULL, ARRAY['cardio_machine']::equipment_type[], 'Full body bike with arm handles');

-- Update cardio exercises with modality
UPDATE public.exercises SET modality = 'run' WHERE exercise_id IN ('11111111-1111-1111-1111-111111111071', '11111111-1111-1111-1111-111111111072');
UPDATE public.exercises SET modality = 'bike' WHERE exercise_id IN ('11111111-1111-1111-1111-111111111073', '11111111-1111-1111-1111-111111111080');
UPDATE public.exercises SET modality = 'row' WHERE exercise_id = '11111111-1111-1111-1111-111111111074';
UPDATE public.exercises SET modality = 'elliptical' WHERE exercise_id = '11111111-1111-1111-1111-111111111075';
UPDATE public.exercises SET modality = 'stair_climber' WHERE exercise_id = '11111111-1111-1111-1111-111111111076';
UPDATE public.exercises SET modality = 'jump_rope' WHERE exercise_id = '11111111-1111-1111-1111-111111111077';
UPDATE public.exercises SET modality = 'walking' WHERE exercise_id = '11111111-1111-1111-1111-111111111078';
UPDATE public.exercises SET modality = 'swim' WHERE exercise_id = '11111111-1111-1111-1111-111111111079';