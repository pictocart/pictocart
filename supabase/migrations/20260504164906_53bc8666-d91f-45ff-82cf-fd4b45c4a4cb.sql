
-- ============ ENUMS ============
CREATE TYPE public.credit_txn_type AS ENUM ('debit', 'credit', 'bonus', 'refund', 'grant');
CREATE TYPE public.credit_promo_type AS ENUM ('code', 'sitewide', 'first_recharge', 'loyalty', 'referral');

-- ============ TABLES ============

-- Per-store wallet
CREATE TABLE public.ai_credit_wallets (
  store_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  lifetime_purchased integer NOT NULL DEFAULT 0,
  lifetime_used integer NOT NULL DEFAULT 0,
  lifetime_saved_inr numeric NOT NULL DEFAULT 0,
  lifetime_saved_minutes integer NOT NULL DEFAULT 0,
  low_balance_notified_at timestamptz,
  zero_balance_notified_at timestamptz,
  auto_recharge_enabled boolean NOT NULL DEFAULT false,
  auto_recharge_pack_id uuid,
  loyalty_tier text NOT NULL DEFAULT 'bronze',
  welcome_grant_given boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ledger
CREATE TABLE public.ai_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  type public.credit_txn_type NOT NULL,
  action_key text,
  credits integer NOT NULL,
  inr_value numeric NOT NULL DEFAULT 0,
  manual_cost_inr numeric NOT NULL DEFAULT 0,
  manual_minutes integer NOT NULL DEFAULT 0,
  razorpay_order_id text,
  razorpay_payment_id text,
  cache_hit boolean NOT NULL DEFAULT false,
  promo_code text,
  granted_by_admin uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_txns_store_created ON public.ai_credit_transactions(store_id, created_at DESC);

-- Admin-editable price book per AI action
CREATE TABLE public.ai_action_costs (
  action_key text PRIMARY KEY,
  label text NOT NULL,
  credits integer NOT NULL,
  cache_hit_credits integer NOT NULL DEFAULT 1,
  manual_cost_inr numeric NOT NULL DEFAULT 0,
  manual_minutes integer NOT NULL DEFAULT 0,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Razorpay top-up packs
CREATE TABLE public.ai_credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_inr integer NOT NULL,
  credits integer NOT NULL,
  bonus_pct integer NOT NULL DEFAULT 0,
  badge text,
  is_popular boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Promotions
CREATE TABLE public.credit_promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  type public.credit_promo_type NOT NULL,
  description text,
  bonus_pct integer NOT NULL DEFAULT 0,
  bonus_flat_credits integer NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  min_recharge_inr integer NOT NULL DEFAULT 0,
  eligible_pack_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL,
  store_id uuid NOT NULL,
  transaction_id uuid,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_promo_red_store ON public.credit_promo_redemptions(store_id);

-- Milestone grants
CREATE TABLE public.credit_milestones (
  key text PRIMARY KEY,
  label text NOT NULL,
  credits integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_milestone_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  milestone_key text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, milestone_key)
);

-- Smart cache
CREATE TABLE public.ai_response_cache (
  key text PRIMARY KEY,
  action_key text NOT NULL,
  response jsonb NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX idx_ai_cache_action ON public.ai_response_cache(action_key);

-- Global settings (single row)
CREATE TABLE public.platform_credit_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  base_cost_per_credit_inr numeric NOT NULL DEFAULT 0.03,
  margin_multiplier numeric NOT NULL DEFAULT 3.0,
  custom_recharge_rate numeric NOT NULL DEFAULT 10.0,
  low_balance_threshold integer NOT NULL DEFAULT 200,
  critical_balance_threshold integer NOT NULL DEFAULT 50,
  welcome_grant_credits integer NOT NULL DEFAULT 500,
  custom_min_inr integer NOT NULL DEFAULT 99,
  custom_max_inr integer NOT NULL DEFAULT 50000,
  freelancer_inr_per_hour integer NOT NULL DEFAULT 600,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- ============ RLS ============
ALTER TABLE public.ai_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_milestone_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_credit_settings ENABLE ROW LEVEL SECURITY;

-- Wallets
CREATE POLICY "Owners view own wallet" ON public.ai_credit_wallets FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = ai_credit_wallets.store_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins view all wallets" ON public.ai_credit_wallets FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners update own wallet prefs" ON public.ai_credit_wallets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = ai_credit_wallets.store_id AND s.user_id = auth.uid()));
CREATE POLICY "Service role manages wallets" ON public.ai_credit_wallets FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Transactions
CREATE POLICY "Owners view own txns" ON public.ai_credit_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = ai_credit_transactions.store_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins view all txns" ON public.ai_credit_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages txns" ON public.ai_credit_transactions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Action costs (read for everyone authed; write admin only)
CREATE POLICY "Authenticated read action costs" ON public.ai_action_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon read action costs" ON public.ai_action_costs FOR SELECT TO anon USING (true);
CREATE POLICY "Admins manage action costs" ON public.ai_action_costs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages action costs" ON public.ai_action_costs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Packs
CREATE POLICY "Anyone reads active packs" ON public.ai_credit_packs FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage packs" ON public.ai_credit_packs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages packs" ON public.ai_credit_packs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Promos
CREATE POLICY "Authenticated read active promos" ON public.credit_promos FOR SELECT TO authenticated
  USING (is_active = true);
CREATE POLICY "Admins manage promos" ON public.credit_promos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages promos" ON public.credit_promos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Promo redemptions
CREATE POLICY "Owners view own redemptions" ON public.credit_promo_redemptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = credit_promo_redemptions.store_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins view all redemptions" ON public.credit_promo_redemptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages redemptions" ON public.credit_promo_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Milestones
CREATE POLICY "Authenticated read milestones" ON public.credit_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage milestones" ON public.credit_milestones FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages milestones" ON public.credit_milestones FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Owners view own milestone grants" ON public.credit_milestone_grants FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = credit_milestone_grants.store_id AND s.user_id = auth.uid()));
CREATE POLICY "Service role manages milestone grants" ON public.credit_milestone_grants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- AI cache: service-only (sensitive)
CREATE POLICY "Service role manages cache" ON public.ai_response_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins read cache" ON public.ai_response_cache FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Settings
CREATE POLICY "Authenticated read settings" ON public.platform_credit_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon read settings" ON public.platform_credit_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Admins update settings" ON public.platform_credit_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages settings" ON public.platform_credit_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ TRIGGERS for updated_at ============
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.ai_credit_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_action_costs_updated BEFORE UPDATE ON public.ai_action_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_packs_updated BEFORE UPDATE ON public.ai_credit_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_promos_updated BEFORE UPDATE ON public.credit_promos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.platform_credit_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPER RPCs ============

-- Atomically debit credits for an AI action; returns new balance or -1 if insufficient
CREATE OR REPLACE FUNCTION public.consume_credits(
  _store_id uuid,
  _action_key text,
  _cache_hit boolean DEFAULT false
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cost_row public.ai_action_costs%ROWTYPE;
  to_charge integer;
  new_balance integer;
  inr_val numeric;
  settings_row public.platform_credit_settings%ROWTYPE;
BEGIN
  SELECT * INTO cost_row FROM public.ai_action_costs WHERE action_key = _action_key AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown action: %', _action_key;
  END IF;
  SELECT * INTO settings_row FROM public.platform_credit_settings WHERE id = 1;

  to_charge := CASE WHEN _cache_hit THEN cost_row.cache_hit_credits ELSE cost_row.credits END;
  inr_val := to_charge * settings_row.base_cost_per_credit_inr * settings_row.margin_multiplier;

  -- Ensure wallet exists
  INSERT INTO public.ai_credit_wallets(store_id) VALUES (_store_id)
    ON CONFLICT (store_id) DO NOTHING;

  -- Atomic decrement
  UPDATE public.ai_credit_wallets
  SET balance = balance - to_charge,
      lifetime_used = lifetime_used + to_charge,
      lifetime_saved_inr = lifetime_saved_inr + GREATEST(cost_row.manual_cost_inr - inr_val, 0),
      lifetime_saved_minutes = lifetime_saved_minutes + cost_row.manual_minutes,
      updated_at = now()
  WHERE store_id = _store_id AND balance >= to_charge
  RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RETURN -1;
  END IF;

  INSERT INTO public.ai_credit_transactions(
    store_id, type, action_key, credits, inr_value,
    manual_cost_inr, manual_minutes, cache_hit
  ) VALUES (
    _store_id, 'debit', _action_key, to_charge, inr_val,
    cost_row.manual_cost_inr, cost_row.manual_minutes, _cache_hit
  );

  RETURN new_balance;
END;
$$;

-- Credit a wallet (used by recharge verification, grants, bonuses)
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _store_id uuid,
  _credits integer,
  _type public.credit_txn_type,
  _inr_value numeric DEFAULT 0,
  _razorpay_order_id text DEFAULT NULL,
  _razorpay_payment_id text DEFAULT NULL,
  _promo_code text DEFAULT NULL,
  _granted_by_admin uuid DEFAULT NULL,
  _reason text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
  is_purchase boolean := _type IN ('credit', 'bonus');
BEGIN
  INSERT INTO public.ai_credit_wallets(store_id) VALUES (_store_id)
    ON CONFLICT (store_id) DO NOTHING;

  UPDATE public.ai_credit_wallets
  SET balance = balance + _credits,
      lifetime_purchased = lifetime_purchased + CASE WHEN is_purchase THEN _credits ELSE 0 END,
      low_balance_notified_at = NULL,
      zero_balance_notified_at = NULL,
      updated_at = now()
  WHERE store_id = _store_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.ai_credit_transactions(
    store_id, type, credits, inr_value,
    razorpay_order_id, razorpay_payment_id,
    promo_code, granted_by_admin, reason, metadata
  ) VALUES (
    _store_id, _type, _credits, _inr_value,
    _razorpay_order_id, _razorpay_payment_id,
    _promo_code, _granted_by_admin, _reason, _metadata
  );

  RETURN new_balance;
END;
$$;

-- ============ SEED DATA ============
INSERT INTO public.platform_credit_settings(id) VALUES (1);

INSERT INTO public.ai_credit_packs(name, price_inr, credits, bonus_pct, badge, is_popular, sort_order) VALUES
  ('Starter', 99, 1000, 0, NULL, false, 1),
  ('Growth', 499, 5500, 10, 'Most Popular', true, 2),
  ('Pro', 1499, 18000, 20, 'Best Value', false, 3),
  ('Scale', 4999, 65000, 30, NULL, false, 4);

INSERT INTO public.ai_action_costs(action_key, label, credits, cache_hit_credits, manual_cost_inr, manual_minutes, model) VALUES
  ('generate-product', 'Product description from image', 8, 1, 150, 15, 'google/gemini-2.5-flash'),
  ('generate-blog', 'Full blog post (AI-written)', 60, 5, 1200, 120, 'google/gemini-2.5-pro'),
  ('generate-blog-image', 'Blog cover or thumbnail image', 20, 2, 250, 30, 'google/gemini-3-flash-image-preview'),
  ('storefront-assistant', 'Storefront AI assistant reply', 2, 0, 50, 3, 'google/gemini-3-flash-preview'),
  ('generate-theme-pack', 'Premium theme pack generation', 250, 25, 5000, 480, 'google/gemini-2.5-pro'),
  ('generate-section-content', 'Storefront section content', 5, 1, 100, 10, 'google/gemini-2.5-flash'),
  ('generate-email-templates', 'Branded email template set', 30, 3, 600, 60, 'google/gemini-2.5-flash'),
  ('store-engagement', 'Store engagement report', 15, 2, 0, 0, 'google/gemini-2.5-flash');

INSERT INTO public.credit_milestones(key, label, credits) VALUES
  ('first_publish', 'Publish your first store', 500),
  ('first_5_products', 'Add your first 5 products', 200),
  ('first_blog', 'Publish your first blog post', 100),
  ('first_order', 'Receive your first order', 300);
