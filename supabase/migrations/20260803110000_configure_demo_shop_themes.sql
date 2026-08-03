-- Migration: Automatically configure themes for demo stores based on category
CREATE OR REPLACE FUNCTION public.configure_demo_shop(_shop_email TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_store_id UUID;
  v_category TEXT;
  v_theme JSONB;
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

  -- Get category of this demo shop from partner_demo_shops
  SELECT category INTO v_category 
  FROM public.partner_demo_shops 
  WHERE LOWER(shop_id) = LOWER(_shop_email) 
  LIMIT 1;

  -- Determine theme based on category:
  -- Restaurant/Food/Grocery/Cafe -> Vibrant Gourmet (theme-70904877)
  -- Others -> Style Up (theme-styleup)
  IF LOWER(COALESCE(v_category, '')) IN ('restaurant', 'food', 'grocery', 'cafe', 'bakery') THEN
    v_theme := '{"theme_id": "theme-70904877", "name": "Vibrant Gourmet", "primary_color": "#EA580C"}'::jsonb;
  ELSE
    v_theme := '{"theme_id": "theme-styleup", "name": "Style Up - Fashion and Clothing", "primary_color": "#F97316"}'::jsonb;
  END IF;

  -- Update store's theme
  UPDATE public.stores
  SET theme = v_theme
  WHERE id = v_store_id;

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

-- Re-configure all existing demo shops to update their themes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT shop_id FROM public.partner_demo_shops LOOP
    PERFORM public.configure_demo_shop(r.shop_id);
  END LOOP;
END $$;
