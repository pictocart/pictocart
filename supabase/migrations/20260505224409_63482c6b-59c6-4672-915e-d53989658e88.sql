
-- Phase 6: Freelancer / Commission Program

-- Extend role enum
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'freelancer';
EXCEPTION WHEN others THEN NULL; END $$;

-- Partners table (freelancers now; agencies later reuse via type='agency')
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'freelancer' CHECK (type IN ('freelancer','agency')),
  referral_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  upi_id TEXT,
  pan TEXT,
  payout_email TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','approved','rejected')),
  commission_pct NUMERIC NOT NULL DEFAULT 20,
  commission_months INT NOT NULL DEFAULT 12,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referrals: which store was referred by which partner
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  store_id UUID,
  referred_user_id UUID,
  signed_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'signup' CHECK (status IN ('signup','paid','churned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON public.partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_store ON public.partner_referrals(store_id);

-- Monthly commission accruals
CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.partner_referrals(id) ON DELETE SET NULL,
  period_month DATE NOT NULL,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','clawback')),
  payout_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referral_id, period_month)
);

-- Payout batches
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  period TEXT,
  utr TEXT,
  method TEXT DEFAULT 'upi',
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','paid','failed')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add referred_by_code to stores (nullable, no FK so legacy rows are safe)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT;

CREATE INDEX IF NOT EXISTS idx_stores_referred_by ON public.stores(referred_by_code);

-- updated_at trigger
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;

-- partners: a user sees only their own partner row; admins see all
CREATE POLICY "Partner can view own row"
  ON public.partners FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partner can insert own row"
  ON public.partners FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partner can update own row"
  ON public.partners FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete partners"
  ON public.partners FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- referrals: partner sees their own; admin sees all; system inserts
CREATE POLICY "Partner can view own referrals"
  ON public.partner_referrals FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin manages referrals"
  ON public.partner_referrals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- commissions: read-only for partner; admin manages
CREATE POLICY "Partner can view own commissions"
  ON public.partner_commissions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin manages commissions"
  ON public.partner_commissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- payouts: same pattern
CREATE POLICY "Partner can view own payouts"
  ON public.partner_payouts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin manages payouts"
  ON public.partner_payouts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: generate a short referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 7));
    SELECT EXISTS(SELECT 1 FROM public.partners WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;
