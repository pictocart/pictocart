CREATE TABLE public.order_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
CREATE INDEX idx_order_feedback_store ON public.order_feedback(store_id, created_at DESC);
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;
-- Anyone (guest) can insert feedback. We rely on the opaque guest_tracking_code
-- being known to the client; order_id+store_id are validated client-side via the
-- tracking page query.
CREATE POLICY "Anyone can submit order feedback"
ON public.order_feedback
FOR INSERT
WITH CHECK (true);
-- Sellers can read feedback for their own stores
CREATE POLICY "Store owners can read their feedback"
ON public.order_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = order_feedback.store_id AND s.user_id = auth.uid()
  )
);
