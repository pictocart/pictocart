-- Self-service custom domain columns
-- domain_status tracks where the merchant is in the flow
-- domain_verification_token is a random token we ask merchant to add as TXT (optional future use)
-- For now the primary verification is CNAME → cname.vercel-dns.com

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS domain_status text DEFAULT 'none'
    CHECK (domain_status IN ('none', 'pending_dns', 'verifying', 'active', 'failed')),
  ADD COLUMN IF NOT EXISTS domain_verification_token text,
  ADD COLUMN IF NOT EXISTS domain_added_to_vercel_at timestamptz;

-- Index for fast lookup by custom_domain (already has unique index, this is a belt-and-suspenders check)
CREATE INDEX IF NOT EXISTS stores_domain_status_idx ON public.stores (domain_status)
  WHERE domain_status NOT IN ('none', 'active');

-- Allow the store owner to update their own domain columns
DROP POLICY IF EXISTS "Store owner can update domain fields" ON public.stores;
CREATE POLICY "Store owner can update domain fields"
ON public.stores
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
