ALTER TABLE public.theme_category_briefs
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS merchant_facing boolean NOT NULL DEFAULT true;
