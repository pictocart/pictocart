
-- Add Razorpay tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS amount_refunded numeric(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_rzp_order_id ON public.orders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_rzp_payment_id ON public.orders(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- Idempotency log for Razorpay webhook events
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'razorpay',
  event_id text NOT NULL,
  event_type text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_store ON public.payment_events(store_id);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Only store owners can view payment events for their store
CREATE POLICY "Store owners view payment events"
  ON public.payment_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = payment_events.store_id AND s.user_id = auth.uid()));

-- Admins can view all
CREATE POLICY "Admins view all payment events"
  ON public.payment_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Refund records
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  razorpay_payment_id text NOT NULL,
  razorpay_refund_id text UNIQUE,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|processed|failed
  speed text NOT NULL DEFAULT 'normal',   -- normal|optimum
  reason text,
  notes jsonb DEFAULT '{}'::jsonb,
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_store ON public.refunds(store_id);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners view refunds"
  ON public.refunds FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = refunds.store_id AND s.user_id = auth.uid()));

CREATE POLICY "Customers view their refunds"
  ON public.refunds FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = refunds.order_id AND o.customer_user_id = auth.uid()));

CREATE POLICY "Admins view all refunds"
  ON public.refunds FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
