CREATE TABLE public.store_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_role TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  photo_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view testimonials"
  ON public.store_testimonials FOR SELECT USING (true);
CREATE POLICY "Store owners manage their testimonials"
  ON public.store_testimonials FOR ALL
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));
CREATE TRIGGER trg_store_testimonials_updated
  BEFORE UPDATE ON public.store_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_store_testimonials_store ON public.store_testimonials(store_id, display_order);
CREATE TABLE public.store_google_reviews_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  business_name TEXT,
  business_address TEXT,
  business_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  payment_id TEXT,
  amount_inr NUMERIC NOT NULL DEFAULT 1499,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  average_rating NUMERIC,
  total_reviews INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_google_reviews_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active Google review connections"
  ON public.store_google_reviews_connections FOR SELECT
  USING (is_active = true AND is_paid = true);
CREATE POLICY "Store owners view own connection"
  ON public.store_google_reviews_connections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));
CREATE POLICY "Store owners insert own connection"
  ON public.store_google_reviews_connections FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));
CREATE POLICY "Store owners update own connection"
  ON public.store_google_reviews_connections FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));
CREATE POLICY "Store owners delete own connection"
  ON public.store_google_reviews_connections FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));
CREATE TRIGGER trg_grc_updated
  BEFORE UPDATE ON public.store_google_reviews_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.store_google_reviews_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.store_google_reviews_connections(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  google_review_id TEXT,
  author_name TEXT,
  author_photo_url TEXT,
  rating INTEGER,
  text TEXT,
  relative_time TEXT,
  time_unix BIGINT,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_google_reviews_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view cached Google reviews"
  ON public.store_google_reviews_cache FOR SELECT USING (true);
CREATE INDEX idx_grc_cache_store ON public.store_google_reviews_cache(store_id, time_unix DESC);
