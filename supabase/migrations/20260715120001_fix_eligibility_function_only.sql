-- Fix: reviews table uses user_id not customer_user_id in get_order_eligibility
CREATE OR REPLACE FUNCTION public.get_order_eligibility(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','not_found');
  END IF;

  SELECT (o.customer_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = o.store_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  INTO is_owner;
  IF NOT is_owner THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF o.status::text IN ('pending','new','confirmed','processing','packed')
     AND o.status::text NOT IN ('shipped','out_for_delivery','delivered','cancelled','returned') THEN
    can_cancel := true;
  ELSE
    cancel_reason := 'Order has already shipped or been finalized';
  END IF;

  IF o.status::text IN ('confirmed','processing','packed','shipped','out_for_delivery') THEN
    can_track := true;
  END IF;

  IF o.payment_status::text = 'paid' THEN
    can_invoice := true;
  END IF;

  IF o.status::text = 'delivered' OR o.delivered_at IS NOT NULL THEN
    can_buy_again := true;
    delivered_on := COALESCE(o.delivered_at, o.updated_at);
    first_item := (SELECT jsonb_array_elements(o.items) LIMIT 1);
    pid := NULLIF(first_item->>'product_id','')::uuid;
    IF pid IS NOT NULL THEN
      SELECT * INTO prod FROM public.products WHERE id = pid;
    END IF;

    SELECT id INTO existing_return_id FROM public.returns
      WHERE order_id = _order_id AND request_type = 'return'
        AND status::text NOT IN ('rejected','cancelled')
      LIMIT 1;
    SELECT id INTO existing_exchange_id FROM public.returns
      WHERE order_id = _order_id AND request_type = 'exchange'
        AND status::text NOT IN ('rejected','cancelled')
      LIMIT 1;

    days_since := EXTRACT(EPOCH FROM (now() - delivered_on))/86400.0;

    IF existing_return_id IS NOT NULL THEN
      return_reason := 'Return request already exists';
    ELSIF prod.id IS NOT NULL AND prod.is_returnable = false THEN
      return_reason := 'This product is not returnable';
    ELSIF prod.id IS NOT NULL AND days_since > COALESCE(prod.return_window_days,7) THEN
      return_reason := 'Return window expired';
    ELSIF o.payment_status::text = 'refunded' THEN
      return_reason := 'Order already refunded';
    ELSE
      can_return := true;
    END IF;

    IF existing_exchange_id IS NOT NULL THEN
      exchange_reason := 'Exchange request already exists';
    ELSIF prod.id IS NOT NULL AND prod.is_exchangeable = false THEN
      exchange_reason := 'This product is not exchangeable';
    ELSIF prod.id IS NOT NULL AND days_since > COALESCE(prod.exchange_window_days,7) THEN
      exchange_reason := 'Exchange window expired';
    ELSE
      can_exchange := true;
    END IF;

    -- FIX: Use r.user_id instead of r.customer_user_id
    IF o.customer_user_id IS NOT NULL AND pid IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.reviews r
        WHERE r.product_id = pid AND r.user_id = o.customer_user_id
      ) THEN can_review := true; END IF;
    ELSE
      can_review := true;
    END IF;
  END IF;

  IF o.status::text = 'cancelled' THEN
    can_buy_again := true;
    can_track := false;
  END IF;

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'status', o.status::text,
    'payment_status', o.payment_status::text,
    'delivered_at', o.delivered_at,
    'canCancel', can_cancel,
    'canReturn', can_return,
    'canExchange', can_exchange,
    'canReview', can_review,
    'canDownloadInvoice', can_invoice,
    'canTrack', can_track,
    'canBuyAgain', can_buy_again,
    'cancelReason', cancel_reason,
    'returnReason', return_reason,
    'exchangeReason', exchange_reason,
    'existingReturnId', existing_return_id,
    'existingExchangeId', existing_exchange_id
  );
END;
$$;
