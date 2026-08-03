-- 1. Recreate Guest Dine-in policy on orders to support default settings fallbacks
DROP POLICY IF EXISTS "Guests can place dine-in orders" ON public.orders;
CREATE POLICY "Guests can place dine-in orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    fulfillment_mode = 'dine_in'::fulfillment_mode AND
    customer_user_id IS NULL AND
    EXISTS (
      SELECT 1
      FROM public.stores s
      LEFT JOIN public.store_fulfillment_settings f ON f.store_id = s.id
      WHERE s.id = orders.store_id
        AND s.is_published = true
        AND (
          f.dine_in_enabled IS NOT FALSE OR
          s.category = 'food'
        )
    )
  );

-- 2. Recreate Guest Takeaway policy on orders to support default settings fallbacks
DROP POLICY IF EXISTS "Guests can place takeaway orders" ON public.orders;
CREATE POLICY "Guests can place takeaway orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    fulfillment_mode = 'takeaway'::fulfillment_mode AND
    customer_user_id IS NULL AND
    customer_phone IS NOT NULL AND
    length(customer_phone) >= 7 AND
    EXISTS (
      SELECT 1
      FROM public.stores s
      LEFT JOIN public.store_fulfillment_settings f ON f.store_id = s.id
      WHERE s.id = orders.store_id
        AND s.is_published = true
        AND (
          f.takeaway_enabled IS NOT FALSE OR
          s.category = 'food'
        )
    )
  );
