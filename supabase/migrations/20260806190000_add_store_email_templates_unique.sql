-- Add PRIMARY KEY constraint to store_email_templates table (id) if not exists
ALTER TABLE public.store_email_templates ADD PRIMARY KEY (id);

-- Add UNIQUE constraint to public.store_email_templates table on store_id
ALTER TABLE public.store_email_templates 
  ADD CONSTRAINT store_email_templates_store_id_key UNIQUE (store_id);
