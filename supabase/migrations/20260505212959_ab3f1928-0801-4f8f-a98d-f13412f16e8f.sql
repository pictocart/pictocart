
CREATE TABLE IF NOT EXISTS public.theme_master_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  files_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (theme_id, version)
);
CREATE INDEX IF NOT EXISTS idx_tmv_theme_created ON public.theme_master_versions (theme_id, created_at DESC);
ALTER TABLE public.theme_master_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage master versions" ON public.theme_master_versions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages master versions" ON public.theme_master_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.theme_master_metrics (
  theme_id text PRIMARY KEY,
  total_cost_inr numeric(10,4) NOT NULL DEFAULT 0,
  image_count integer NOT NULL DEFAULT 0,
  reuse_hits integer NOT NULL DEFAULT 0,
  shipped_to_pictocart boolean NOT NULL DEFAULT false,
  pictocart_response jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.theme_master_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read master metrics" ON public.theme_master_metrics FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages master metrics" ON public.theme_master_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.theme_release_calendar
  ADD COLUMN IF NOT EXISTS slot_date date,
  ADD COLUMN IF NOT EXISTS theme_brief jsonb DEFAULT '{}'::jsonb;
UPDATE public.theme_release_calendar SET slot_date = planned_for WHERE slot_date IS NULL;
UPDATE public.theme_release_calendar SET theme_brief = research_brief WHERE theme_brief = '{}'::jsonb AND research_brief IS NOT NULL;
