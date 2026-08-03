-- Migration: Allow store staff members to select and update their assigned stores and manage store content.

-- 1. Add policies on public.stores
CREATE POLICY "Staff can view assigned store"
  ON public.stores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.user_id = auth.uid()
        AND store_staff.store_id = stores.id
    )
  );

CREATE POLICY "Staff can update assigned store"
  ON public.stores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.user_id = auth.uid()
        AND store_staff.store_id = stores.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.user_id = auth.uid()
        AND store_staff.store_id = stores.id
    )
  );


-- 2. Add policies on public.store_content
CREATE POLICY "Staff can manage assigned store content"
  ON public.store_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.user_id = auth.uid()
        AND store_staff.store_id = store_content.store_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.user_id = auth.uid()
        AND store_staff.store_id = store_content.store_id
    )
  );
