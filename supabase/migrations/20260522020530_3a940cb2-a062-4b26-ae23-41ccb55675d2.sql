-- 1) COD rules: remove public SELECT; add safe storefront RPC
DROP POLICY IF EXISTS "Anyone reads cod rules of published stores" ON public.cod_rules;

CREATE OR REPLACE FUNCTION public.get_storefront_cod_rules(_store_id uuid)
RETURNS TABLE (
  enabled boolean,
  min_order_value numeric,
  max_order_value numeric,
  require_phone_verification boolean,
  min_prior_orders integer,
  pincode_allowlist text[],
  pincode_blocklist text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cr.enabled,
    cr.min_order_value,
    cr.max_order_value,
    cr.require_phone_verification,
    cr.min_prior_orders,
    cr.pincode_allowlist,
    cr.pincode_blocklist
  FROM public.cod_rules cr
  JOIN public.stores s ON s.id = cr.store_id
  WHERE cr.store_id = _store_id
    AND s.is_published = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_storefront_cod_rules(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_storefront_cod_rules(uuid) TO anon, authenticated;

-- Server function for COD eligibility incl. phone-blocklist check (does not expose the list)
CREATE OR REPLACE FUNCTION public.is_phone_cod_blocked(_store_id uuid, _phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cod_rules cr
    WHERE cr.store_id = _store_id
      AND _phone IS NOT NULL
      AND _phone = ANY(cr.blocked_phones)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_phone_cod_blocked(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_phone_cod_blocked(uuid, text) TO anon, authenticated;

-- 2) Orders: drop overly-permissive guest tracking policy and add safe RPC
DROP POLICY IF EXISTS "Guests view order by tracking code" ON public.orders;

CREATE OR REPLACE FUNCTION public.get_order_by_tracking(tracking_code text)
RETURNS TABLE (
  id uuid,
  order_number text,
  status text,
  prep_status text,
  fulfillment_mode text,
  table_label text,
  total numeric,
  items jsonb,
  created_at timestamptz,
  store_id uuid,
  guest_tracking_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id, o.order_number, o.status::text, o.prep_status, o.fulfillment_mode,
    o.table_label, o.total, o.items, o.created_at, o.store_id, o.guest_tracking_code
  FROM public.orders o
  WHERE o.guest_tracking_code = tracking_code
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_order_by_tracking(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking(text) TO anon, authenticated;

-- 3) Remove orders from realtime publication (PII broadcast risk)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.orders';
  END IF;
END $$;

-- 4) Lock down increment_coupon_usage — service-role only
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO service_role;