-- Add UNIQUE constraint to public.cod_rules table on store_id
ALTER TABLE public.cod_rules 
  ADD CONSTRAINT cod_rules_store_id_key UNIQUE (store_id);
