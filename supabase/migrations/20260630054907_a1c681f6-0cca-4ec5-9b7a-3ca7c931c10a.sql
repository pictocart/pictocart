-- 1) platform_credit_settings: lock SELECT to admins only; expose safe subset via RPC
DROP POLICY IF EXISTS "Anon read settings" ON public.platform_credit_settings;
DROP POLICY IF EXISTS "Authenticated read settings" ON public.platform_credit_settings;
CREATE POLICY "Admins read settings"
  ON public.platform_credit_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.platform_credit_settings FROM anon, authenticated;
GRANT SELECT ON public.platform_credit_settings TO authenticated;
-- still gated by RLS (admin only)

CREATE OR REPLACE FUNCTION public.get_public_credit_settings()
RETURNS TABLE(
  low_balance_threshold integer,
  critical_balance_threshold integer,
  custom_recharge_rate numeric,
  custom_min_inr integer,
  custom_max_inr integer,
  welcome_grant_credits integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT low_balance_threshold, critical_balance_threshold, custom_recharge_rate,
         custom_min_inr, custom_max_inr, welcome_grant_credits
  FROM public.platform_credit_settings
  WHERE id = 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_credit_settings() TO anon, authenticated;
-- 2) store_google_reviews_cache: restrict to reviews of published stores
DROP POLICY IF EXISTS "Anyone can view cached Google reviews" ON public.store_google_reviews_cache;
CREATE POLICY "Public can view cached reviews of published stores"
  ON public.store_google_reviews_cache FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_google_reviews_cache.store_id AND s.is_published = true
  ));
-- 3) sourcing_products: hide supplier_email_full and supplier_phone_full from public reads
REVOKE SELECT ON public.sourcing_products FROM anon, authenticated;
GRANT SELECT (
  id, supplier_id, source, source_url, external_id, title, description, category, subcategory,
  tags, images, hero_image, moq, price_min, price_max, currency, suggested_retail_price,
  estimated_margin_pct, supplier_name_cached, supplier_city_cached, supplier_phone_masked,
  ships_pan_india, lead_time_days, rating, reviews_count, ai_score, ai_insight, raw_json,
  dedupe_hash, is_active, created_at, updated_at
) ON public.sourcing_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sourcing_products TO authenticated;
GRANT ALL ON public.sourcing_products TO service_role;
-- 4) reviews: remove from realtime publication (no client subscribes to it)
ALTER PUBLICATION supabase_realtime DROP TABLE public.reviews;
