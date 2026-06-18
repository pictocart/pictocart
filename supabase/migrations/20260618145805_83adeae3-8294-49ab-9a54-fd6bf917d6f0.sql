
-- ============ ROLE & ENUMS ============
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_type AS ENUM ('agency','freelancer','intern');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_invite_status AS ENUM ('pending','active','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_license_status AS ENUM ('available','consumed','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.store_handover_status AS ENUM ('pending','accepted','paid','cancelled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ EXTEND partners ============
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS partner_type public.partner_type DEFAULT 'freelancer',
  ADD COLUMN IF NOT EXISTS invite_status public.partner_invite_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invited_by_admin uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_licenses_purchased integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS license_price_per_unit numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS company_name text;

-- ============ partner_license_batches ============
CREATE TABLE IF NOT EXISTS public.partner_license_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  qty integer NOT NULL CHECK (qty > 0),
  unit_price_inr numeric(10,2) NOT NULL DEFAULT 0,
  total_inr numeric(12,2) NOT NULL DEFAULT 0,
  invoice_ref text,
  notes text,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_license_batches TO authenticated;
GRANT ALL ON public.partner_license_batches TO service_role;
ALTER TABLE public.partner_license_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage license batches" ON public.partner_license_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "partner reads own batches" ON public.partner_license_batches
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- ============ partner_licenses ============
CREATE TABLE IF NOT EXISTS public.partner_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.partner_license_batches(id) ON DELETE SET NULL,
  status public.partner_license_status NOT NULL DEFAULT 'available',
  consumed_by_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_licenses_partner_status
  ON public.partner_licenses(partner_id, status);
GRANT SELECT ON public.partner_licenses TO authenticated;
GRANT ALL ON public.partner_licenses TO service_role;
ALTER TABLE public.partner_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage licenses" ON public.partner_licenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "partner reads own licenses" ON public.partner_licenses
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- ============ partner_invites ============
CREATE TABLE IF NOT EXISTS public.partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partner_invites TO service_role;
ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage partner invites" ON public.partner_invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ stores: partner ownership ============
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS owned_by_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_partner_build boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_handover_status public.store_handover_status;

CREATE INDEX IF NOT EXISTS idx_stores_owned_by_partner
  ON public.stores(owned_by_partner_id) WHERE owned_by_partner_id IS NOT NULL;

-- Allow partner full management of stores they built (while still in build mode)
CREATE POLICY "partner manages built stores" ON public.stores
  FOR ALL TO authenticated
  USING (
    is_partner_build = true
    AND owned_by_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  )
  WITH CHECK (
    is_partner_build = true
    AND owned_by_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- ============ store_handovers ============
CREATE TABLE IF NOT EXISTS public.store_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  client_email text NOT NULL,
  plan text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'annual',
  token_hash text NOT NULL UNIQUE,
  status public.store_handover_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  paid_at timestamptz,
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.store_handovers TO authenticated;
GRANT ALL ON public.store_handovers TO service_role;
ALTER TABLE public.store_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage handovers" ON public.store_handovers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "partner manages own handovers" ON public.store_handovers
  FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE TRIGGER trg_store_handovers_updated_at
  BEFORE UPDATE ON public.store_handovers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RPC: consume_partner_license ============
CREATE OR REPLACE FUNCTION public.consume_partner_license(_partner_id uuid, _store_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lic_id uuid;
  is_owner boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.partners WHERE id = _partner_id AND user_id = auth.uid())
    INTO is_owner;
  IF NOT is_owner AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.partner_licenses
     SET status='consumed',
         consumed_by_store_id = _store_id,
         consumed_at = now()
   WHERE id = (
     SELECT id FROM public.partner_licenses
      WHERE partner_id = _partner_id AND status='available'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
   RETURNING id INTO lic_id;

  IF lic_id IS NULL THEN
    RAISE EXCEPTION 'No available licenses';
  END IF;
  RETURN lic_id;
END;
$$;

-- ============ RPC: partner_license_summary ============
CREATE OR REPLACE FUNCTION public.partner_license_summary(_partner_id uuid)
RETURNS TABLE(total integer, available integer, consumed integer, revoked integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE status='available')::int,
    COUNT(*) FILTER (WHERE status='consumed')::int,
    COUNT(*) FILTER (WHERE status='revoked')::int
  FROM public.partner_licenses
  WHERE partner_id = _partner_id;
$$;

-- ============ Trigger: after batch insert, generate license rows ============
CREATE OR REPLACE FUNCTION public.generate_licenses_for_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.partner_licenses(partner_id, batch_id, status)
  SELECT NEW.partner_id, NEW.id, 'available'
  FROM generate_series(1, NEW.qty);

  UPDATE public.partners
     SET total_licenses_purchased = total_licenses_purchased + NEW.qty,
         total_amount_paid = total_amount_paid + NEW.total_inr,
         license_price_per_unit = NEW.unit_price_inr
   WHERE id = NEW.partner_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_licenses_for_batch ON public.partner_license_batches;
CREATE TRIGGER trg_generate_licenses_for_batch
  AFTER INSERT ON public.partner_license_batches
  FOR EACH ROW EXECUTE FUNCTION public.generate_licenses_for_batch();
