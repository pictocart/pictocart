-- Migration: Allow store staff members to view the subscription details of their assigned store

CREATE POLICY "Staff can view assigned store subscription"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.user_id = auth.uid()
        AND store_staff.store_id = subscriptions.store_id
    )
  );
