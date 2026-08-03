-- Recreate select policy for guest/anonymous orders to support post-insert SELECT (RETURNING clause) in Supabase client
DROP POLICY IF EXISTS "Guests can view own orders" ON public.orders;
CREATE POLICY "Guests can view own orders" ON public.orders
  FOR SELECT TO anon, authenticated
  USING (customer_user_id IS NULL);
