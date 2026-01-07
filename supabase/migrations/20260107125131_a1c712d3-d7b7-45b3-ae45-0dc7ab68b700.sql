-- ============================================
-- GYMS & MEMBERSHIPS
-- ============================================
CREATE TABLE public.gyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  logo_url TEXT,
  owner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gyms are viewable by everyone" ON public.gyms FOR SELECT USING (true);
CREATE POLICY "Gym owners can update their gyms" ON public.gyms FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated users can create gyms" ON public.gyms FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  tier TEXT DEFAULT 'standard',
  membership_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  next_payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships" ON public.memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memberships" ON public.memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memberships" ON public.memberships FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Gym owners can view gym memberships" ON public.memberships FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.gyms WHERE gyms.id = memberships.gym_id AND gyms.owner_id = auth.uid())
);

CREATE TABLE public.membership_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.membership_checkins FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE memberships.id = membership_checkins.membership_id AND memberships.user_id = auth.uid())
);
CREATE POLICY "Gyms can insert checkins" ON public.membership_checkins FOR INSERT WITH CHECK (true);

-- ============================================
-- COACHES
-- ============================================
CREATE TABLE public.coaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  is_online BOOLEAN DEFAULT true,
  avatar_url TEXT,
  hourly_rate NUMERIC,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches are viewable by everyone" ON public.coaches FOR SELECT USING (true);
CREATE POLICY "Coaches can update own profile" ON public.coaches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can become coaches" ON public.coaches FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.coach_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.coach_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view requests to them" ON public.coach_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.coaches WHERE coaches.id = coach_requests.coach_id AND coaches.user_id = auth.uid())
);
CREATE POLICY "Users can create requests" ON public.coach_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coaches can update requests" ON public.coach_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.coaches WHERE coaches.id = coach_requests.coach_id AND coaches.user_id = auth.uid())
);

CREATE TABLE public.coach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_request_id UUID NOT NULL REFERENCES public.coach_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages" ON public.coach_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_requests cr
    JOIN public.coaches c ON c.id = cr.coach_id
    WHERE cr.id = coach_messages.coach_request_id
    AND (cr.user_id = auth.uid() OR c.user_id = auth.uid())
  )
);
CREATE POLICY "Participants can send messages" ON public.coach_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coach_requests cr
    JOIN public.coaches c ON c.id = cr.coach_id
    WHERE cr.id = coach_messages.coach_request_id
    AND (cr.user_id = auth.uid() OR c.user_id = auth.uid())
    AND auth.uid() = sender_id
  )
);

CREATE TABLE public.checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  mood TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view client checkins" ON public.checkins FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.coaches WHERE coaches.id = checkins.coach_id AND coaches.user_id = auth.uid())
);
CREATE POLICY "Users can create checkins" ON public.checkins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PROGRESS PHOTOS
-- ============================================
CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos" ON public.progress_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload photos" ON public.progress_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own photos" ON public.progress_photos FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view client photos" ON public.progress_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_requests cr
    JOIN public.coaches c ON c.id = cr.coach_id
    WHERE cr.user_id = progress_photos.user_id
    AND c.user_id = auth.uid()
    AND cr.status = 'accepted'
  )
);

-- ============================================
-- SOCIAL
-- ============================================
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- EVENTS / COMPETITIONS
-- ============================================
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organiser_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  location TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published events are viewable" ON public.events FOR SELECT USING (status = 'published' OR auth.uid() = organiser_id);
CREATE POLICY "Organisers can create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = organiser_id);
CREATE POLICY "Organisers can update events" ON public.events FOR UPDATE USING (auth.uid() = organiser_id);
CREATE POLICY "Organisers can delete events" ON public.events FOR DELETE USING (auth.uid() = organiser_id);

CREATE TABLE public.event_divisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Divisions are viewable with event" ON public.event_divisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = event_divisions.event_id AND (events.status = 'published' OR events.organiser_id = auth.uid()))
);
CREATE POLICY "Organisers can manage divisions" ON public.event_divisions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = event_divisions.event_id AND events.organiser_id = auth.uid())
);

CREATE TABLE public.event_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  division_id UUID REFERENCES public.event_divisions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries" ON public.event_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Organisers can view event entries" ON public.event_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = event_entries.event_id AND events.organiser_id = auth.uid())
);
CREATE POLICY "Users can enter events" ON public.event_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can withdraw" ON public.event_entries FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.event_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Released workouts are viewable" ON public.event_workouts FOR SELECT USING (
  released_at IS NOT NULL AND released_at <= now()
);
CREATE POLICY "Organisers can manage workouts" ON public.event_workouts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = event_workouts.event_id AND events.organiser_id = auth.uid())
);

CREATE TABLE public.event_leaderboard_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID,
  team_name TEXT,
  score NUMERIC,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_leaderboard_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard is viewable" ON public.event_leaderboard_rows FOR SELECT USING (true);
CREATE POLICY "Organisers can manage leaderboard" ON public.event_leaderboard_rows FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = event_leaderboard_rows.event_id AND events.organiser_id = auth.uid())
);

-- ============================================
-- NUTRITION
-- ============================================
CREATE TABLE public.nutrition_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  food_name TEXT NOT NULL,
  calories INTEGER DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  meal_type TEXT DEFAULT 'snack',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition" ON public.nutrition_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can log nutrition" ON public.nutrition_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nutrition" ON public.nutrition_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nutrition" ON public.nutrition_entries FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- HABITS
-- ============================================
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'habit',
  frequency TEXT DEFAULT 'daily',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.habit_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions" ON public.habit_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid())
);
CREATE POLICY "Users can complete habits" ON public.habit_completions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid())
);
CREATE POLICY "Users can delete completions" ON public.habit_completions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid())
);

CREATE TABLE public.coach_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.coach_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view assigned tasks" ON public.coach_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.coaches WHERE coaches.id = coach_tasks.coach_id AND coaches.user_id = auth.uid())
);
CREATE POLICY "Coaches can create tasks" ON public.coach_tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.coaches WHERE coaches.id = coach_tasks.coach_id AND coaches.user_id = auth.uid())
);
CREATE POLICY "Users can update task status" ON public.coach_tasks FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can write journal" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update journal" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete journal" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.meditation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  duration_seconds INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meditation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meditations" ON public.meditation_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can log meditations" ON public.meditation_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET FOR PROGRESS PHOTOS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own progress photos" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own progress photos" ON storage.objects 
FOR SELECT USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own progress photos" ON storage.objects 
FOR DELETE USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);