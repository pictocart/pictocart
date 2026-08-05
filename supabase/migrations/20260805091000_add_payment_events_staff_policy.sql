-- Migration: Add staff view policy for payment_events

DROP POLICY IF EXISTS "Store owners view payment events" ON public.payment_events;

CREATE POLICY "Owners and staff can view payment events" ON public.payment_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = payment_events.store_id 
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
