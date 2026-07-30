-- Migration: Configure Demo Shops (Active Growth Plan + Auto-Refilling 99,999 Credits)

-- 1. Create helper function to configure a demo shop (plan & initial credits)
CREATE OR REPLACE FUNCTION public.configure_demo_shop(_shop_email TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_store_id UUID;
BEGIN
  -- Find the user_id for this email
  SELECT id INTO v_user_id FROM auth.users WHERE email = _shop_email;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Find the store_id for this user
  SELECT id INTO v_store_id FROM public.stores WHERE user_id = v_user_id;
  IF v_store_id IS NULL THEN
    RETURN;
  END IF;

  -- Ensure the Growth Plan is active (upsert into subscriptions)
  INSERT INTO public.subscriptions (store_id, plan, status, current_period_end)
  VALUES (v_store_id, 'growth'::public.subscription_plan, 'active'::public.subscription_status, now() + INTERVAL '100 years')
  ON CONFLICT (store_id) 
  DO UPDATE SET plan = 'growth'::public.subscription_plan, status = 'active'::public.subscription_status, current_period_end = now() + INTERVAL '100 years';

  -- Ensure the wallet has 99,999 credits (upsert into ai_credit_wallets)
  INSERT INTO public.ai_credit_wallets (store_id, balance)
  VALUES (v_store_id, 99999)
  ON CONFLICT (store_id)
  DO UPDATE SET balance = 99999;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger function on public.ai_credit_wallets to automatically refill demo wallets
CREATE OR REPLACE FUNCTION public.trg_refill_demo_wallet()
RETURNS TRIGGER AS $$
DECLARE
  v_is_demo BOOLEAN;
BEGIN
  -- Check if this store belongs to a demo shop in partner_demo_shops
  SELECT EXISTS (
    SELECT 1 
    FROM public.partner_demo_shops pds
    JOIN public.stores s ON s.user_id IN (
      SELECT id FROM auth.users WHERE email = pds.shop_id
    )
    WHERE s.id = NEW.store_id
  ) INTO v_is_demo;

  IF v_is_demo THEN
    -- If it's a demo shop and balance goes to or below 5000, refill to 99999
    IF NEW.balance <= 5000 THEN
      NEW.balance := 99999;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to public.ai_credit_wallets
DROP TRIGGER IF EXISTS trg_refill_demo_wallet_before ON public.ai_credit_wallets;
CREATE TRIGGER trg_refill_demo_wallet_before
  BEFORE INSERT OR UPDATE ON public.ai_credit_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_refill_demo_wallet();

-- 4. Create trigger function on partner_demo_shops to configure when a demo shop is added/updated
CREATE OR REPLACE FUNCTION public.trg_on_demo_shop_added()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.configure_demo_shop(NEW.shop_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach trigger to partner_demo_shops
DROP TRIGGER IF EXISTS trg_partner_demo_shop_added ON public.partner_demo_shops;
CREATE TRIGGER trg_partner_demo_shop_added
  AFTER INSERT OR UPDATE ON public.partner_demo_shops
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_on_demo_shop_added();

-- 6. Create trigger function on stores to configure when a store is created if the owner is registered as a demo shop
CREATE OR REPLACE FUNCTION public.trg_on_store_created_check_demo()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  IF EXISTS (SELECT 1 FROM public.partner_demo_shops WHERE shop_id = v_email) THEN
    PERFORM public.configure_demo_shop(v_email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Attach trigger to stores
DROP TRIGGER IF EXISTS trg_store_created_check_demo ON public.stores;
CREATE TRIGGER trg_store_created_check_demo
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_on_store_created_check_demo();

-- 8. Run configuration for all existing demo shops
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT shop_id FROM public.partner_demo_shops LOOP
    PERFORM public.configure_demo_shop(r.shop_id);
  END LOOP;
END $$;
