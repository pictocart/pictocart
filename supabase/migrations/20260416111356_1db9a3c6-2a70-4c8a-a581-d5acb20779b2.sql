
CREATE TABLE public.store_email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

ALTER TABLE public.store_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own templates"
ON public.store_email_templates FOR SELECT
USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_email_templates.store_id AND stores.user_id = auth.uid()));

CREATE POLICY "Store owners can insert own templates"
ON public.store_email_templates FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_email_templates.store_id AND stores.user_id = auth.uid()));

CREATE POLICY "Store owners can update own templates"
ON public.store_email_templates FOR UPDATE
USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_email_templates.store_id AND stores.user_id = auth.uid()));

CREATE POLICY "Service role full access"
ON public.store_email_templates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_store_email_templates_updated_at
BEFORE UPDATE ON public.store_email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
