-- Unique primary key constraint for invoice_counters
ALTER TABLE public.invoice_counters DROP CONSTRAINT IF EXISTS invoice_counters_pkey;
ALTER TABLE public.invoice_counters ADD PRIMARY KEY (store_id, fiscal_year);

-- Secure RPC function to cancel/delete unpaid pending orders
CREATE OR REPLACE FUNCTION public.cancel_unpaid_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.orders
  WHERE id = _order_id
    AND payment_status = 'pending'
    AND payment_method IN ('razorpay', 'upi', 'card');
END;
$$;
