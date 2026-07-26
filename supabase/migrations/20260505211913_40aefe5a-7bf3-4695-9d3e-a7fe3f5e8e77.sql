-- Theme master pipeline tables (research, planning, settings, AI cost log)
CREATE TABLE IF NOT EXISTS public.theme_settings (
  id integer PRIMARY KEY DEFAULT 1,
  auto_research boolean NOT NULL DEFAULT false,
  auto_generate boolean NOT NULL DEFAULT false,
  cadence_days integer NOT NULL DEFAULT 7,
  themes_per_batch integer NOT NULL DEFAULT 4,
  research_query text NOT NULL DEFAULT 'best ecommerce theme inspiration 2026',
  last_research_at timestamptz,
  last_generation_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT theme_settings_singleton CHECK (id = 1)
);
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage theme settings" ON public.theme_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages theme settings" ON public.theme_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
INSERT INTO public.theme_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.research_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'queued',
  query text,
  total integer NOT NULL DEFAULT 0,
  completed integer NOT NULL DEFAULT 0,
  found_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_research_jobs_started ON public.research_jobs (started_at DESC);
ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read research jobs" ON public.research_jobs FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages research jobs" ON public.research_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TABLE IF NOT EXISTS public.theme_research_corpus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  source_site text NOT NULL,
  category text,
  insights jsonb NOT NULL DEFAULT '{}'::jsonb,
  palette jsonb,
  fonts jsonb,
  section_order jsonb,
  hero_style text,
  copy_motifs jsonb,
  reuse_count integer NOT NULL DEFAULT 0,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_corpus_category ON public.theme_research_corpus(category);
CREATE INDEX IF NOT EXISTS idx_corpus_scraped ON public.theme_research_corpus(scraped_at DESC);
ALTER TABLE public.theme_research_corpus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage research corpus" ON public.theme_research_corpus
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages research corpus" ON public.theme_research_corpus
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TABLE IF NOT EXISTS public.ai_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  model text NOT NULL,
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  cost_inr numeric NOT NULL DEFAULT 0,
  reuse_hit boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_log_fn ON public.ai_call_log(function_name, created_at DESC);
ALTER TABLE public.ai_call_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ai log" ON public.ai_call_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages ai log" ON public.ai_call_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);
