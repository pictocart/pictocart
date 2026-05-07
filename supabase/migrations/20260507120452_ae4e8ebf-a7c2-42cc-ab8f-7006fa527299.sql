
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS auto_apply boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bogo_buy_qty integer,
  ADD COLUMN IF NOT EXISTS bogo_get_qty integer,
  ADD COLUMN IF NOT EXISTS bogo_get_discount_pct integer,
  ADD COLUMN IF NOT EXISTS tiers jsonb,
  ADD COLUMN IF NOT EXISTS description text;

DO $$
BEGIN
  ALTER TYPE coupon_type ADD VALUE IF NOT EXISTS 'bogo';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE coupon_type ADD VALUE IF NOT EXISTS 'tiered';
EXCEPTION WHEN others THEN NULL;
END $$;
