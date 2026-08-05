DROP POLICY IF EXISTS "Customers can cancel own orders" ON public.orders;

CREATE POLICY "Customers can cancel own orders" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_user_id AND status IN ('pending', 'confirmed', 'new'))
  WITH CHECK (auth.uid() = customer_user_id AND status = 'cancelled');
