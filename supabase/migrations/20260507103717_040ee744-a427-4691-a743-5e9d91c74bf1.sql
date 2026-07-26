-- COD rules per store
CREATE TABLE IF NOT EXISTS public.cod_rules (
  store_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  max_order_value numeric NOT NULL DEFAULT 5000,
  min_order_value numeric NOT NULL DEFAULT 0,
  require_phone_verification boolean NOT NULL DEFAULT false,
  min_prior_orders integer NOT NULL DEFAULT 0,
  pincode_allowlist text[] NOT NULL DEFAULT '{}',
  pincode_blocklist text[] NOT NULL DEFAULT '{}',
  blocked_phones text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cod_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners manage cod rules"
ON public.cod_rules FOR ALL
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = cod_rules.store_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = cod_rules.store_id AND s.user_id = auth.uid()));
CREATE POLICY "Anyone reads cod rules of published stores"
ON public.cod_rules FOR SELECT
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = cod_rules.store_id AND s.is_published = true));
CREATE POLICY "Service role manages cod rules"
ON public.cod_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cod_rules_updated
BEFORE UPDATE ON public.cod_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Low balance alert tracking
CREATE TABLE IF NOT EXISTS public.low_balance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  threshold_type text NOT NULL,  -- 'low' | 'critical' | 'zero'
  balance_at_alert integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_low_balance_alerts_store ON public.low_balance_alerts(store_id, sent_at DESC);
ALTER TABLE public.low_balance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners view own alerts"
ON public.low_balance_alerts FOR SELECT
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = low_balance_alerts.store_id AND s.user_id = auth.uid()));
CREATE POLICY "Service role manages alerts"
ON public.low_balance_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins view all alerts"
ON public.low_balance_alerts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));
