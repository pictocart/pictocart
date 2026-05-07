
-- ============ RETURNS / RMA ============
CREATE TABLE IF NOT EXISTS public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  store_id uuid NOT NULL,
  customer_user_id uuid,
  reason text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  refund_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'requested',
  seller_notes text,
  customer_notes text,
  refund_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers create own returns" ON public.returns
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = customer_user_id);

CREATE POLICY "Customers view own returns" ON public.returns
FOR SELECT USING (auth.uid() = customer_user_id);

CREATE POLICY "Store owners manage returns" ON public.returns
FOR ALL USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = returns.store_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = returns.store_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage returns" ON public.returns
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages returns" ON public.returns
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_returns_updated BEFORE UPDATE ON public.returns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_returns_store ON public.returns(store_id);
CREATE INDEX IF NOT EXISTS idx_returns_order ON public.returns(order_id);

-- ============ INVOICE COUNTERS ============
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  store_id uuid NOT NULL,
  fiscal_year text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  prefix text NOT NULL DEFAULT 'INV',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, fiscal_year)
);
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages invoice counters" ON public.invoice_counters
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Store owners read counters" ON public.invoice_counters
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = invoice_counters.store_id AND s.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.next_invoice_number(_store_id uuid, _prefix text DEFAULT 'INV')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fy text;
  next_num integer;
  m int := EXTRACT(MONTH FROM now())::int;
  y int := EXTRACT(YEAR FROM now())::int;
BEGIN
  IF m >= 4 THEN
    fy := y::text || '-' || lpad(((y+1) % 100)::text, 2, '0');
  ELSE
    fy := (y-1)::text || '-' || lpad((y % 100)::text, 2, '0');
  END IF;

  INSERT INTO public.invoice_counters(store_id, fiscal_year, last_number, prefix)
  VALUES (_store_id, fy, 1, _prefix)
  ON CONFLICT (store_id, fiscal_year)
  DO UPDATE SET last_number = invoice_counters.last_number + 1, updated_at = now()
  RETURNING last_number INTO next_num;

  RETURN _prefix || '/' || fy || '/' || lpad(next_num::text, 4, '0');
END;
$$;

-- Add invoice_number to orders if missing
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_provider text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_response jsonb DEFAULT '{}'::jsonb;

-- ============ REVIEWS MODERATION ============
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_reviews') THEN
    ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved';
    ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS moderated_at timestamptz;
    ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS moderated_by uuid;
    ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS moderation_notes text;
  END IF;
END $$;
