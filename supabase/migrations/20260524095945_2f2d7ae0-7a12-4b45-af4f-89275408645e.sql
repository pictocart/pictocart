-- 1. Appointments: travel + en_route
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS travel_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS en_route_at timestamptz,
  ADD COLUMN IF NOT EXISTS package_balance_id uuid;
-- 2. Services: explicit home_visit flag
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS home_visit_enabled boolean DEFAULT false;
-- 3. Providers: home-visit zone
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS home_visit_pincodes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS home_visit_radius_km numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_base_lat numeric,
  ADD COLUMN IF NOT EXISTS home_base_lng numeric,
  ADD COLUMN IF NOT EXISTS rating_avg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0;
-- 4. Service Packages
CREATE TABLE IF NOT EXISTS public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  included_service_ids uuid[] DEFAULT '{}',
  total_visits integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  validity_days integer DEFAULT 365,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage packages" ON public.service_packages
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public reads active packages" ON public.service_packages FOR SELECT
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true));
CREATE TABLE IF NOT EXISTS public.customer_package_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  customer_id uuid,
  customer_user_id uuid,
  customer_phone text,
  visits_left integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_package_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage balances" ON public.customer_package_balances
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customer reads own balance" ON public.customer_package_balances FOR SELECT
  USING (customer_user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_pkg_bal_customer ON public.customer_package_balances(customer_user_id, store_id);
-- 5. Provider commissions
CREATE TABLE IF NOT EXISTS public.provider_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  base_amount numeric NOT NULL DEFAULT 0,
  commission_pct numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage commissions" ON public.provider_commissions
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_provcom_store ON public.provider_commissions(store_id, payout_status);
CREATE INDEX IF NOT EXISTS idx_provcom_prov ON public.provider_commissions(provider_id, created_at DESC);
-- 6. Reviews link to appointment / provider
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS appointment_id uuid,
  ADD COLUMN IF NOT EXISTS provider_id uuid;
-- 7. Trigger: accrue commission on completion
CREATE OR REPLACE FUNCTION public.accrue_appointment_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pct numeric;
  base numeric;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.provider_id IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.provider_commissions WHERE appointment_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    SELECT COALESCE(commission_pct, 0) INTO pct FROM public.service_providers WHERE id = NEW.provider_id;
    IF pct IS NULL OR pct <= 0 THEN RETURN NEW; END IF;
    base := COALESCE(NEW.price, 0);
    INSERT INTO public.provider_commissions(store_id, provider_id, appointment_id, base_amount, commission_pct, amount)
    VALUES (NEW.store_id, NEW.provider_id, NEW.id, base, pct, ROUND(base * pct / 100.0, 2));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_accrue_appt_commission ON public.appointments;
CREATE TRIGGER trg_accrue_appt_commission
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.accrue_appointment_commission();
-- 8. Public RLS for storefront booking
DROP POLICY IF EXISTS "Public reads active providers" ON public.service_providers;
CREATE POLICY "Public reads active providers" ON public.service_providers FOR SELECT
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true));
DROP POLICY IF EXISTS "Public reads provider schedules" ON public.provider_schedules;
CREATE POLICY "Public reads provider schedules" ON public.provider_schedules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.service_providers p JOIN public.stores s ON s.id = p.store_id
                 WHERE p.id = provider_id AND p.is_active = true AND s.is_published = true));
DROP POLICY IF EXISTS "Public reads active family plans" ON public.family_plans;
CREATE POLICY "Public reads active family plans" ON public.family_plans FOR SELECT
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true));
-- 9. Allow public to create appointments (storefront booking)
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
CREATE POLICY "Public can create appointments" ON public.appointments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true));
DROP POLICY IF EXISTS "Customer reads own appointments" ON public.appointments;
CREATE POLICY "Customer reads own appointments" ON public.appointments FOR SELECT
  USING (customer_user_id = auth.uid());
-- 10. Family plan slots-left helper
CREATE OR REPLACE FUNCTION public.family_plan_slots_left(_plan_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(COALESCE((SELECT max_families FROM public.family_plans WHERE id = _plan_id), 0)
         - COALESCE((SELECT COUNT(*) FROM public.family_groups WHERE plan_id = _plan_id), 0), 0)::integer;
$$;
