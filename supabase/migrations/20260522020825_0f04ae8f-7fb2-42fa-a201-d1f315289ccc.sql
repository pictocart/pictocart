CREATE OR REPLACE FUNCTION public.apply_coupon_to_recent_order(_coupon_id uuid, _order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
REVOKE EXECUTE ON FUNCTION public.apply_coupon_to_recent_order(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_coupon_to_recent_order(uuid, uuid) TO anon, authenticated, service_role;
