CREATE POLICY "Anyone can read master theme versions"
ON public.theme_master_versions
FOR SELECT
TO anon, authenticated
USING (true);
