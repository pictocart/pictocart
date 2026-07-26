-- 1. Reviews: tighten public read
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Public can read approved reviews of published stores"
ON public.reviews FOR SELECT
USING (
  (moderation_status = 'approved' AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = reviews.store_id AND s.is_published = true
  ))
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = reviews.store_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
-- 2. Store testimonials: only published stores
DROP POLICY IF EXISTS "Anyone can view testimonials" ON public.store_testimonials;
CREATE POLICY "Public can view testimonials of published stores"
ON public.store_testimonials FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_testimonials.store_id AND s.is_published = true)
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_testimonials.store_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
-- 3. sourcing_products: revoke full contact columns from anon/authenticated
REVOKE SELECT (supplier_phone_full, supplier_email_full) ON public.sourcing_products FROM anon, authenticated;
-- 4. sourcing_suppliers: revoke sensitive columns from anon/authenticated
REVOKE SELECT (bank_account_number, bank_ifsc, bank_account_name, gstin, email, phone, whatsapp)
  ON public.sourcing_suppliers FROM anon, authenticated;
