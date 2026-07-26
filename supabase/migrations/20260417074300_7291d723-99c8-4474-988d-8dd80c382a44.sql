-- Add custom_domain and Cloudflare for SaaS tracking columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS cloudflare_hostname_id text,
  ADD COLUMN IF NOT EXISTS ssl_status text,
  ADD COLUMN IF NOT EXISTS ssl_last_checked_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS stores_custom_domain_unique
  ON public.stores (lower(custom_domain))
  WHERE custom_domain IS NOT NULL;
-- Allow public lookup of a store by custom_domain (needed for host-based routing)
DROP POLICY IF EXISTS "Public can lookup stores by custom domain" ON public.stores;
CREATE POLICY "Public can lookup stores by custom domain"
ON public.stores
FOR SELECT
TO anon, authenticated
USING (custom_domain IS NOT NULL AND is_published = true);
