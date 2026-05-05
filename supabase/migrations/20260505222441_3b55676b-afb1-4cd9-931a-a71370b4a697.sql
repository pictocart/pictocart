ALTER TABLE public.theme_master_projects
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compare_at_price numeric;