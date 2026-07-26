DROP POLICY IF EXISTS "Public can view active offer" ON public.store_site_offers;
CREATE POLICY "Public can view active offer"
ON public.store_site_offers
FOR SELECT
USING (
  enabled = true
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_site_offers.store_id
      AND s.is_published = true
  )
);
