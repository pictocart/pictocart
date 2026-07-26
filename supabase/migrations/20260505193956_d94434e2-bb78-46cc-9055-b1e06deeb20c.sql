-- B4: DPDP account deletion requests
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected|completed
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  processed_at timestamptz,
  processed_by uuid,
  notes text
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own deletion req" ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own deletion req" ON public.account_deletion_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage deletion req" ON public.account_deletion_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service manages deletion req" ON public.account_deletion_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
-- B6: Platform invoices (subscriptions, wallet recharges) — GST ready
CREATE TABLE IF NOT EXISTS public.platform_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  store_id uuid,
  type text NOT NULL, -- 'subscription' | 'wallet_recharge'
  description text NOT NULL,
  amount_inr numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 18,
  gst_amount_inr numeric NOT NULL DEFAULT 0,
  total_inr numeric NOT NULL DEFAULT 0,
  razorpay_payment_id text,
  customer_name text,
  customer_email text,
  customer_gstin text,
  customer_address jsonb DEFAULT '{}'::jsonb,
  pdf_url text,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own invoices" ON public.platform_invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage invoices" ON public.platform_invoices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service manages invoices" ON public.platform_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_user ON public.platform_invoices (user_id, created_at DESC);
-- B7: Razorpay payment disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid,
  order_id uuid,
  razorpay_dispute_id text UNIQUE,
  razorpay_payment_id text,
  amount_inr numeric NOT NULL DEFAULT 0,
  reason_code text,
  reason_description text,
  status text NOT NULL DEFAULT 'open', -- open|under_review|won|lost|closed
  phase text,
  respond_by timestamptz,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage disputes" ON public.disputes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Store owners view own disputes" ON public.disputes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = disputes.store_id AND s.user_id = auth.uid()));
CREATE POLICY "Service manages disputes" ON public.disputes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes (status, created_at DESC);
-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.platform_invoice_seq START 1001;
