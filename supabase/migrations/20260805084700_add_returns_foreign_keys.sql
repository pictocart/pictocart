-- Migration: Recreate primary key on orders if missing, clean up orphan returns, and add foreign keys

-- 1. Recreate primary key on orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.orders'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.orders ADD PRIMARY KEY (id);
  END IF;
END $$;

-- 2. Clean up any orphan returns rows
DELETE FROM public.returns WHERE order_id NOT IN (SELECT id FROM public.orders);
DELETE FROM public.returns WHERE store_id NOT IN (SELECT id FROM public.stores);

-- 3. Drop existing constraints if they exist
ALTER TABLE public.returns
  DROP CONSTRAINT IF EXISTS fk_returns_orders,
  DROP CONSTRAINT IF EXISTS fk_returns_stores;

-- 4. Add foreign key constraints
ALTER TABLE public.returns
  ADD CONSTRAINT fk_returns_orders FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_returns_stores FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
