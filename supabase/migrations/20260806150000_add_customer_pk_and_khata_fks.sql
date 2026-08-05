DO $$
BEGIN
  -- Add PRIMARY KEY if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.customers'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.customers ADD PRIMARY KEY (id);
  END IF;

  -- Add store_id fkey if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.khata_entries'::regclass AND conname = 'khata_entries_store_id_fkey'
  ) THEN
    ALTER TABLE public.khata_entries 
      ADD CONSTRAINT khata_entries_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
  END IF;

  -- Add customer_id fkey if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.khata_entries'::regclass AND conname = 'khata_entries_customer_id_fkey'
  ) THEN
    ALTER TABLE public.khata_entries 
      ADD CONSTRAINT khata_entries_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;

  -- Add order_id fkey if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.khata_entries'::regclass AND conname = 'khata_entries_order_id_fkey'
  ) THEN
    ALTER TABLE public.khata_entries 
      ADD CONSTRAINT khata_entries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;
