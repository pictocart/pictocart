-- Migration: Starter, Growth, and Scale partner license updates

-- Drop old functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.allocate_partner_licenses(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.allocate_partner_licenses(UUID, INT, INT, INT);
DROP FUNCTION IF EXISTS public.apply_partner_license_key(UUID, TEXT);

-- Remove old check constraints if they exist
ALTER TABLE public.partner_licenses DROP CONSTRAINT IF EXISTS partner_licenses_license_type_check;
ALTER TABLE public.partner_license_batches DROP CONSTRAINT IF EXISTS partner_license_batches_license_type_check;

-- Add updated check constraints supporting only starter, growth, scale
ALTER TABLE public.partner_licenses ADD CONSTRAINT partner_licenses_license_type_check 
  CHECK (license_type IN ('starter', 'growth', 'scale'));

ALTER TABLE public.partner_license_batches ADD CONSTRAINT partner_license_batches_license_type_check 
  CHECK (license_type IN ('starter', 'growth', 'scale'));

-- Redefine allocate_partner_licenses to support Starter, Growth, Scale
CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(
  _partner_id UUID, 
  _qty_starter INT, 
  _qty_growth INT,
  _qty_scale INT
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

  -- Insert scale licenses
  FOR i IN 1.._qty_scale LOOP
    LOOP
      random_part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
      l_key := p_code || '-SCALE-' || random_part;
      BEGIN
        INSERT INTO public.partner_licenses (partner_id, status, license_type, license_key)
        VALUES (_partner_id, 'available', 'scale', l_key);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Loop and try again
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine apply_partner_license_key
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
  -- Lookup license details
  SELECT id, partner_id, license_type, status INTO lic_id, lic_partner_id, lic_type, lic_status
  FROM public.partner_licenses
  WHERE license_key = _key;

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
  IF lic_type = 'scale' THEN
    target_plan := 'scale';
  ELSIF lic_type = 'growth' THEN
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

  INSERT INTO public.subscriptions (store_id, plan, status)
  VALUES (_store_id, target_plan, 'active')
  ON CONFLICT (store_id) 
  DO UPDATE SET plan = EXCLUDED.plan, status = EXCLUDED.status, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine generate_licenses_for_batch
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
  IF NEW.license_type = 'scale' THEN
    prefix := '-SCALE-';
  ELSIF NEW.license_type = 'growth' THEN
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

-- Reset and re-allocate 10 Starter, 5 Growth, and 2 Scale licenses to all partners
DO $$
DECLARE
  p RECORD;
BEGIN
  DELETE FROM public.partner_licenses;
  DELETE FROM public.partner_license_batches;
  
  FOR p IN SELECT id FROM public.partners LOOP
    PERFORM public.allocate_partner_licenses(p.id, 10, 5, 2);
  END LOOP;
END $$;
