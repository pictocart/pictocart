
ALTER TABLE public.plan_configs
  ADD COLUMN IF NOT EXISTS signup_bonus_credits integer NOT NULL DEFAULT 0;

UPDATE public.plan_configs SET signup_bonus_credits = 100  WHERE plan = 'free';
UPDATE public.plan_configs SET signup_bonus_credits = 399  WHERE plan = 'starter';
UPDATE public.plan_configs SET signup_bonus_credits = 1499 WHERE plan = 'growth';
UPDATE public.plan_configs SET signup_bonus_credits = 6000 WHERE plan = 'scale';

-- Grant free signup bonus on every new store
CREATE OR REPLACE FUNCTION public.handle_new_store_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bonus integer;
BEGIN
  INSERT INTO public.subscriptions (store_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (store_id) DO NOTHING;

  SELECT signup_bonus_credits INTO bonus
  FROM public.plan_configs WHERE plan = 'free';

  IF COALESCE(bonus, 0) > 0 THEN
    PERFORM public.credit_wallet(
      NEW.id, bonus, 'bonus'::credit_txn_type,
      0, NULL, NULL, NULL, NULL,
      'Welcome bonus — Free plan',
      jsonb_build_object('source', 'signup_bonus', 'plan', 'free')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Helper to grant plan-upgrade bonus exactly once per plan code
CREATE OR REPLACE FUNCTION public.grant_plan_signup_bonus(_store_id uuid, _plan text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bonus integer;
  already integer;
  new_balance integer;
BEGIN
  IF _plan IS NULL OR _plan = 'free' THEN RETURN 0; END IF;

  SELECT signup_bonus_credits INTO bonus
  FROM public.plan_configs WHERE plan = _plan::subscription_plan;
  IF COALESCE(bonus, 0) <= 0 THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO already
  FROM public.ai_credit_transactions
  WHERE store_id = _store_id
    AND type = 'bonus'
    AND metadata->>'source' = 'signup_bonus'
    AND metadata->>'plan' = _plan;
  IF already > 0 THEN RETURN 0; END IF;

  new_balance := public.credit_wallet(
    _store_id, bonus, 'bonus'::credit_txn_type,
    0, NULL, NULL, NULL, NULL,
    'Welcome bonus — ' || _plan || ' plan',
    jsonb_build_object('source', 'signup_bonus', 'plan', _plan)
  );
  RETURN bonus;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_plan_signup_bonus(uuid, text) TO service_role;
