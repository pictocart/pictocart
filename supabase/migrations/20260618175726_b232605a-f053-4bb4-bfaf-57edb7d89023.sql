-- ============ ENUM tier ============
DO $$ BEGIN
  CREATE TYPE public.partner_tier AS ENUM ('partner','state_head','regional_head');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- ============ EXTEND partners ============
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS tier public.partner_tier NOT NULL DEFAULT 'partner',
  ADD COLUMN IF NOT EXISTS parent_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS region_name text,
  ADD COLUMN IF NOT EXISTS state_name text,
  ADD COLUMN IF NOT EXISTS override_commission_pct numeric(5,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_partners_parent ON public.partners(parent_partner_id) WHERE parent_partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_tier ON public.partners(tier);
-- ============ EXTEND partner_commissions ============
ALTER TABLE public.partner_commissions
  ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'direct'
    CHECK (commission_type IN ('direct','override_state','override_regional')),
  ADD COLUMN IF NOT EXISTS source_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_source ON public.partner_commissions(source_partner_id);
-- ============ Cycle / depth guard ============
CREATE OR REPLACE FUNCTION public.guard_partner_parent_cycle()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  cur uuid := NEW.parent_partner_id;
  depth int := 0;
BEGIN
  IF NEW.parent_partner_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_partner_id = NEW.id THEN
    RAISE EXCEPTION 'Partner cannot be its own parent';
  END IF;
  WHILE cur IS NOT NULL LOOP
    depth := depth + 1;
    IF depth > 5 THEN RAISE EXCEPTION 'Hierarchy too deep'; END IF;
    IF cur = NEW.id THEN RAISE EXCEPTION 'Hierarchy cycle detected'; END IF;
    SELECT parent_partner_id INTO cur FROM public.partners WHERE id = cur;
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_partner_parent_cycle ON public.partners;
CREATE TRIGGER trg_guard_partner_parent_cycle
  BEFORE INSERT OR UPDATE OF parent_partner_id ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.guard_partner_parent_cycle();
-- ============ Downline helper ============
CREATE OR REPLACE FUNCTION public.is_partner_in_downline(_head_user_id uuid, _partner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE chain AS (
    SELECT id, parent_partner_id FROM public.partners WHERE id = _partner_id
    UNION ALL
    SELECT p.id, p.parent_partner_id
      FROM public.partners p JOIN chain c ON p.id = c.parent_partner_id
  )
  SELECT EXISTS (
    SELECT 1 FROM chain c
    JOIN public.partners h ON h.id = c.parent_partner_id
    WHERE h.user_id = _head_user_id
  );
$$;
-- ============ Downline read policies ============
DROP POLICY IF EXISTS "Head reads downline partners" ON public.partners;
CREATE POLICY "Head reads downline partners" ON public.partners
  FOR SELECT TO authenticated
  USING (public.is_partner_in_downline(auth.uid(), id));
DROP POLICY IF EXISTS "Head reads downline commissions" ON public.partner_commissions;
CREATE POLICY "Head reads downline commissions" ON public.partner_commissions
  FOR SELECT TO authenticated
  USING (
    source_partner_id IS NOT NULL
    AND public.is_partner_in_downline(auth.uid(), source_partner_id)
  );
DROP POLICY IF EXISTS "Head reads downline licenses" ON public.partner_licenses;
CREATE POLICY "Head reads downline licenses" ON public.partner_licenses
  FOR SELECT TO authenticated
  USING (public.is_partner_in_downline(auth.uid(), partner_id));
-- ============ RPC: accrue hierarchy commissions ============
CREATE OR REPLACE FUNCTION public.accrue_hierarchy_commissions(
  _partner_id uuid,
  _base_amount numeric,
  _source_kind text,
  _source_ref text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parent_id uuid;
  grand_id uuid;
  parent_tier public.partner_tier;
  grand_tier public.partner_tier;
  parent_pct numeric(5,2);
  grand_pct numeric(5,2);
  pm date := date_trunc('month', now())::date;
BEGIN
  IF _partner_id IS NULL OR COALESCE(_base_amount,0) <= 0 THEN RETURN; END IF;

  SELECT parent_partner_id INTO parent_id FROM public.partners WHERE id = _partner_id;
  IF parent_id IS NULL THEN RETURN; END IF;

  SELECT tier, override_commission_pct INTO parent_tier, parent_pct
    FROM public.partners WHERE id = parent_id;

  IF COALESCE(parent_pct,0) > 0 THEN
    INSERT INTO public.partner_commissions(
      partner_id, period_month, base_amount, commission_amount, status,
      commission_type, source_partner_id, source_kind, source_ref, commission_rate
    ) VALUES (
      parent_id, pm, _base_amount,
      ROUND(_base_amount * parent_pct / 100.0, 2),
      'pending',
      CASE WHEN parent_tier = 'regional_head' THEN 'override_regional' ELSE 'override_state' END,
      _partner_id, _source_kind, _source_ref, parent_pct
    );
  END IF;

  SELECT parent_partner_id INTO grand_id FROM public.partners WHERE id = parent_id;
  IF grand_id IS NULL THEN RETURN; END IF;

  SELECT tier, override_commission_pct INTO grand_tier, grand_pct
    FROM public.partners WHERE id = grand_id;

  IF COALESCE(grand_pct,0) > 0 THEN
    INSERT INTO public.partner_commissions(
      partner_id, period_month, base_amount, commission_amount, status,
      commission_type, source_partner_id, source_kind, source_ref, commission_rate
    ) VALUES (
      grand_id, pm, _base_amount,
      ROUND(_base_amount * grand_pct / 100.0, 2),
      'pending',
      CASE WHEN grand_tier = 'regional_head' THEN 'override_regional' ELSE 'override_state' END,
      _partner_id, _source_kind, _source_ref, grand_pct
    );
  END IF;
END;
$$;
-- ============ Hook license batch trigger ============
CREATE OR REPLACE FUNCTION public.generate_licenses_for_batch()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.partner_licenses(partner_id, batch_id, status)
  SELECT NEW.partner_id, NEW.id, 'available'
  FROM generate_series(1, NEW.qty);

  UPDATE public.partners
     SET total_licenses_purchased = total_licenses_purchased + NEW.qty,
         total_amount_paid = total_amount_paid + NEW.total_inr,
         license_price_per_unit = NEW.unit_price_inr
   WHERE id = NEW.partner_id;

  PERFORM public.accrue_hierarchy_commissions(
    NEW.partner_id, NEW.total_inr, 'license_batch', NEW.id::text
  );
  RETURN NEW;
END;
$$;
-- ============ RPC: promote partner ============
CREATE OR REPLACE FUNCTION public.admin_promote_partner(
  _partner_id uuid,
  _tier text,
  _override_pct numeric,
  _region_name text DEFAULT NULL,
  _state_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.partners
     SET tier = _tier::public.partner_tier,
         override_commission_pct = COALESCE(_override_pct, 0),
         region_name = COALESCE(_region_name, region_name),
         state_name = COALESCE(_state_name, state_name)
   WHERE id = _partner_id;
END;
$$;
-- ============ RPC: assign parent ============
CREATE OR REPLACE FUNCTION public.admin_assign_partner_parent(
  _partner_id uuid,
  _parent_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.partners SET parent_partner_id = _parent_id WHERE id = _partner_id;
END;
$$;
-- ============ RPC: head dashboard summary ============
CREATE OR REPLACE FUNCTION public.head_downline_summary(_head_partner_id uuid)
RETURNS TABLE(
  downline_count integer,
  licenses_sold integer,
  gmv numeric,
  override_lifetime numeric,
  override_this_month numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.partners
     WHERE id = _head_partner_id AND user_id = auth.uid()
  ) AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH RECURSIVE down AS (
    SELECT id FROM public.partners WHERE parent_partner_id = _head_partner_id
    UNION ALL
    SELECT p.id FROM public.partners p JOIN down d ON p.parent_partner_id = d.id
  )
  SELECT
    (SELECT COUNT(*)::int FROM down),
    COALESCE((SELECT SUM(total_licenses_purchased)::int FROM public.partners WHERE id IN (SELECT id FROM down)), 0),
    COALESCE((SELECT SUM(total_amount_paid) FROM public.partners WHERE id IN (SELECT id FROM down)), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions
              WHERE partner_id = _head_partner_id AND commission_type <> 'direct'), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions
              WHERE partner_id = _head_partner_id AND commission_type <> 'direct'
                AND period_month = date_trunc('month', now())::date), 0);
END;
$$;
