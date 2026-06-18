
ALTER TABLE public.plan_configs
  ADD COLUMN IF NOT EXISTS annual_price_inr numeric NOT NULL DEFAULT 0;

UPDATE public.plan_configs SET annual_price_inr = 5500  WHERE plan = 'starter';
UPDATE public.plan_configs SET annual_price_inr = 16500 WHERE plan = 'growth';
UPDATE public.plan_configs SET annual_price_inr = 55000 WHERE plan = 'scale';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS last_renewal_reminder_at timestamptz;

CREATE OR REPLACE FUNCTION public.transfer_store_to_client(
  _store_id uuid,
  _client_user_id uuid,
  _handover_id uuid,
  _plan text DEFAULT NULL,
  _billing_cycle text DEFAULT 'annual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_id uuid;
  v_plan text;
  v_period_end timestamptz;
BEGIN
  SELECT partner_id, COALESCE(_plan, plan)
    INTO v_partner_id, v_plan
  FROM public.store_handovers WHERE id = _handover_id;
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Handover not found';
  END IF;

  v_period_end := CASE WHEN _billing_cycle = 'annual'
                       THEN now() + interval '365 days'
                       ELSE now() + interval '30 days' END;

  UPDATE public.stores
     SET user_id = _client_user_id,
         partner_handover_status = 'accepted'
   WHERE id = _store_id
     AND owned_by_partner_id = v_partner_id;

  INSERT INTO public.subscriptions(store_id, plan, status, billing_cycle, current_period_start, current_period_end, is_blocked)
  VALUES (_store_id, v_plan::subscription_plan, 'active', _billing_cycle, now(), v_period_end, false)
  ON CONFLICT (store_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = 'active',
        billing_cycle = EXCLUDED.billing_cycle,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        is_blocked = false,
        cancelled_at = NULL,
        pending_plan = NULL,
        pending_plan_effective_at = NULL,
        expiry_notified_at = NULL,
        blocked_notified_at = NULL,
        last_renewal_reminder_at = NULL,
        updated_at = now();

  UPDATE public.store_handovers
     SET status = 'accepted',
         accepted_at = now(),
         paid_at = COALESCE(paid_at, now())
   WHERE id = _handover_id;
END;
$$;
