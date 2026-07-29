-- Migration: Partner system enhancements

-- 1. Alter partners table to add custom partner ID and verification columns
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS partner_id_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verification_otp TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

-- 2. Alter partner_licenses table to add license type and key columns
ALTER TABLE public.partner_licenses
  ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT 'basic' CHECK (license_type IN ('basic', 'premium')),
  ADD COLUMN IF NOT EXISTS license_key TEXT UNIQUE;

-- 3. Create partner_demo_shops table
CREATE TABLE IF NOT EXISTS public.partner_demo_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  password TEXT NOT NULL,
  direct_access_url TEXT,
  extra_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_demo_shops TO authenticated;
GRANT ALL ON public.partner_demo_shops TO service_role;
ALTER TABLE public.partner_demo_shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage demo shops" ON public.partner_demo_shops
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated read demo shops" ON public.partner_demo_shops
  FOR SELECT TO authenticated
  USING (true);

-- 4. Create partner_wallet table (without explicit FK constraint)
CREATE TABLE IF NOT EXISTS public.partner_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_wallet TO authenticated;
GRANT ALL ON public.partner_wallet TO service_role;
ALTER TABLE public.partner_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners read own wallet" ON public.partner_wallet
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "admin manage wallets" ON public.partner_wallet
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Create partner_wallet_transaction table (without explicit FK constraint)
CREATE TABLE IF NOT EXISTS public.partner_wallet_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  credits INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_wallet_transaction TO authenticated;
GRANT ALL ON public.partner_wallet_transaction TO service_role;
ALTER TABLE public.partner_wallet_transaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners read own wallet transactions" ON public.partner_wallet_transaction
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "admin manage wallet transactions" ON public.partner_wallet_transaction
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Create partner_one_time_codes table (without explicit FK constraint)
CREATE TABLE IF NOT EXISTS public.partner_one_time_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by_partner_id UUID,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.partner_one_time_codes TO authenticated;
GRANT ALL ON public.partner_one_time_codes TO service_role;
ALTER TABLE public.partner_one_time_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage one time codes" ON public.partner_one_time_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "partners read used one time codes" ON public.partner_one_time_codes
  FOR SELECT TO authenticated
  USING (used_by_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- 7. Trigger: automatically initialize wallet on partner creation
CREATE OR REPLACE FUNCTION public.init_partner_wallet_on_create()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.partner_wallet (partner_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (partner_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_init_partner_wallet
  AFTER INSERT ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.init_partner_wallet_on_create();

-- 8. RPC: allocate_partner_licenses
CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(_partner_id UUID, _qty_basic INT, _qty_premium INT)
RETURNS void AS $$
DECLARE
  p_code TEXT;
  i INT;
  l_key TEXT;
  random_part TEXT;
BEGIN
  -- Get partner code
  SELECT partner_id_code INTO p_code FROM public.partners WHERE id = _partner_id;
  IF p_code IS NULL OR p_code = '' THEN
    p_code := 'pcc' || substring(md5(random()::text) from 1 for 4);
  END IF;

  -- Insert basic licenses
  FOR i IN 1.._qty_basic LOOP
    LOOP
      random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
      l_key := p_code || '-BASE-' || random_part;
      BEGIN
        INSERT INTO public.partner_licenses (partner_id, status, license_type, license_key)
        VALUES (_partner_id, 'available', 'basic', l_key);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Loop and try again
      END;
    END LOOP;
  END LOOP;

  -- Insert premium licenses
  FOR i IN 1.._qty_premium LOOP
    LOOP
      random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
      l_key := p_code || '-PREM-' || random_part;
      BEGIN
        INSERT INTO public.partner_licenses (partner_id, status, license_type, license_key)
        VALUES (_partner_id, 'available', 'premium', l_key);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Loop and try again
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: redeem_partner_one_time_code
CREATE OR REPLACE FUNCTION public.redeem_partner_one_time_code(_partner_id UUID, _code TEXT)
RETURNS integer AS $$
DECLARE
  c_credits INT;
  c_id UUID;
  is_used_already BOOLEAN;
BEGIN
  SELECT id, credits, is_used INTO c_id, c_credits, is_used_already
  FROM public.partner_one_time_codes
  WHERE code = _code;

  IF c_id IS NULL THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;

  IF is_used_already THEN
    RAISE EXCEPTION 'Code already used';
  END IF;

  -- Mark code as used
  UPDATE public.partner_one_time_codes
  SET is_used = true,
      used_by_partner_id = _partner_id,
      used_at = now()
  WHERE id = c_id;

  -- Credit partner wallet
  UPDATE public.partner_wallet
  SET balance = balance + c_credits,
      updated_at = now()
  WHERE partner_id = _partner_id;

  -- Record transaction
  INSERT INTO public.partner_wallet_transaction (partner_id, type, credits, reason)
  VALUES (_partner_id, 'credit', c_credits, 'Redeemed one time code: ' || _code);

  RETURN c_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: apply_partner_license_key
CREATE OR REPLACE FUNCTION public.apply_partner_license_key(_store_id UUID, _key TEXT)
RETURNS void AS $$
DECLARE
  lic_id UUID;
  lic_partner_id UUID;
  lic_type TEXT;
  lic_status TEXT;
  p_ref_code TEXT;
  target_plan TEXT;
BEGIN
  -- Lookup license details
  SELECT id, partner_id, license_type, status INTO lic_id, lic_partner_id, lic_type, lic_status
  FROM public.partner_licenses
  WHERE license_key = _key;

  IF lic_id IS NULL THEN
    RAISE EXCEPTION 'Invalid license key';
  END IF;

  IF lic_status <> 'available' THEN
    RAISE EXCEPTION 'License is already consumed or revoked';
  END IF;

  -- Get partner's referral code
  SELECT referral_code INTO p_ref_code FROM public.partners WHERE id = lic_partner_id;

  -- Update license status to consumed
  UPDATE public.partner_licenses
  SET status = 'consumed',
      consumed_by_store_id = _store_id,
      consumed_at = now()
  WHERE id = lic_id;

  -- Determine target plan based on license type
  IF lic_type = 'premium' THEN
    target_plan := 'growth';
  ELSE
    target_plan := 'starter';
  END IF;

  -- Update store plan and link partner
  UPDATE public.stores
  SET owned_by_partner_id = lic_partner_id,
      referred_by_code = p_ref_code,
      is_partner_build = true
  WHERE id = _store_id;

  INSERT INTO public.subscriptions (store_id, plan, status)
  VALUES (_store_id, target_plan::public.subscription_plan, 'active')
  ON CONFLICT (store_id) DO UPDATE
  SET plan = target_plan::public.subscription_plan,
      status = 'active';

  -- Connect referral records if not exists
  INSERT INTO public.partner_referrals (partner_id, store_id, status)
  VALUES (lic_partner_id, _store_id, 'paid')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: reward_partner_theme_usage
CREATE OR REPLACE FUNCTION public.reward_partner_theme_usage(_theme_id TEXT, _store_id UUID)
RETURNS void AS $$
DECLARE
  theme_creator_user_id UUID;
  p_id UUID;
  p_name TEXT;
  s_name TEXT;
  reward_credits INT := 500; -- credit amount rewarded to partner
BEGIN
  -- Check if theme was created by a partner user
  SELECT created_by INTO theme_creator_user_id
  FROM public.theme_master_projects
  WHERE theme_id = _theme_id;

  IF theme_creator_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Find partner matching this user_id
  SELECT id, name INTO p_id, p_name
  FROM public.partners
  WHERE user_id = theme_creator_user_id;

  IF p_id IS NULL THEN
    RETURN;
  END IF;

  -- Get store name
  SELECT name INTO s_name
  FROM public.stores
  WHERE id = _store_id;

  -- Credit partner wallet
  UPDATE public.partner_wallet
  SET balance = balance + reward_credits,
      updated_at = now()
  WHERE partner_id = p_id;

  -- Record transaction
  INSERT INTO public.partner_wallet_transaction (partner_id, type, credits, reason)
  VALUES (p_id, 'credit', reward_credits, 'Custom theme (' || _theme_id || ') applied by store: ' || COALESCE(s_name, _store_id::text));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
