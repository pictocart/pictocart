DROP POLICY "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.is_published = true)
);
