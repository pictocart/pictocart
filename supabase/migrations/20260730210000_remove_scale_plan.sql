-- Migration: Remove scale plan from database constraints, configs and functions

-- 1. Update any existing subscriptions on scale to growth
UPDATE public.subscriptions 
SET plan = 'growth'::subscription_plan 
WHERE plan = 'scale';

-- 2. Update any existing partner licenses on scale to growth
UPDATE public.partner_licenses 
SET license_type = 'growth' 
WHERE license_type = 'scale';

-- 3. Update any partner license batches on scale to growth
UPDATE public.partner_license_batches 
SET license_type = 'growth' 
WHERE license_type = 'scale';

-- 4. Delete the scale plan configuration
DELETE FROM public.plan_configs 
WHERE plan = 'scale';

-- 5. Drop old constraints on partner_licenses and partner_license_batches
ALTER TABLE public.partner_licenses DROP CONSTRAINT IF EXISTS partner_licenses_license_type_check;
ALTER TABLE public.partner_license_batches DROP CONSTRAINT IF EXISTS partner_license_batches_license_type_check;

-- 6. Add updated constraints allowing only starter and growth
ALTER TABLE public.partner_licenses ADD CONSTRAINT partner_licenses_license_type_check 
  CHECK (license_type IN ('starter', 'growth'));

ALTER TABLE public.partner_license_batches ADD CONSTRAINT partner_license_batches_license_type_check 
  CHECK (license_type IN ('starter', 'growth'));

-- 7. Drop and recreate allocate_partner_licenses function with 3 parameters
DROP FUNCTION IF EXISTS public.allocate_partner_licenses(UUID, INT, INT, INT);
DROP FUNCTION IF EXISTS public.allocate_partner_licenses(UUID, INT, INT);

CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(
  _partner_id UUID, 
  _qty_starter INT, 
  _qty_growth INT
)
RETURNS void AS $$
DECLARE
  p_code TEXT;
  i INT;
  l_key TEXT;
  random_part TEXT;
BEGIN
  -- Get partner code
  SELECT partner_id_code INTO p_code FROM public.partners WHERE id = _partner_id;
  IF p_code IS NULL OR p_code = '' THEN
    p_code := 'pcc' || substring(md5(random()::text) from 1 for 4);
  END IF;

  -- Insert starter licenses
  FOR i IN 1.._qty_starter LOOP
    LOOP
      random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
      l_key := p_code || '-START-' || random_part;
      BEGIN
        INSERT INTO public.partner_licenses (partner_id, status, license_type, license_key)
        VALUES (_partner_id, 'available', 'starter', l_key);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Loop and try again
      END;
    END LOOP;
  END LOOP;

  -- Insert growth licenses
  FOR i IN 1.._qty_growth LOOP
    LOOP
      random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
      l_key := p_code || '-GROW-' || random_part;
      BEGIN
        INSERT INTO public.partner_licenses (partner_id, status, license_type, license_key)
        VALUES (_partner_id, 'available', 'growth', l_key);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Loop and try again
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Redefine apply_partner_license_key
CREATE OR REPLACE FUNCTION public.apply_partner_license_key(_store_id UUID, _key TEXT)
RETURNS void AS $$
DECLARE
  lic_id UUID;
  lic_partner_id UUID;
  lic_type TEXT;
  lic_status TEXT;
  p_ref_code TEXT;
  target_plan TEXT;
BEGIN
  -- Lookup license details case-insensitively
  SELECT id, partner_id, license_type, status INTO lic_id, lic_partner_id, lic_type, lic_status
  FROM public.partner_licenses
  WHERE LOWER(license_key) = LOWER(_key);

  IF lic_id IS NULL THEN
    RAISE EXCEPTION 'Invalid license key';
  END IF;

  IF lic_status <> 'available' THEN
    RAISE EXCEPTION 'License is already consumed or revoked';
  END IF;

  -- Get partner's referral code
  SELECT referral_code INTO p_ref_code FROM public.partners WHERE id = lic_partner_id;

  -- Update license status to consumed
  UPDATE public.partner_licenses
  SET status = 'consumed',
      consumed_by_store_id = _store_id,
      consumed_at = now()
  WHERE id = lic_id;

  -- Determine target plan based on license type
  IF lic_type = 'growth' THEN
    target_plan := 'growth';
  ELSE
    target_plan := 'starter';
  END IF;

  -- Update store plan and link partner
  UPDATE public.stores
  SET owned_by_partner_id = lic_partner_id,
      referred_by_code = p_ref_code,
      is_partner_build = true
  WHERE id = _store_id;

  INSERT INTO public.subscriptions (store_id, plan, status, current_period_end)
  VALUES (_store_id, target_plan::subscription_plan, 'active', now() + interval '30 days')
  ON CONFLICT (store_id) 
  DO UPDATE SET plan = EXCLUDED.plan, status = EXCLUDED.status, current_period_end = EXCLUDED.current_period_end, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Redefine generate_licenses_for_batch
CREATE OR REPLACE FUNCTION public.generate_licenses_for_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_code TEXT;
  i INT;
  l_key TEXT;
  random_part TEXT;
  prefix TEXT;
BEGIN
  -- Get partner code
  SELECT partner_id_code INTO p_code FROM public.partners WHERE id = NEW.partner_id;
  IF p_code IS NULL OR p_code = '' THEN
    p_code := 'pcc' || substring(md5(random()::text) from 1 for 4);
  END IF;

  -- Set prefix based on license type
  IF NEW.license_type = 'growth' THEN
    prefix := '-GROW-';
  ELSE
    prefix := '-START-';
  END IF;

  FOR i IN 1..NEW.qty LOOP
    LOOP
      random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
      l_key := p_code || prefix || random_part;
      BEGIN
        INSERT INTO public.partner_licenses(partner_id, batch_id, status, license_type, license_key)
        VALUES (NEW.partner_id, NEW.id, 'available', NEW.license_type, l_key);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Loop and try again
      END;
    END LOOP;
  END LOOP;

  UPDATE public.partners
     SET total_licenses_purchased = total_licenses_purchased + NEW.qty,
         total_amount_paid = total_amount_paid + NEW.total_inr,
         license_price_per_unit = NEW.unit_price_inr
   WHERE id = NEW.partner_id;
   
  RETURN NEW;
END;
$$;

-- 10. Reset and re-allocate 10 Starter and 5 Growth licenses to all partners (ignoring Scale)
DO $$
DECLARE
  p RECORD;
BEGIN
  DELETE FROM public.partner_licenses;
  DELETE FROM public.partner_license_batches;
  
  FOR p IN SELECT id FROM public.partners LOOP
    PERFORM public.allocate_partner_licenses(p.id, 10, 5);
  END LOOP;
END $$;
