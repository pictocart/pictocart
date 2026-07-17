-- =============================================
-- STEP 2: FUNCTIONS
-- Paste this in NEW Supabase SQL Editor
-- Run AFTER 01_schema.sql
-- NOTE: Replace YOUR_NEW_PROJECT_REF below with
--       your new Supabase project reference ID
-- =============================================

CREATE OR REPLACE FUNCTION public.accrue_appointment_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  pct numeric;
  base numeric;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.provider_id IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.provider_commissions WHERE appointment_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    SELECT COALESCE(commission_pct, 0) INTO pct FROM public.service_providers WHERE id = NEW.provider_id;
    IF pct IS NULL OR pct <= 0 THEN RETURN NEW; END IF;
    base := COALESCE(NEW.price, 0);
    INSERT INTO public.provider_commissions(store_id, provider_id, appointment_id, base_amount, commission_pct, amount)
    VALUES (NEW.store_id, NEW.provider_id, NEW.id, base, pct, ROUND(base * pct / 100.0, 2));
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accrue_hierarchy_commissions(_partner_id uuid, _base_amount numeric, _source_kind text, _source_ref text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  parent_id uuid;
  grand_id uuid;
  parent_tier public.partner_tier;
  grand_tier public.partner_tier;
  parent_pct numeric(5,2);
  grand_pct numeric(5,2);
  pm date := date_trunc('month', now())::date;
BEGIN
  IF _partner_id IS NULL OR COALESCE(_base_amount,0) <= 0 THEN RETURN; END IF;

  SELECT parent_partner_id INTO parent_id FROM public.partners WHERE id = _partner_id;
  IF parent_id IS NULL THEN RETURN; END IF;

  SELECT tier, override_commission_pct INTO parent_tier, parent_pct
    FROM public.partners WHERE id = parent_id;

  IF COALESCE(parent_pct,0) > 0 THEN
    INSERT INTO public.partner_commissions(
      partner_id, period_month, base_amount, commission_amount, status,
      commission_type, source_partner_id, source_kind, source_ref, commission_rate
    ) VALUES (
      parent_id, pm, _base_amount,
      ROUND(_base_amount * parent_pct / 100.0, 2),
      'pending',
      CASE WHEN parent_tier = 'regional_head' THEN 'override_regional' ELSE 'override_state' END,
      _partner_id, _source_kind, _source_ref, parent_pct
    );
  END IF;

  SELECT parent_partner_id INTO grand_id FROM public.partners WHERE id = parent_id;
  IF grand_id IS NULL THEN RETURN; END IF;

  SELECT tier, override_commission_pct INTO grand_tier, grand_pct
    FROM public.partners WHERE id = grand_id;

  IF COALESCE(grand_pct,0) > 0 THEN
    INSERT INTO public.partner_commissions(
      partner_id, period_month, base_amount, commission_amount, status,
      commission_type, source_partner_id, source_kind, source_ref, commission_rate
    ) VALUES (
      grand_id, pm, _base_amount,
      ROUND(_base_amount * grand_pct / 100.0, 2),
      'pending',
      CASE WHEN grand_tier = 'regional_head' THEN 'override_regional' ELSE 'override_state' END,
      _partner_id, _source_kind, _source_ref, grand_pct
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accrue_order_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  plan_name text;
  rate numeric;
  base numeric;
BEGIN
  IF (TG_OP = 'UPDATE') AND (NEW.payment_status IN ('refunded','failed') OR NEW.status = 'cancelled') THEN
    UPDATE public.order_commissions
       SET status = 'waived'
     WHERE order_id = NEW.id AND status = 'accrued';
    IF NEW.payment_status IN ('refunded','failed') OR NEW.status = 'cancelled' THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    IF EXISTS (SELECT 1 FROM public.order_commissions WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT s.plan::text INTO plan_name
    FROM public.subscriptions s
    WHERE s.store_id = NEW.store_id
    LIMIT 1;
    IF plan_name IS NULL THEN plan_name := 'free'; END IF;

    SELECT commission_percent INTO rate
    FROM public.plan_configs
    WHERE plan = plan_name::subscription_plan;
    IF rate IS NULL THEN rate := 3; END IF;

    base := COALESCE(NEW.subtotal, 0);
    IF base <= 0 OR rate <= 0 THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.order_commissions(
      order_id, store_id, gmv_amount, commission_rate, commission_amount, plan
    ) VALUES (
      NEW.id, NEW.store_id, base, rate, ROUND(base * rate / 100.0, 2), plan_name
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_assign_partner_parent(_partner_id uuid, _parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.partners SET parent_partner_id = _parent_id WHERE id = _partner_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(_payout_id uuid, _utr text DEFAULT NULL::text, _method text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.partner_payouts
     SET status = 'paid',
         paid_at = now(),
         utr = COALESCE(_utr, utr),
         method = COALESCE(_method, method)
   WHERE id = _payout_id;

  UPDATE public.partner_commissions
     SET status = 'paid'
   WHERE payout_id = _payout_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_pending_payouts_summary(_period_month date DEFAULT NULL::date)
RETURNS TABLE(partner_id uuid, partner_name text, partner_email text, upi_id text, bank_account_number text, bank_ifsc text, bank_account_holder text, pan text, tier partner_tier, commission_count integer, pending_amount numeric, direct_amount numeric, override_amount numeric)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT
    p.id, p.name, p.email, p.upi_id, p.bank_account_number, p.bank_ifsc,
    p.bank_account_holder, p.pan, p.tier,
    COUNT(pc.id)::int,
    COALESCE(SUM(pc.commission_amount), 0),
    COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.commission_type = 'direct'), 0),
    COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.commission_type <> 'direct'), 0)
  FROM public.partners p
  JOIN public.partner_commissions pc ON pc.partner_id = p.id
  WHERE pc.status IN ('pending','approved')
    AND pc.payout_id IS NULL
    AND (_period_month IS NULL OR pc.period_month <= _period_month)
    AND public.has_role(auth.uid(),'admin')
  GROUP BY p.id, p.name, p.email, p.upi_id, p.bank_account_number, p.bank_ifsc,
           p.bank_account_holder, p.pan, p.tier
  HAVING COALESCE(SUM(pc.commission_amount), 0) > 0
  ORDER BY COALESCE(SUM(pc.commission_amount), 0) DESC;
$function$;

CREATE OR REPLACE FUNCTION public.admin_promote_partner(_partner_id uuid, _tier text, _override_pct numeric, _region_name text DEFAULT NULL::text, _state_name text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.partners
     SET tier = _tier::public.partner_tier,
         override_commission_pct = COALESCE(_override_pct, 0),
         region_name = COALESCE(_region_name, region_name),
         state_name = COALESCE(_state_name, state_name)
   WHERE id = _partner_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_run_payout_batch(_period_month date, _method text DEFAULT 'upi'::text)
RETURNS TABLE(payouts_created integer, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  r record;
  payout_id uuid;
  v_count int := 0;
  v_total numeric := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR r IN
    SELECT pc.partner_id, SUM(pc.commission_amount)::numeric AS amt, COUNT(*)::int AS cnt
    FROM public.partner_commissions pc
    WHERE pc.status IN ('pending','approved')
      AND pc.payout_id IS NULL
      AND pc.period_month <= _period_month
    GROUP BY pc.partner_id
    HAVING SUM(pc.commission_amount) > 0
  LOOP
    INSERT INTO public.partner_payouts(
      partner_id, amount, period, period_month, method, status, commission_count, notes
    ) VALUES (
      r.partner_id, r.amt, to_char(_period_month,'YYYY-MM'),
      _period_month, _method, 'initiated', r.cnt,
      'Auto-batch for ' || to_char(_period_month,'YYYY-MM')
    )
    RETURNING id INTO payout_id;

    UPDATE public.partner_commissions
       SET payout_id = payout_id, status = 'approved'
     WHERE partner_id = r.partner_id
       AND status IN ('pending','approved')
       AND payout_id IS NULL
       AND period_month <= _period_month;

    v_count := v_count + 1;
    v_total := v_total + r.amt;
  END LOOP;

  payouts_created := v_count;
  total_amount := v_total;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_coupon_to_recent_order(_coupon_id uuid, _order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  coupon_store uuid;
  order_store uuid;
  order_age interval;
BEGIN
  SELECT store_id INTO coupon_store FROM public.coupons WHERE id = _coupon_id;
  IF coupon_store IS NULL THEN RETURN; END IF;

  SELECT store_id, (now() - created_at) INTO order_store, order_age
    FROM public.orders WHERE id = _order_id;
  IF order_store IS NULL OR order_store <> coupon_store THEN
    RAISE EXCEPTION 'coupon/order mismatch';
  END IF;
  IF order_age > interval '15 minutes' THEN
    RAISE EXCEPTION 'order too old to apply coupon';
  END IF;

  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = _coupon_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bump_ticket_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.support_tickets
    SET last_message_at = now(), updated_at = now()
    WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_pending_plan_change(_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id = _store_id AND user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.subscriptions
     SET pending_plan = NULL, pending_plan_effective_at = NULL
   WHERE store_id = _store_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_credits(_store_id uuid, _action_key text, _cache_hit boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  INSERT INTO public.ai_credit_wallets(store_id) VALUES (_store_id)
    ON CONFLICT (store_id) DO NOTHING;

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
$function$;

CREATE OR REPLACE FUNCTION public.consume_partner_license(_partner_id uuid, _store_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  lic_id uuid;
  is_owner boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.partners WHERE id = _partner_id AND user_id = auth.uid())
    INTO is_owner;
  IF NOT is_owner AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.partner_licenses
     SET status='consumed',
         consumed_by_store_id = _store_id,
         consumed_at = now()
   WHERE id = (
     SELECT id FROM public.partner_licenses
      WHERE partner_id = _partner_id AND status='available'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
   RETURNING id INTO lic_id;

  IF lic_id IS NULL THEN
    RAISE EXCEPTION 'No available licenses';
  END IF;
  RETURN lic_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.credit_wallet(_store_id uuid, _credits integer, _type credit_txn_type, _inr_value numeric DEFAULT 0, _razorpay_order_id text DEFAULT NULL::text, _razorpay_payment_id text DEFAULT NULL::text, _promo_code text DEFAULT NULL::text, _granted_by_admin uuid DEFAULT NULL::uuid, _reason text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  item jsonb;
  qty int;
  pid uuid;
BEGIN
  FOR item IN SELECT jsonb_array_elements(NEW.items) LOOP
    pid := NULLIF(item->>'product_id','')::uuid;
    qty := COALESCE((item->>'quantity')::int, 1);
    IF pid IS NOT NULL THEN
      UPDATE public.products
        SET inventory_count = GREATEST(inventory_count - qty, 0)
        WHERE id = pid;
      INSERT INTO public.inventory_movements(store_id, product_id, movement_type, qty, reference_table, reference_id, notes)
      VALUES (NEW.store_id, pid, 'sale', -qty, 'orders', NEW.id, NEW.order_number);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

-- ⚠️  IMPORTANT: Replace YOUR_NEW_PROJECT_REF with your new Supabase project ref
-- e.g. https://abcdefghijklmn.supabase.co
CREATE OR REPLACE FUNCTION public.email_queue_dispatch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.q_auth_emails)
     AND NOT EXISTS (SELECT 1 FROM pgmq.q_transactional_emails) THEN
    BEGIN
      PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000001);
      IF EXISTS (SELECT 1 FROM pgmq.q_auth_emails)
         OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails) THEN
        RETURN;
      END IF;
      PERFORM cron.unschedule('process-email-queue');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'email_queue_dispatch: cron unschedule failed: %', SQLERRM;
    END;
    RETURN;
  END IF;

  IF (SELECT retry_after_until FROM public.email_send_state WHERE id = 1) > now() THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://wuqznkpaldtvpfpdtllp.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
END;
$function$;

-- ⚠️  IMPORTANT: Replace YOUR_NEW_PROJECT_REF here too
CREATE OR REPLACE FUNCTION public.email_queue_wake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000001);
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
    BEGIN
      PERFORM cron.schedule('process-email-queue', '5 seconds', $cron$ SELECT public.email_queue_dispatch(); $cron$);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'email_queue_wake: cron schedule failed: %', SQLERRM;
    END;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://wuqznkpaldtvpfpdtllp.supabase.co/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Lovable-Context', 'cron',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'email_queue_wake failed (enqueue preserved): %', SQLERRM;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_dine_in_enabled_for_qr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.store_fulfillment_settings (store_id, dine_in_enabled, takeaway_enabled, delivery_enabled, dine_in_requires_table)
  VALUES (NEW.store_id, true, false, true, true)
  ON CONFLICT (store_id) DO UPDATE
    SET dine_in_enabled = true
    WHERE store_fulfillment_settings.dine_in_enabled = false OR store_fulfillment_settings.dine_in_enabled IS NULL;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.family_plan_slots_left(_plan_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT GREATEST(COALESCE((SELECT max_families FROM public.family_plans WHERE id = _plan_id), 0)
         - COALESCE((SELECT COUNT(*) FROM public.family_groups WHERE plan_id = _plan_id), 0), 0)::integer;
$function$;

CREATE OR REPLACE FUNCTION public.generate_licenses_for_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.partner_licenses(partner_id, batch_id, status)
  SELECT NEW.partner_id, NEW.id, 'available'
  FROM generate_series(1, NEW.qty);

  UPDATE public.partners
     SET total_licenses_purchased = total_licenses_purchased + NEW.qty,
         total_amount_paid = total_amount_paid + NEW.total_inr,
         license_price_per_unit = NEW.unit_price_inr
   WHERE id = NEW.partner_id;

  PERFORM public.accrue_hierarchy_commissions(
    NEW.partner_id, NEW.total_inr, 'license_batch', NEW.id::text
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 7));
    SELECT EXISTS(SELECT 1 FROM public.partners WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_plan_offer_pct(_cycle text DEFAULT 'monthly'::text)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT COALESCE((
    SELECT percent_off FROM public.platform_plan_offers
    WHERE enabled = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
      AND ((_cycle = 'monthly' AND applies_to_monthly) OR (_cycle = 'annual' AND applies_to_annual))
    LIMIT 1
  ), 0)::numeric;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_store_offer_pct(_store_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT COALESCE((
    SELECT percent_off FROM public.store_site_offers
    WHERE store_id = _store_id
      AND enabled = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
    LIMIT 1
  ), 0)::numeric;
$function$;

CREATE OR REPLACE FUNCTION public.get_order_by_tracking(tracking_code text)
RETURNS TABLE(id uuid, order_number text, status text, prep_status text, fulfillment_mode text, table_label text, total numeric, items jsonb, created_at timestamp with time zone, store_id uuid, guest_tracking_code text)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT
    o.id, o.order_number, o.status::text, o.prep_status, o.fulfillment_mode,
    o.table_label, o.total, o.items, o.created_at, o.store_id, o.guest_tracking_code
  FROM public.orders o
  WHERE o.guest_tracking_code = tracking_code
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_order_eligibility(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  o public.orders%ROWTYPE;
  can_cancel boolean := false;
  can_return boolean := false;
  can_exchange boolean := false;
  can_review boolean := false;
  can_invoice boolean := false;
  can_track boolean := false;
  can_buy_again boolean := false;
  return_reason text := NULL;
  exchange_reason text := NULL;
  cancel_reason text := NULL;
  existing_return_id uuid;
  existing_exchange_id uuid;
  first_item jsonb;
  pid uuid;
  prod public.products%ROWTYPE;
  delivered_on timestamptz;
  days_since numeric;
  is_owner boolean := false;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;

  SELECT (o.customer_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = o.store_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  INTO is_owner;
  IF NOT is_owner THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF o.status::text IN ('pending','new','confirmed','processing','packed')
     AND o.status::text NOT IN ('shipped','out_for_delivery','delivered','cancelled','returned') THEN
    can_cancel := true;
  ELSE
    cancel_reason := 'Order has already shipped or been finalized';
  END IF;

  IF o.status::text IN ('confirmed','processing','packed','shipped','out_for_delivery') THEN
    can_track := true;
  END IF;

  IF o.payment_status::text = 'paid' THEN can_invoice := true; END IF;

  IF o.status::text = 'delivered' OR o.delivered_at IS NOT NULL THEN
    can_buy_again := true;
    delivered_on := COALESCE(o.delivered_at, o.updated_at);
    first_item := (SELECT jsonb_array_elements(o.items) LIMIT 1);
    pid := NULLIF(first_item->>'product_id','')::uuid;
    IF pid IS NOT NULL THEN SELECT * INTO prod FROM public.products WHERE id = pid; END IF;

    SELECT id INTO existing_return_id FROM public.returns
      WHERE order_id = _order_id AND request_type = 'return'
        AND status::text NOT IN ('rejected','cancelled') LIMIT 1;
    SELECT id INTO existing_exchange_id FROM public.returns
      WHERE order_id = _order_id AND request_type = 'exchange'
        AND status::text NOT IN ('rejected','cancelled') LIMIT 1;

    days_since := EXTRACT(EPOCH FROM (now() - delivered_on))/86400.0;

    IF existing_return_id IS NOT NULL THEN return_reason := 'Return request already exists';
    ELSIF prod.id IS NOT NULL AND prod.is_returnable = false THEN return_reason := 'This product is not returnable';
    ELSIF prod.id IS NOT NULL AND days_since > COALESCE(prod.return_window_days,7) THEN return_reason := 'Return window expired';
    ELSIF o.payment_status::text = 'refunded' THEN return_reason := 'Order already refunded';
    ELSE can_return := true; END IF;

    IF existing_exchange_id IS NOT NULL THEN exchange_reason := 'Exchange request already exists';
    ELSIF prod.id IS NOT NULL AND prod.is_exchangeable = false THEN exchange_reason := 'This product is not exchangeable';
    ELSIF prod.id IS NOT NULL AND days_since > COALESCE(prod.exchange_window_days,7) THEN exchange_reason := 'Exchange window expired';
    ELSE can_exchange := true; END IF;

    IF o.customer_user_id IS NOT NULL AND pid IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.product_id = pid AND r.user_id = o.customer_user_id) THEN
        can_review := true;
      END IF;
    ELSE can_review := true; END IF;
  END IF;

  IF o.status::text = 'cancelled' THEN can_buy_again := true; can_track := false; END IF;

  RETURN jsonb_build_object(
    'order_id', _order_id, 'status', o.status::text, 'payment_status', o.payment_status::text,
    'delivered_at', o.delivered_at, 'canCancel', can_cancel, 'canReturn', can_return,
    'canExchange', can_exchange, 'canReview', can_review, 'canDownloadInvoice', can_invoice,
    'canTrack', can_track, 'canBuyAgain', can_buy_again, 'cancelReason', cancel_reason,
    'returnReason', return_reason, 'exchangeReason', exchange_reason,
    'existingReturnId', existing_return_id, 'existingExchangeId', existing_exchange_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_credit_settings()
RETURNS TABLE(low_balance_threshold integer, critical_balance_threshold integer, custom_recharge_rate numeric, custom_min_inr integer, custom_max_inr integer, welcome_grant_credits integer)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT low_balance_threshold, critical_balance_threshold, custom_recharge_rate,
         custom_min_inr, custom_max_inr, welcome_grant_credits
  FROM public.platform_credit_settings WHERE id = 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_storefront_cod_rules(_store_id uuid)
RETURNS TABLE(enabled boolean, min_order_value numeric, max_order_value numeric, require_phone_verification boolean, min_prior_orders integer, pincode_allowlist text[], pincode_blocklist text[])
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT cr.enabled, cr.min_order_value, cr.max_order_value, cr.require_phone_verification,
         cr.min_prior_orders, cr.pincode_allowlist, cr.pincode_blocklist
  FROM public.cod_rules cr
  JOIN public.stores s ON s.id = cr.store_id
  WHERE cr.store_id = _store_id AND s.is_published = true
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.grant_plan_signup_bonus(_store_id uuid, _plan text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  bonus integer;
  already integer;
  new_balance integer;
BEGIN
  IF _plan IS NULL OR _plan = 'free' THEN RETURN 0; END IF;
  SELECT signup_bonus_credits INTO bonus FROM public.plan_configs WHERE plan = _plan::subscription_plan;
  IF COALESCE(bonus, 0) <= 0 THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO already FROM public.ai_credit_transactions
  WHERE store_id = _store_id AND type = 'bonus'
    AND metadata->>'source' = 'signup_bonus' AND metadata->>'plan' = _plan;
  IF already > 0 THEN RETURN 0; END IF;

  new_balance := public.credit_wallet(
    _store_id, bonus, 'bonus'::credit_txn_type, 0, NULL, NULL, NULL, NULL,
    'Welcome bonus — ' || _plan || ' plan',
    jsonb_build_object('source', 'signup_bonus', 'plan', _plan)
  );
  RETURN bonus;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_custom_page_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  reserved text[] := ARRAY[
    'home','shop','product','products','cart','checkout','journal',
    'about','contact','account','auth','blog','menu','book','collections',
    'wishlist','reset-password','preview-theme','p'
  ];
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN RAISE EXCEPTION 'Slug is required'; END IF;
  NEW.slug := lower(trim(NEW.slug));
  IF NEW.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Slug must be lowercase letters, numbers, and dashes only';
  END IF;
  IF NEW.slug = ANY(reserved) THEN
    RAISE EXCEPTION 'Slug ""%"" is reserved and cannot be used', NEW.slug;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_customer_tenant_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  is_store_customer boolean := COALESCE((NEW.raw_user_meta_data->>'is_customer')::boolean, false);
  store_slug text := NULLIF(NEW.raw_user_meta_data->>'store_slug', '');
  expected_suffix text;
BEGIN
  IF is_store_customer THEN
    IF store_slug IS NULL THEN RAISE EXCEPTION 'Customer signup requires store_slug metadata'; END IF;
    expected_suffix := '@' || store_slug || '.customers.pictocart.in';
    IF NEW.email IS NULL OR position(expected_suffix in lower(NEW.email)) = 0 THEN
      RAISE EXCEPTION 'Customer signup must use tenant-aliased email for store %', store_slug;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_partner_parent_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  cur uuid := NEW.parent_partner_id;
  depth int := 0;
BEGIN
  IF NEW.parent_partner_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_partner_id = NEW.id THEN RAISE EXCEPTION 'Partner cannot be its own parent'; END IF;
  WHILE cur IS NOT NULL LOOP
    depth := depth + 1;
    IF depth > 5 THEN RAISE EXCEPTION 'Hierarchy too deep'; END IF;
    IF cur = NEW.id THEN RAISE EXCEPTION 'Hierarchy cycle detected'; END IF;
    SELECT parent_partner_id INTO cur FROM public.partners WHERE id = cur;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_store_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  bonus integer;
BEGIN
  INSERT INTO public.subscriptions (store_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (store_id) DO NOTHING;

  SELECT signup_bonus_credits INTO bonus FROM public.plan_configs WHERE plan = 'free';

  IF COALESCE(bonus, 0) > 0 THEN
    PERFORM public.credit_wallet(
      NEW.id, bonus, 'bonus'::credit_txn_type, 0, NULL, NULL, NULL, NULL,
      'Welcome bonus — Free plan',
      jsonb_build_object('source', 'signup_bonus', 'plan', 'free')
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  is_store_customer boolean := COALESCE((NEW.raw_user_meta_data->>'is_customer')::boolean, false);
  customer_store_slug text := NULLIF(NEW.raw_user_meta_data->>'store_slug', '');
  customer_store_id uuid;
  real_customer_email text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'customer_email', ''), NEW.email);
  resolved_name text := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    TRIM(CONCAT_WS(' ', NEW.raw_user_meta_data->>'given_name', NEW.raw_user_meta_data->>'family_name')),
    ''
  )), '');
BEGIN
  IF is_store_customer THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;

    IF customer_store_slug IS NOT NULL THEN
      SELECT id INTO customer_store_id FROM public.stores WHERE slug = customer_store_slug LIMIT 1;
      IF customer_store_id IS NOT NULL THEN
        INSERT INTO public.customers (user_id, store_id, name, email, phone)
        VALUES (NEW.id, customer_store_id, resolved_name, real_customer_email,
                NULLIF(COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'), ''))
        ON CONFLICT (user_id, store_id) DO UPDATE SET
          name = COALESCE(public.customers.name, EXCLUDED.name),
          email = COALESCE(public.customers.email, EXCLUDED.email),
          phone = COALESCE(public.customers.phone, EXCLUDED.phone),
          updated_at = now();
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(resolved_name, ''))
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'seller') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.head_downline_partners(_head_partner_id uuid)
RETURNS TABLE(id uuid, name text, email_masked text, tier partner_tier, partner_type text, invite_status text, total_licenses_purchased integer, total_amount_paid numeric, state_name text, region_name text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.partners WHERE id = _head_partner_id AND user_id = auth.uid()))
  THEN RAISE EXCEPTION 'Not authorized'; END IF;

  RETURN QUERY
  WITH RECURSIVE down AS (
    SELECT p.id FROM public.partners p WHERE p.parent_partner_id = _head_partner_id
    UNION ALL
    SELECT c.id FROM public.partners c JOIN down d ON c.parent_partner_id = d.id
  )
  SELECT p.id, p.name,
    CASE WHEN p.email IS NULL OR position('@' in p.email) = 0 THEN NULL
         ELSE substring(p.email from 1 for 2) || '***@' || split_part(p.email, '@', 2)
    END AS email_masked,
    p.tier, p.partner_type, p.invite_status, p.total_licenses_purchased,
    p.total_amount_paid, p.state_name, p.region_name, p.created_at
  FROM public.partners p WHERE p.id IN (SELECT id FROM down)
  ORDER BY p.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.head_downline_summary(_head_partner_id uuid)
RETURNS TABLE(downline_count integer, licenses_sold integer, gmv numeric, override_lifetime numeric, override_this_month numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _head_partner_id AND user_id = auth.uid())
     AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH RECURSIVE down AS (
    SELECT id FROM public.partners WHERE parent_partner_id = _head_partner_id
    UNION ALL
    SELECT p.id FROM public.partners p JOIN down d ON p.parent_partner_id = d.id
  )
  SELECT
    (SELECT COUNT(*)::int FROM down),
    COALESCE((SELECT SUM(total_licenses_purchased)::int FROM public.partners WHERE id IN (SELECT id FROM down)), 0),
    COALESCE((SELECT SUM(total_amount_paid) FROM public.partners WHERE id IN (SELECT id FROM down)), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions WHERE partner_id = _head_partner_id AND commission_type <> 'direct'), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions WHERE partner_id = _head_partner_id AND commission_type <> 'direct' AND period_month = date_trunc('month', now())::date), 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = coupon_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.inventory_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  item jsonb;
  pid uuid;
  q int;
BEGIN
  FOR item IN SELECT jsonb_array_elements(NEW.items) LOOP
    pid := NULLIF(item->>'product_id','')::uuid;
    q := COALESCE((item->>'quantity')::int, 0);
    IF pid IS NOT NULL AND q > 0 THEN
      UPDATE public.products
        SET inventory_count = COALESCE(inventory_count,0) + q
        WHERE id = pid AND store_id = NEW.store_id;
      INSERT INTO public.inventory_movements(store_id, product_id, movement_type, qty, reference_table, reference_id, notes)
      VALUES (NEW.store_id, pid, 'purchase', q, 'purchase_bills', NEW.id, NEW.bill_number);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_partner_in_downline(_head_user_id uuid, _partner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  WITH RECURSIVE chain AS (
    SELECT id, parent_partner_id FROM public.partners WHERE id = _partner_id
    UNION ALL
    SELECT p.id, p.parent_partner_id FROM public.partners p JOIN chain c ON p.id = c.parent_partner_id
  )
  SELECT EXISTS (
    SELECT 1 FROM chain c JOIN public.partners h ON h.id = c.parent_partner_id WHERE h.user_id = _head_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_phone_cod_blocked(_store_id uuid, _phone text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.cod_rules cr
    WHERE cr.store_id = _store_id AND _phone IS NOT NULL AND _phone = ANY(cr.blocked_phones)
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_store_access_blocked(_store_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT COALESCE((
    SELECT is_blocked AND plan::text <> 'free' FROM public.subscriptions WHERE store_id = _store_id
  ), false);
$function$;

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_actor text;
  v_user uuid;
BEGIN
  v_user := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF v_user IS NOT NULL AND v_user = NEW.customer_user_id THEN v_actor := 'Customer';
    ELSIF v_user IS NULL THEN v_actor := 'System';
    ELSE v_actor := 'Merchant'; END IF;
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, actor, note)
    VALUES (NEW.id, NULL, COALESCE(NEW.status::text, 'pending'), v_user, v_actor, 'Order placed');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF v_user IS NULL THEN v_actor := 'System';
    ELSIF v_user = NEW.customer_user_id THEN v_actor := 'Customer';
    ELSE v_actor := 'Merchant'; END IF;
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, actor, note)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, v_user, v_actor, NULL);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN PERFORM pgmq.create(dlq_name); EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN PERFORM pgmq.delete(source_queue, message_id); EXCEPTION WHEN undefined_table THEN NULL; END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.next_invoice_number(_store_id uuid, _prefix text DEFAULT 'INV'::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  fy text;
  next_num integer;
  m int := EXTRACT(MONTH FROM now())::int;
  y int := EXTRACT(YEAR FROM now())::int;
BEGIN
  IF m >= 4 THEN
    fy := y::text || '-' || lpad(((y+1) % 100)::text, 2, '0');
  ELSE
    fy := (y-1)::text || '-' || lpad((y % 100)::text, 2, '0');
  END IF;

  INSERT INTO public.invoice_counters(store_id, fiscal_year, last_number, prefix)
  VALUES (_store_id, fy, 1, _prefix)
  ON CONFLICT (store_id, fiscal_year)
  DO UPDATE SET last_number = invoice_counters.last_number + 1, updated_at = now()
  RETURNING last_number INTO next_num;

  RETURN _prefix || '/' || fy || '/' || lpad(next_num::text, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.partner_leaderboard(_from date, _to date, _metric text DEFAULT 'commission'::text, _head_partner_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(partner_id uuid, partner_name text, tier partner_tier, state_name text, licenses integer, gmv numeric, commission numeric, rank integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  is_admin bool := public.has_role(auth.uid(),'admin');
  is_head bool := FALSE;
BEGIN
  IF _head_partner_id IS NOT NULL THEN
    is_head := EXISTS(SELECT 1 FROM public.partners WHERE id = _head_partner_id AND user_id = auth.uid());
    IF NOT is_head AND NOT is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;
  ELSIF NOT is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  RETURN QUERY
  WITH RECURSIVE down AS (
    SELECT id FROM public.partners
      WHERE _head_partner_id IS NOT NULL AND parent_partner_id = _head_partner_id
    UNION ALL
    SELECT p.id FROM public.partners p JOIN down d ON p.parent_partner_id = d.id
  ),
  scope AS (
    SELECT id FROM public.partners WHERE (_head_partner_id IS NULL) OR id IN (SELECT id FROM down)
  ),
  agg AS (
    SELECT p.id AS pid, p.name AS pname, p.tier AS ptier, p.state_name AS pstate,
      COALESCE(SUM(plb.qty) FILTER (WHERE plb.created_at::date BETWEEN _from AND _to), 0)::int AS lic,
      COALESCE(SUM(plb.total_inr) FILTER (WHERE plb.created_at::date BETWEEN _from AND _to), 0)::numeric AS gmv_amt,
      COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.created_at::date BETWEEN _from AND _to), 0)::numeric AS comm
    FROM public.partners p
    LEFT JOIN public.partner_license_batches plb ON plb.partner_id = p.id
    LEFT JOIN public.partner_commissions pc ON pc.partner_id = p.id
    WHERE p.id IN (SELECT id FROM scope) GROUP BY p.id
  )
  SELECT pid, pname, ptier, pstate, lic, gmv_amt, comm,
    ROW_NUMBER() OVER (ORDER BY CASE _metric WHEN 'licenses' THEN lic::numeric WHEN 'gmv' THEN gmv_amt ELSE comm END DESC)::int
  FROM agg WHERE (lic > 0 OR gmv_amt > 0 OR comm > 0)
  ORDER BY 8 ASC LIMIT 100;
END;
$function$;

CREATE OR REPLACE FUNCTION public.partner_license_summary(_partner_id uuid)
RETURNS TABLE(total integer, available integer, consumed integer, revoked integer)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT COUNT(*)::int, COUNT(*) FILTER (WHERE status='available')::int,
         COUNT(*) FILTER (WHERE status='consumed')::int, COUNT(*) FILTER (WHERE status='revoked')::int
  FROM public.partner_licenses WHERE partner_id = _partner_id;
$function$;

CREATE OR REPLACE FUNCTION public.partner_self_stats(_partner_id uuid)
RETURNS TABLE(total_licenses integer, gmv numeric, lifetime_commission numeric, this_month_commission numeric, pending_payout numeric, paid_out numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _partner_id AND user_id = auth.uid())
     AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    COALESCE((SELECT total_licenses_purchased FROM public.partners WHERE id = _partner_id), 0)::int,
    COALESCE((SELECT total_amount_paid FROM public.partners WHERE id = _partner_id), 0)::numeric,
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions WHERE partner_id = _partner_id), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions WHERE partner_id = _partner_id AND period_month = date_trunc('month',now())::date), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions WHERE partner_id = _partner_id AND status IN ('pending','approved')), 0),
    COALESCE((SELECT SUM(amount) FROM public.partner_payouts WHERE partner_id = _partner_id AND status = 'paid'), 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.pnl_report(_store_id uuid, _from date, _to date)
RETURNS TABLE(revenue numeric, cogs numeric, expenses_total numeric, tax_collected numeric, net_profit numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  _rev numeric := 0; _cogs numeric := 0; _tax numeric := 0; _exp numeric := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin')
          OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = _store_id AND s.user_id = auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(SUM(o.total - COALESCE(o.tax,0)), 0), COALESCE(SUM(o.tax), 0)
    INTO _rev, _tax
  FROM public.orders o
  WHERE o.store_id = _store_id AND o.payment_status = 'paid' AND o.created_at::date BETWEEN _from AND _to;

  SELECT COALESCE(SUM(COALESCE((it->>'quantity')::numeric,0) * COALESCE(p.cost_price,0)), 0) INTO _cogs
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) it
  LEFT JOIN public.products p ON p.id = NULLIF(it->>'product_id','')::uuid
  WHERE o.store_id = _store_id AND o.payment_status = 'paid' AND o.created_at::date BETWEEN _from AND _to;

  SELECT COALESCE(SUM(amount), 0) INTO _exp
  FROM public.expenses WHERE store_id = _store_id AND expense_date BETWEEN _from AND _to;

  revenue := _rev; cogs := _cogs; expenses_total := _exp; tax_collected := _tax;
  net_profit := _rev - _cogs - _exp;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_customer_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  cid uuid;
BEGIN
  cid := COALESCE(NEW.customer_id, OLD.customer_id);
  IF cid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.customers c
  SET balance = COALESCE((
    SELECT SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END)
    FROM public.khata_entries WHERE customer_id = cid
  ), 0)
  WHERE c.id = cid;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.schedule_plan_change(_store_id uuid, _new_plan text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  cur_plan public.subscription_plan; cur_period_end TIMESTAMPTZ;
  cur_order INT; new_order INT; is_owner BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.stores WHERE id = _store_id AND user_id = auth.uid()) INTO is_owner;
  IF NOT is_owner AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT plan, current_period_end INTO cur_plan, cur_period_end FROM public.subscriptions WHERE store_id = _store_id;
  IF cur_plan IS NULL THEN RAISE EXCEPTION 'No subscription'; END IF;

  SELECT sort_order INTO cur_order FROM public.plan_configs WHERE plan = cur_plan;
  SELECT sort_order INTO new_order FROM public.plan_configs WHERE plan = _new_plan::public.subscription_plan;
  IF new_order IS NULL THEN RAISE EXCEPTION 'Unknown plan'; END IF;

  IF new_order > cur_order THEN
    RETURN jsonb_build_object('action','upgrade');
  ELSIF new_order < cur_order THEN
    UPDATE public.subscriptions
       SET pending_plan = _new_plan::public.subscription_plan,
           pending_plan_effective_at = COALESCE(cur_period_end, now() + interval '30 days')
     WHERE store_id = _store_id;
    RETURN jsonb_build_object('action','downgrade_scheduled', 'effective_at', COALESCE(cur_period_end, now() + interval '30 days'));
  ELSE RAISE EXCEPTION 'Already on this plan'; END IF;
END;
$function$;

-- transfer_store_to_client (overloaded — 4 params version)
CREATE OR REPLACE FUNCTION public.transfer_store_to_client(_store_id uuid, _client_user_id uuid, _handover_id uuid, _plan text DEFAULT NULL::text, _billing_cycle text DEFAULT 'annual'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_partner_id uuid; v_plan text; v_period_end timestamptz;
BEGIN
  SELECT partner_id, COALESCE(_plan, plan) INTO v_partner_id, v_plan
  FROM public.store_handovers WHERE id = _handover_id;
  IF v_partner_id IS NULL THEN RAISE EXCEPTION 'Handover not found'; END IF;

  v_period_end := CASE WHEN _billing_cycle = 'annual' THEN now() + interval '365 days'
                       ELSE now() + interval '30 days' END;

  UPDATE public.stores SET user_id = _client_user_id, partner_handover_status = 'accepted'
   WHERE id = _store_id AND owned_by_partner_id = v_partner_id;

  INSERT INTO public.subscriptions(store_id, plan, status, billing_cycle, current_period_start, current_period_end, is_blocked)
  VALUES (_store_id, v_plan::subscription_plan, 'active', _billing_cycle, now(), v_period_end, false)
  ON CONFLICT (store_id) DO UPDATE
    SET plan = EXCLUDED.plan, status = 'active', billing_cycle = EXCLUDED.billing_cycle,
        current_period_start = EXCLUDED.current_period_start, current_period_end = EXCLUDED.current_period_end,
        is_blocked = false, cancelled_at = NULL, pending_plan = NULL, pending_plan_effective_at = NULL,
        expiry_notified_at = NULL, blocked_notified_at = NULL, last_renewal_reminder_at = NULL, updated_at = now();

  UPDATE public.store_handovers SET status = 'accepted', accepted_at = now(), paid_at = COALESCE(paid_at, now())
   WHERE id = _handover_id;
END;
$function$;

-- transfer_store_to_client (3 params version)
CREATE OR REPLACE FUNCTION public.transfer_store_to_client(_store_id uuid, _client_user_id uuid, _handover_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_partner_id uuid;
BEGIN
  SELECT partner_id INTO v_partner_id FROM public.store_handovers WHERE id = _handover_id;
  IF v_partner_id IS NULL THEN RAISE EXCEPTION 'Handover not found'; END IF;
  UPDATE public.stores SET user_id = _client_user_id, partner_handover_status = 'accepted'
   WHERE id = _store_id AND owned_by_partner_id = v_partner_id;
  UPDATE public.store_handovers SET status = 'accepted', accepted_at = now() WHERE id = _handover_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$function$;
