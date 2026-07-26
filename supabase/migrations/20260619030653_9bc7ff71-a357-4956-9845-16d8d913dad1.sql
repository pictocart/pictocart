-- 1. store_custom_pages table
CREATE TABLE public.store_custom_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  brief text,
  status text NOT NULL DEFAULT 'draft',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  style_hint text DEFAULT 'match_theme',
  show_in_nav boolean NOT NULL DEFAULT false,
  nav_order integer NOT NULL DEFAULT 0,
  credits_spent integer NOT NULL DEFAULT 0,
  ai_model text,
  version integer NOT NULL DEFAULT 1,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_custom_pages TO authenticated;
GRANT SELECT ON public.store_custom_pages TO anon;
GRANT ALL ON public.store_custom_pages TO service_role;
ALTER TABLE public.store_custom_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their custom pages"
  ON public.store_custom_pages
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins manage all custom pages"
  ON public.store_custom_pages
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can read published custom pages"
  ON public.store_custom_pages
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true)
  );
CREATE INDEX idx_store_custom_pages_store ON public.store_custom_pages(store_id);
CREATE INDEX idx_store_custom_pages_store_slug ON public.store_custom_pages(store_id, slug);
CREATE TRIGGER trg_store_custom_pages_updated_at
  BEFORE UPDATE ON public.store_custom_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- 2. Reserved-slug guard
CREATE OR REPLACE FUNCTION public.guard_custom_page_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reserved text[] := ARRAY[
    'home','shop','product','products','cart','checkout','journal',
    'about','contact','account','auth','blog','menu','book','collections',
    'wishlist','reset-password','preview-theme','p'
  ];
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    RAISE EXCEPTION 'Slug is required';
  END IF;
  NEW.slug := lower(trim(NEW.slug));
  IF NEW.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Slug must be lowercase letters, numbers, and dashes only';
  END IF;
  IF NEW.slug = ANY(reserved) THEN
    RAISE EXCEPTION 'Slug "%" is reserved and cannot be used', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_guard_custom_page_slug
  BEFORE INSERT OR UPDATE OF slug ON public.store_custom_pages
  FOR EACH ROW EXECUTE FUNCTION public.guard_custom_page_slug();
-- 3. stores columns for home-page selection
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS home_page_kind text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS home_page_id uuid REFERENCES public.store_custom_pages(id) ON DELETE SET NULL;
-- 4. Register AI action costs
INSERT INTO public.ai_action_costs (action_key, label, credits, cache_hit_credits, manual_cost_inr, manual_minutes, is_active)
VALUES
  ('generate_custom_page', 'Generate custom page', 25, 25, 1500, 120, true),
  ('regenerate_custom_page_section', 'Regenerate a page section', 8, 8, 300, 20, true)
ON CONFLICT (action_key) DO NOTHING;
