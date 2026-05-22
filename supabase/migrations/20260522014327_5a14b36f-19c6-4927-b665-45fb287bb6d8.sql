
-- Status enums
DO $$ BEGIN
  CREATE TYPE public.commission_status AS ENUM ('accrued','invoiced','waived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.commission_invoice_status AS ENUM ('pending','paid','overdue','waived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Per-order commission accrual
CREATE TABLE IF NOT EXISTS public.order_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  gmv_amount numeric(12,2) NOT NULL,
  commission_rate numeric(5,2) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  plan text NOT NULL,
  status public.commission_status NOT NULL DEFAULT 'accrued',
  invoice_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_commissions_store_status ON public.order_commissions(store_id, status);
CREATE INDEX IF NOT EXISTS idx_order_commissions_invoice ON public.order_commissions(invoice_id);

ALTER TABLE public.order_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view own commissions"
ON public.order_commissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = order_commissions.store_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage all commissions"
ON public.order_commissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Monthly invoices
CREATE TABLE IF NOT EXISTS public.commission_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_gmv numeric(12,2) NOT NULL DEFAULT 0,
  total_commission numeric(12,2) NOT NULL DEFAULT 0,
  invoice_number text,
  status public.commission_invoice_status NOT NULL DEFAULT 'pending',
  due_date date NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  paid_at timestamptz,
  paid_via text, -- 'credits' | 'razorpay' | 'manual'
  pdf_url text,
  waive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_commission_invoices_store_status ON public.commission_invoices(store_id, status);

ALTER TABLE public.commission_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view own commission invoices"
ON public.commission_invoices FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = commission_invoices.store_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage all commission invoices"
ON public.commission_invoices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Link FK after both tables exist
ALTER TABLE public.order_commissions
  DROP CONSTRAINT IF EXISTS order_commissions_invoice_fk,
  ADD CONSTRAINT order_commissions_invoice_fk
    FOREIGN KEY (invoice_id) REFERENCES public.commission_invoices(id) ON DELETE SET NULL;

-- Updated-at triggers
DROP TRIGGER IF EXISTS trg_order_commissions_updated ON public.order_commissions;
CREATE TRIGGER trg_order_commissions_updated
BEFORE UPDATE ON public.order_commissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_commission_invoices_updated ON public.commission_invoices;
CREATE TRIGGER trg_commission_invoices_updated
BEFORE UPDATE ON public.commission_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-accrue commission when an order is paid; waive on cancel/refund
CREATE OR REPLACE FUNCTION public.accrue_order_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_name text;
  rate numeric;
  base numeric;
BEGIN
  -- Waive on cancel / refund
  IF (TG_OP = 'UPDATE') AND (NEW.payment_status IN ('refunded','failed') OR NEW.status = 'cancelled') THEN
    UPDATE public.order_commissions
       SET status = 'waived'
     WHERE order_id = NEW.id AND status = 'accrued';
    -- fall through; we may also need to accrue, but if refunded we skip insert below
    IF NEW.payment_status IN ('refunded','failed') OR NEW.status = 'cancelled' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Accrue once when payment becomes paid
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    -- Skip if already exists
    IF EXISTS (SELECT 1 FROM public.order_commissions WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT s.plan::text INTO plan_name
    FROM public.subscriptions s
    WHERE s.store_id = NEW.store_id
    LIMIT 1;
    IF plan_name IS NULL THEN plan_name := 'free'; END IF;

    SELECT commission_percent INTO rate
    FROM public.plan_configs
    WHERE plan = plan_name::subscription_plan;
    IF rate IS NULL THEN rate := 3; END IF;

    base := COALESCE(NEW.subtotal, 0);
    IF base <= 0 OR rate <= 0 THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.order_commissions(
      order_id, store_id, gmv_amount, commission_rate, commission_amount, plan
    ) VALUES (
      NEW.id, NEW.store_id, base, rate, ROUND(base * rate / 100.0, 2), plan_name
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_accrue_commission ON public.orders;
CREATE TRIGGER trg_orders_accrue_commission
AFTER INSERT OR UPDATE OF payment_status, status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.accrue_order_commission();

-- Auto-pay opt-in flag stored on stores.settings (no schema change needed),
-- but we also add a column on commission_invoices to record the chosen method per invoice (already added above).
