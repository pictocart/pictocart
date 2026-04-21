-- 1. Add state-machine columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS domain_state text,
  ADD COLUMN IF NOT EXISTS domain_strategy text,
  ADD COLUMN IF NOT EXISTS ns_provider text,
  ADD COLUMN IF NOT EXISTS ssl_validation_name text,
  ADD COLUMN IF NOT EXISTS ssl_validation_value text,
  ADD COLUMN IF NOT EXISTS state_entered_at timestamptz;

-- 2. Domain Connect sessions
CREATE TABLE IF NOT EXISTS public.domain_connect_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  domain text NOT NULL,
  registrar text,
  status text NOT NULL DEFAULT 'pending',
  callback_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dcs_store ON public.domain_connect_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_dcs_token ON public.domain_connect_sessions(callback_token);

ALTER TABLE public.domain_connect_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all domain connect sessions"
  ON public.domain_connect_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store owners view own sessions"
  ON public.domain_connect_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));

CREATE POLICY "Store owners create sessions"
  ON public.domain_connect_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));

CREATE POLICY "Service role manages sessions"
  ON public.domain_connect_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);