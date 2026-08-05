-- Add UNIQUE constraint to public.cod_rules table on store_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.cod_rules'::regclass AND conname = 'cod_rules_store_id_key'
  ) THEN
    ALTER TABLE public.cod_rules 
      ADD CONSTRAINT cod_rules_store_id_key UNIQUE (store_id);
  END IF;
END $$;
