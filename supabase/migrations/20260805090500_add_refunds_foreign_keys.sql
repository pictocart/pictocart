-- Migration: Clean up any orphan refunds rows and add foreign keys

DELETE FROM public.refunds WHERE order_id NOT IN (SELECT id FROM public.orders);
DELETE FROM public.refunds WHERE store_id NOT IN (SELECT id FROM public.stores);

ALTER TABLE public.refunds
  DROP CONSTRAINT IF EXISTS fk_refunds_orders,
  DROP CONSTRAINT IF EXISTS fk_refunds_stores;

ALTER TABLE public.refunds
  ADD CONSTRAINT fk_refunds_orders FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_refunds_stores FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
