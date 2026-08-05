-- Add PRIMARY KEY constraint to suppliers table (id) if not exists
ALTER TABLE public.suppliers ADD PRIMARY KEY (id);

-- Add foreign key constraints to public.purchase_bills table
ALTER TABLE public.purchase_bills 
  ADD CONSTRAINT purchase_bills_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD CONSTRAINT purchase_bills_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
