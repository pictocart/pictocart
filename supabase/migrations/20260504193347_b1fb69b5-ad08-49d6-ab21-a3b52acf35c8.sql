
-- 1. Inbound theme deliveries from the Master Bazaar agent
CREATE TABLE public.master_theme_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id uuid REFERENCES public.theme_master_projects(id) ON DELETE CASCADE,
  theme_pack_id uuid REFERENCES public.theme_packs(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  payload jsonb NOT NULL,
  preview_image text,
  generation_cost_inr numeric(10,4) DEFAULT 0,
  tokens_used int DEFAULT 0,
  reuse_ratio numeric(5,2) DEFAULT 0,
  reused_components int DEFAULT 0,
  reused_images int DEFAULT 0,
  source_research jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  delivered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.master_theme_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage deliveries" ON public.master_theme_deliveries
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages deliveries" ON public.master_theme_deliveries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Token-cost history (drives the declining-cost line graph)
CREATE TABLE public.theme_generation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_pack_id uuid REFERENCES public.theme_packs(id) ON DELETE CASCADE,
  delivery_id uuid REFERENCES public.master_theme_deliveries(id) ON DELETE SET NULL,
  category text,
  tokens_used int DEFAULT 0,
  cost_inr numeric(10,4) DEFAULT 0,
  reuse_ratio numeric(5,2) DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.theme_generation_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read metrics" ON public.theme_generation_metrics
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages metrics" ON public.theme_generation_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_theme_metrics_generated_at ON public.theme_generation_metrics(generated_at);

-- 3. Monthly release calendar
CREATE TABLE public.theme_release_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  archetype text,
  hero_style text,
  planned_for date NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  theme_pack_id uuid REFERENCES public.theme_packs(id) ON DELETE SET NULL,
  expected_cost_inr numeric(10,4) DEFAULT 0,
  research_brief jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.theme_release_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage calendar" ON public.theme_release_calendar
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages calendar" ON public.theme_release_calendar
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Admin <-> agent chat
CREATE TABLE public.agent_admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL CHECK (author IN ('admin','agent','system')),
  scoped_theme_id uuid REFERENCES public.theme_master_projects(id) ON DELETE SET NULL,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  intent text,
  cost_inr numeric(10,4) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_admin_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent messages" ON public.agent_admin_messages
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages agent messages" ON public.agent_admin_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_agent_messages_created_at ON public.agent_admin_messages(created_at);

-- 5. Extend theme_master_projects for richer Customise editor
ALTER TABLE public.theme_master_projects
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS customisable_slots jsonb DEFAULT '[]'::jsonb;

-- 6. Realtime for live agent chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_admin_messages;
