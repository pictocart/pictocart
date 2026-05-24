
-- =====================================================================
-- Service Industry Phase A: Appointments Engine + Family Plans
-- =====================================================================

-- New roles
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'front_desk';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacist';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.appointment_mode AS ENUM ('in_store','home_visit','teleconsult');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM (
    'pending','confirmed','en_route','in_progress','completed','cancelled','no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.family_plan_status AS ENUM ('active','expired','cancelled','waitlist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- service_providers
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  role_label TEXT,
  photo_url TEXT,
  specialization TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  languages TEXT[] DEFAULT '{}',
  gender TEXT,
  bio TEXT,
  commission_pct NUMERIC DEFAULT 0,
  accepts_home_visit BOOLEAN DEFAULT false,
  accepts_teleconsult BOOLEAN DEFAULT false,
  registration_number TEXT,
  max_families_cap INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_providers_store ON public.service_providers(store_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_user ON public.service_providers(user_id);
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage providers"
ON public.service_providers FOR ALL
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Provider sees self"
ON public.service_providers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Provider updates self"
ON public.service_providers FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Public reads active providers of published store"
ON public.service_providers FOR SELECT
USING (is_active = true AND EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true
));

CREATE TRIGGER trg_service_providers_updated
BEFORE UPDATE ON public.service_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- services
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  duration_min INTEGER NOT NULL DEFAULT 30,
  price NUMERIC NOT NULL DEFAULT 0,
  deposit_pct NUMERIC DEFAULT 0,
  gst_pct NUMERIC DEFAULT 0,
  requires_room BOOLEAN DEFAULT false,
  max_parallel INTEGER DEFAULT 1,
  allowed_provider_ids UUID[] DEFAULT '{}',
  home_visit_addon NUMERIC DEFAULT 0,
  teleconsult_enabled BOOLEAN DEFAULT false,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_services_store ON public.services(store_id);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage services"
ON public.services FOR ALL
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads active services of published store"
ON public.services FOR SELECT
USING (is_active = true AND EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true
));

CREATE TRIGGER trg_services_updated
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- provider_schedules
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.provider_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  weekday SMALLINT,                 -- 0=Sun..6=Sat ; NULL when override_date is set
  start_time TIME,
  end_time TIME,
  override_date DATE,               -- one-off override / leave
  is_off BOOLEAN DEFAULT false,
  slot_buffer_min INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_provider_schedules_provider ON public.provider_schedules(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_schedules_date ON public.provider_schedules(override_date);
ALTER TABLE public.provider_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage schedules"
ON public.provider_schedules FOR ALL
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Provider manages own schedule"
ON public.provider_schedules FOR ALL
USING (EXISTS (SELECT 1 FROM public.service_providers p WHERE p.id = provider_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.service_providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));

CREATE POLICY "Public reads schedules of published store"
ON public.provider_schedules FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true
));

CREATE TRIGGER trg_provider_schedules_updated
BEFORE UPDATE ON public.provider_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- appointments
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  appointment_number TEXT,
  customer_id UUID,
  customer_user_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name_snapshot TEXT,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  mode public.appointment_mode NOT NULL DEFAULT 'in_store',
  status public.appointment_status NOT NULL DEFAULT 'pending',
  address JSONB,
  price NUMERIC DEFAULT 0,
  gst NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  payment_mode TEXT,
  order_id UUID,
  family_group_id UUID,
  notes_customer TEXT,
  notes_internal TEXT,
  special_request TEXT,
  before_photos TEXT[] DEFAULT '{}',
  after_photos TEXT[] DEFAULT '{}',
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointments_store ON public.appointments(store_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_slot ON public.appointments(provider_id, slot_start);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage appointments"
ON public.appointments FOR ALL
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Provider sees own appointments"
ON public.appointments FOR SELECT
USING (EXISTS (SELECT 1 FROM public.service_providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));

CREATE POLICY "Provider updates own appointments"
ON public.appointments FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.service_providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));

CREATE POLICY "Customer reads own appointments"
ON public.appointments FOR SELECT
USING (customer_user_id = auth.uid());

CREATE POLICY "Public can create appointment for published store"
ON public.appointments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true
));

CREATE POLICY "Customer cancels own appointment"
ON public.appointments FOR UPDATE
USING (customer_user_id = auth.uid());

CREATE TRIGGER trg_appointments_updated
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- family_plans
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.family_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  monthly_fee NUMERIC DEFAULT 0,
  yearly_fee NUMERIC DEFAULT 0,
  max_families INTEGER DEFAULT 0,
  max_members_per_family INTEGER DEFAULT 6,
  discount_pct NUMERIC DEFAULT 0,
  free_visits_per_year INTEGER DEFAULT 0,
  included_service_ids UUID[] DEFAULT '{}',
  home_visit_included BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_family_plans_store ON public.family_plans(store_id);
ALTER TABLE public.family_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage family plans"
ON public.family_plans FOR ALL
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads active family plans of published store"
ON public.family_plans FOR SELECT
USING (is_active = true AND EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_published = true
));

CREATE TRIGGER trg_family_plans_updated
BEFORE UPDATE ON public.family_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- family_groups
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.family_plans(id) ON DELETE SET NULL,
  head_customer_id UUID,
  head_user_id UUID,
  family_name TEXT NOT NULL,
  status public.family_plan_status NOT NULL DEFAULT 'active',
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  free_visits_used INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_family_groups_store ON public.family_groups(store_id);
CREATE INDEX IF NOT EXISTS idx_family_groups_head ON public.family_groups(head_user_id);
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage family groups"
ON public.family_groups FOR ALL
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Head customer reads own family"
ON public.family_groups FOR SELECT
USING (head_user_id = auth.uid());

CREATE TRIGGER trg_family_groups_updated
BEFORE UPDATE ON public.family_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- family_members
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  customer_id UUID,
  name TEXT NOT NULL,
  relation TEXT,
  dob DATE,
  gender TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_family_members_group ON public.family_members(group_id);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage family members"
ON public.family_members FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.family_groups g
  JOIN public.stores s ON s.id = g.store_id
  WHERE g.id = group_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.family_groups g
  JOIN public.stores s ON s.id = g.store_id
  WHERE g.id = group_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Head customer reads members of own family"
ON public.family_members FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.family_groups g WHERE g.id = group_id AND g.head_user_id = auth.uid()
));
