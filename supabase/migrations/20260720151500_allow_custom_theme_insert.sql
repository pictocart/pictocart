-- Allow authenticated users to insert custom themes into theme_master_projects
CREATE POLICY "Authenticated users can insert custom theme projects" ON public.theme_master_projects
  FOR INSERT TO authenticated
  WITH CHECK (theme_id LIKE 'custom-theme-%');

-- Allow authenticated users to insert custom theme versions into theme_master_versions
CREATE POLICY "Authenticated users can insert custom theme versions" ON public.theme_master_versions
  FOR INSERT TO authenticated
  WITH CHECK (theme_id LIKE 'custom-theme-%');
