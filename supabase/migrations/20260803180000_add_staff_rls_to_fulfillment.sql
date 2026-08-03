-- 1. Recreate Select policy for store_fulfillment_settings to support public reads of published stores and staff/owner reads of any managed store
DROP POLICY IF EXISTS "Public reads fulfillment of published stores" ON public.store_fulfillment_settings;
CREATE POLICY "Public reads and staff select on fulfillment" ON public.store_fulfillment_settings
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_fulfillment_settings.store_id
      AND (
        s.is_published = true OR
        s.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.store_staff ss
          WHERE ss.store_id = s.id
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 2. Recreate Manage policy (ALL) for store_fulfillment_settings to support owner and staff writes
DROP POLICY IF EXISTS "Owners manage fulfillment" ON public.store_fulfillment_settings;
CREATE POLICY "Owners and staff manage fulfillment" ON public.store_fulfillment_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_fulfillment_settings.store_id
      AND (
        s.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.store_staff ss
          WHERE ss.store_id = s.id
          AND ss.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_fulfillment_settings.store_id
      AND (
        s.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.store_staff ss
          WHERE ss.store_id = s.id
          AND ss.user_id = auth.uid()
        )
      )
    )
  );
