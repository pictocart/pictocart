-- Add PRIMARY KEY constraint to customers table (id) if not exists
ALTER TABLE public.customers ADD PRIMARY KEY (id);

-- Add foreign key constraints to public.khata_entries table
ALTER TABLE public.khata_entries 
  ADD CONSTRAINT khata_entries_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD CONSTRAINT khata_entries_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD CONSTRAINT khata_entries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
