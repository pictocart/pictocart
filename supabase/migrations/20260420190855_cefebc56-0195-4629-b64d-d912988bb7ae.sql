-- 1. Add columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_failures int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downtime_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS downtime_notified_at timestamptz;
-- 2. domain_health_log
CREATE TABLE IF NOT EXISTS public.domain_health_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  domain text NOT NULL,
  status text NOT NULL,            -- up | down | degraded
  http_code int,
  ssl_valid boolean,
  response_ms int,
  error_message text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_domain_health_log_store_time ON public.domain_health_log(store_id, checked_at DESC);
ALTER TABLE public.domain_health_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view health log"
  ON public.domain_health_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages health log"
  ON public.domain_health_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);
-- 3. admin_settings (single row enforced by unique key)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id int PRIMARY KEY DEFAULT 1,
  session_timeout_minutes int NOT NULL DEFAULT 480,
  alert_email text,
  auto_heal_enabled boolean NOT NULL DEFAULT true,
  downtime_threshold_minutes int NOT NULL DEFAULT 10,
  notify_merchants boolean NOT NULL DEFAULT true,
  notify_customers boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO public.admin_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read settings"
  ON public.admin_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update settings"
  ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages settings"
  ON public.admin_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);
-- 4. agent_incidents (timeline feed)
CREATE TABLE IF NOT EXISTS public.agent_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  domain text,
  action text NOT NULL,           -- reprovisioned | ssl_retried | downtime_alert | recovered | escalated
  severity text NOT NULL DEFAULT 'info', -- info | warning | error
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_incidents_created ON public.agent_incidents(created_at DESC);
ALTER TABLE public.agent_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view incidents"
  ON public.agent_incidents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages incidents"
  ON public.agent_incidents FOR ALL TO service_role
  USING (true) WITH CHECK (true);
-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.domain_health_log;
-- 6. Enable pg_cron + pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
