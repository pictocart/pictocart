DO $$
BEGIN
  -- Add PRIMARY KEY if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.suppliers'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.suppliers ADD PRIMARY KEY (id);
  END IF;

  -- Add store_id fkey if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.purchase_bills'::regclass AND conname = 'purchase_bills_store_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_bills 
      ADD CONSTRAINT purchase_bills_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
  END IF;

  -- Add supplier_id fkey if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.purchase_bills'::regclass AND conname = 'purchase_bills_supplier_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_bills 
      ADD CONSTRAINT purchase_bills_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;
