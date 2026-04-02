
-- Create coupon type enum
CREATE TYPE public.coupon_type AS ENUM ('percentage', 'flat');

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type coupon_type NOT NULL DEFAULT 'percentage',
  value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, code)
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their coupons
CREATE POLICY "Store owners can manage coupons"
  ON public.coupons FOR ALL
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = coupons.store_id AND stores.user_id = auth.uid()));

-- Anyone can read active coupons for published stores (for checkout validation)
CREATE POLICY "Active coupons in published stores are readable"
  ON public.coupons FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (SELECT 1 FROM stores WHERE stores.id = coupons.store_id AND stores.is_published = true)
  );
