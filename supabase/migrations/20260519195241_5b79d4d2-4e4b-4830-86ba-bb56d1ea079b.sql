ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.products.tax_rate IS 'GST rate (%) — treated as inclusive in product price';
COMMENT ON COLUMN public.products.cost_price IS 'Purchase / cost price used for COGS in P&L';