
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage categories"
  ON public.categories FOR ALL
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()));

CREATE POLICY "Public can read categories of published stores"
  ON public.categories FOR SELECT
  TO public
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.is_published = true));
