-- Migration: Case-insensitive partner license key lookup

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
