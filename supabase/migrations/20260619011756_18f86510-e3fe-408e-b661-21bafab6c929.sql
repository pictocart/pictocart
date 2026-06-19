
-- Merchant site-wide festive offer (one active config per store)
CREATE TABLE public.store_site_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  percent_off numeric(5,2) NOT NULL DEFAULT 0 CHECK (percent_off >= 0 AND percent_off <= 90),
  starts_at timestamptz,
  ends_at timestamptz,
  label text,
  banner_text text,
  banner_bg_color text DEFAULT '#F97316',
  banner_text_color text DEFAULT '#FFFFFF',
  show_banner boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_site_offers TO authenticated;
GRANT SELECT ON public.store_site_offers TO anon;
GRANT ALL ON public.store_site_offers TO service_role;
ALTER TABLE public.store_site_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active offer" ON public.store_site_offers
  FOR SELECT USING (true);
CREATE POLICY "Owner manages own offer" ON public.store_site_offers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

CREATE TRIGGER trg_store_site_offers_updated
  BEFORE UPDATE ON public.store_site_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin global plan offer (single row)
CREATE TABLE public.platform_plan_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  percent_off numeric(5,2) NOT NULL DEFAULT 0 CHECK (percent_off >= 0 AND percent_off <= 90),
  starts_at timestamptz,
  ends_at timestamptz,
  label text,
  banner_text text,
  banner_bg_color text DEFAULT '#F97316',
  banner_text_color text DEFAULT '#FFFFFF',
  show_banner boolean NOT NULL DEFAULT true,
  applies_to_monthly boolean NOT NULL DEFAULT true,
  applies_to_annual boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_plan_offers TO anon, authenticated;
GRANT ALL ON public.platform_plan_offers TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.platform_plan_offers TO authenticated;
ALTER TABLE public.platform_plan_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read plan offer" ON public.platform_plan_offers
  FOR SELECT USING (true);
CREATE POLICY "Only admin manages plan offer" ON public.platform_plan_offers
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_platform_plan_offers_updated
  BEFORE UPDATE ON public.platform_plan_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a single disabled row so frontend can always read one
INSERT INTO public.platform_plan_offers (enabled, percent_off, label)
VALUES (false, 0, 'Default') ON CONFLICT DO NOTHING;

-- Helper: get effective active site offer % for a store
CREATE OR REPLACE FUNCTION public.get_active_store_offer_pct(_store_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT percent_off FROM public.store_site_offers
    WHERE store_id = _store_id
      AND enabled = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
    LIMIT 1
  ), 0)::numeric;
$$;

-- Helper: get effective active platform plan offer % for given cycle
CREATE OR REPLACE FUNCTION public.get_active_plan_offer_pct(_cycle text DEFAULT 'monthly')
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT percent_off FROM public.platform_plan_offers
    WHERE enabled = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
      AND ((_cycle = 'monthly' AND applies_to_monthly) OR (_cycle = 'annual' AND applies_to_annual))
    LIMIT 1
  ), 0)::numeric;
$$;
