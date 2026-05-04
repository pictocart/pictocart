-- Analytics events table for traffic & conversion funnel tracking
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  event_type text NOT NULL, -- page_view, product_view, add_to_cart, checkout_start, purchase, signup, publish
  product_id uuid,
  order_id uuid,
  user_id uuid,
  session_id text,
  path text,
  referrer text,
  value numeric DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_store_created ON public.analytics_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events(session_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert events for a published store
CREATE POLICY "Public can insert events for published stores"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = analytics_events.store_id AND s.is_published = true)
);

-- Store owners can read their own events
CREATE POLICY "Store owners read own events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = analytics_events.store_id AND s.user_id = auth.uid())
);

-- Admins can read all events
CREATE POLICY "Admins read all events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role full access
CREATE POLICY "Service role manages events"
ON public.analytics_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
