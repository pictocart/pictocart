-- Enable store owners and admins to moderate reviews

DROP POLICY IF EXISTS "Store owners and admins can update reviews" ON public.reviews;
CREATE POLICY "Store owners and admins can update reviews" ON public.reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = reviews.store_id AND s.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = reviews.store_id AND s.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Store owners and admins can delete reviews" ON public.reviews;
CREATE POLICY "Store owners and admins can delete reviews" ON public.reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = reviews.store_id AND s.user_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  );
