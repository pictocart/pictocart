CREATE TABLE IF NOT EXISTS public.tour_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  skipped boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, tour_key)
);
ALTER TABLE public.tour_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tour_progress_select_own" ON public.tour_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tour_progress_insert_own" ON public.tour_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tour_progress_update_own" ON public.tour_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tour_progress_delete_own" ON public.tour_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);