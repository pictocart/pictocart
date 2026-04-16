
CREATE TABLE public.store_email_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  domain text NOT NULL,
  resend_domain_id text,
  status text NOT NULL DEFAULT 'pending',
  dns_records jsonb DEFAULT '[]'::jsonb,
  sender_prefix text NOT NULL DEFAULT 'notifications',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_email_domains_store_id_key UNIQUE (store_id)
);

ALTER TABLE public.store_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own email domain"
  ON public.store_email_domains FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores WHERE stores.id = store_email_domains.store_id AND stores.user_id = auth.uid()
  ));

CREATE POLICY "Store owners can insert own email domain"
  ON public.store_email_domains FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM stores WHERE stores.id = store_email_domains.store_id AND stores.user_id = auth.uid()
  ));

CREATE POLICY "Store owners can update own email domain"
  ON public.store_email_domains FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM stores WHERE stores.id = store_email_domains.store_id AND stores.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on email domains"
  ON public.store_email_domains FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_store_email_domains_updated_at
  BEFORE UPDATE ON public.store_email_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
