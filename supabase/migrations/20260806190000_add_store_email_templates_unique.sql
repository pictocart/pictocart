DO $$
BEGIN
  -- Add PRIMARY KEY constraint to store_email_templates table (id) if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.store_email_templates'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.store_email_templates ADD PRIMARY KEY (id);
  END IF;

  -- Add UNIQUE constraint to public.store_email_templates table on store_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.store_email_templates'::regclass AND conname = 'store_email_templates_store_id_key'
  ) THEN
    ALTER TABLE public.store_email_templates 
      ADD CONSTRAINT store_email_templates_store_id_key UNIQUE (store_id);
  END IF;
END $$;
