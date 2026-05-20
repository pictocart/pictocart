
-- 1. is_premium flag on master themes
ALTER TABLE public.theme_master_projects
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- 2. intents table
CREATE TABLE IF NOT EXISTS public.theme_purchase_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  theme_kind text NOT NULL CHECK (theme_kind IN ('pack','master')),
  theme_ref text NOT NULL,
  amount_inr numeric NOT NULL,
  discount_inr numeric NOT NULL DEFAULT 0,
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS theme_purchase_intents_store_idx ON public.theme_purchase_intents(store_id);

ALTER TABLE public.theme_purchase_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own intents" ON public.theme_purchase_intents;
CREATE POLICY "Owners can view own intents" ON public.theme_purchase_intents
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));

-- 3. Lock theme_purchases: remove client INSERT
DROP POLICY IF EXISTS "Store owners can purchase" ON public.theme_purchases;
