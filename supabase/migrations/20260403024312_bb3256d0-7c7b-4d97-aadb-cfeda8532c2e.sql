-- Theme packs table
CREATE TABLE public.theme_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text DEFAULT '',
  thumbnail text,
  pages jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  price integer NOT NULL DEFAULT 0,
  ai_generation_cost numeric NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.theme_packs ENABLE ROW LEVEL SECURITY;
-- All authenticated can read published theme packs
CREATE POLICY "Anyone can read published theme packs" ON public.theme_packs
  FOR SELECT TO authenticated
  USING (is_published = true);
-- Admins can do everything
CREATE POLICY "Admins can manage theme packs" ON public.theme_packs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- Theme purchases table
CREATE TABLE public.theme_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  theme_pack_id uuid NOT NULL REFERENCES public.theme_packs(id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, theme_pack_id)
);
ALTER TABLE public.theme_purchases ENABLE ROW LEVEL SECURITY;
-- Store owners can view their own purchases
CREATE POLICY "Store owners can view purchases" ON public.theme_purchases
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = theme_purchases.store_id AND stores.user_id = auth.uid()));
-- Store owners can purchase (insert)
CREATE POLICY "Store owners can purchase" ON public.theme_purchases
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = theme_purchases.store_id AND stores.user_id = auth.uid()));
-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases" ON public.theme_purchases
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- Update trigger for theme_packs
CREATE TRIGGER update_theme_packs_updated_at
  BEFORE UPDATE ON public.theme_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
