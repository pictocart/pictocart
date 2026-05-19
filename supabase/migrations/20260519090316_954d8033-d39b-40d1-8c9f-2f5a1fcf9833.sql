
CREATE TABLE IF NOT EXISTS public.theme_category_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  display_name TEXT NOT NULL,
  prompt_addendum TEXT NOT NULL DEFAULT '',
  palette_hints TEXT,
  vocabulary TEXT,
  hero_archetypes TEXT,
  section_priority TEXT[] NOT NULL DEFAULT '{}',
  image_style TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vertical, subcategory)
);

CREATE INDEX IF NOT EXISTS idx_tcb_vertical ON public.theme_category_briefs(vertical);
CREATE INDEX IF NOT EXISTS idx_tcb_active ON public.theme_category_briefs(is_active);

ALTER TABLE public.theme_category_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active briefs"
  ON public.theme_category_briefs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can read all briefs"
  ON public.theme_category_briefs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert briefs"
  ON public.theme_category_briefs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update briefs"
  ON public.theme_category_briefs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete briefs"
  ON public.theme_category_briefs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tcb_updated_at BEFORE UPDATE ON public.theme_category_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
