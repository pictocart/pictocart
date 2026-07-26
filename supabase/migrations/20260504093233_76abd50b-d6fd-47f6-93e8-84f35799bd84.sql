-- 1. Add version columns to theme_master_projects
ALTER TABLE public.theme_master_projects
  ADD COLUMN IF NOT EXISTS current_version text NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS latest_changelog text;
-- 2. Theme versions history table
CREATE TABLE IF NOT EXISTS public.theme_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_master_id uuid NOT NULL REFERENCES public.theme_master_projects(id) ON DELETE CASCADE,
  version text NOT NULL,
  summary text NOT NULL DEFAULT '',
  changelog text NOT NULL DEFAULT '',
  released_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (theme_master_id, version)
);
ALTER TABLE public.theme_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read theme versions"
  ON public.theme_versions FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admins manage theme versions"
  ON public.theme_versions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- 3. Track installed version on stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS installed_theme_version text,
  ADD COLUMN IF NOT EXISTS theme_update_dismissed_version text;
CREATE INDEX IF NOT EXISTS idx_theme_versions_theme ON public.theme_versions(theme_master_id, released_at DESC);
