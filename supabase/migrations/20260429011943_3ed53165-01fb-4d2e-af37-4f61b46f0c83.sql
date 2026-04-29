CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores (user_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug_published ON public.stores (slug, is_published);
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain_published ON public.stores (custom_domain, is_published) WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_store_active_created ON public.products (store_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_store_created ON public.products (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_store_created ON public.orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON public.orders (customer_user_id, created_at DESC) WHERE customer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_store_published_created ON public.blog_posts (store_id, is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON public.reviews (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_store ON public.wishlists (user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_domain_health_log_checked_at ON public.domain_health_log (checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_health_log_store_checked_at ON public.domain_health_log (store_id, checked_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_domain_health_log(_retain_days integer DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.domain_health_log
  WHERE checked_at < now() - make_interval(days => GREATEST(_retain_days, 1));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;