
-- Subscription lifecycle: grace period, blocking, upgrade/downgrade scheduling, GST pricing

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_warning_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_plan public.subscription_plan,
  ADD COLUMN IF NOT EXISTS pending_plan_effective_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON public.subscriptions (status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace
  ON public.subscriptions (is_blocked, grace_period_end);

-- GST percent column on plan_configs (default 18%)
ALTER TABLE public.plan_configs
  ADD COLUMN IF NOT EXISTS gst_percent NUMERIC NOT NULL DEFAULT 18;

-- RPC: is the store currently blocked (paid plan, grace ended)
CREATE OR REPLACE FUNCTION public.is_store_access_blocked(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT is_blocked AND plan::text <> 'free'
    FROM public.subscriptions WHERE store_id = _store_id
  ), false);
$$;

-- RPC: schedule a plan change. Upgrade is applied immediately by the edge function
-- (which creates a new Razorpay subscription); downgrade is stored as pending and
-- applied by the webhook at the end of the current billing period.
CREATE OR REPLACE FUNCTION public.schedule_plan_change(_store_id uuid, _new_plan text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_plan public.subscription_plan;
  cur_period_end TIMESTAMPTZ;
  cur_order INT; new_order INT;
  is_owner BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.stores WHERE id = _store_id AND user_id = auth.uid())
    INTO is_owner;
  IF NOT is_owner AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT plan, current_period_end INTO cur_plan, cur_period_end
    FROM public.subscriptions WHERE store_id = _store_id;
  IF cur_plan IS NULL THEN RAISE EXCEPTION 'No subscription'; END IF;

  SELECT sort_order INTO cur_order FROM public.plan_configs WHERE plan = cur_plan;
  SELECT sort_order INTO new_order FROM public.plan_configs WHERE plan = _new_plan::public.subscription_plan;
  IF new_order IS NULL THEN RAISE EXCEPTION 'Unknown plan'; END IF;

  IF new_order > cur_order THEN
    -- Upgrade: leave for edge function to create new Razorpay sub
    RETURN jsonb_build_object('action','upgrade');
  ELSIF new_order < cur_order THEN
    UPDATE public.subscriptions
       SET pending_plan = _new_plan::public.subscription_plan,
           pending_plan_effective_at = COALESCE(cur_period_end, now() + interval '30 days')
     WHERE store_id = _store_id;
    RETURN jsonb_build_object('action','downgrade_scheduled',
                              'effective_at', COALESCE(cur_period_end, now() + interval '30 days'));
  ELSE
    RAISE EXCEPTION 'Already on this plan';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_pending_plan_change(_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id = _store_id AND user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.subscriptions
     SET pending_plan = NULL, pending_plan_effective_at = NULL
   WHERE store_id = _store_id;
END;
$$;
