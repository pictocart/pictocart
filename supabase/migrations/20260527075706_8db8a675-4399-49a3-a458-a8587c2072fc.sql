GRANT SELECT ON public.theme_master_projects TO anon;
CREATE POLICY "Public read active theme masters"
ON public.theme_master_projects FOR SELECT
TO anon
USING (is_active = true);