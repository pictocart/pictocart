-- Migration: Update default partner license allocation to 10 Starter licenses costing 600 INR each

-- 1. Drop old signatures of allocate_partner_licenses
DROP FUNCTION IF EXISTS public.allocate_partner_licenses(UUID, INT, INT, INT);
DROP FUNCTION IF EXISTS public.allocate_partner_licenses(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.allocate_partner_licenses(UUID);

-- 2. Define allocate_partner_licenses with only _partner_id
CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(
  _partner_id UUID
)
RETURNS void AS $$
BEGIN
  -- Insert default starter batch of 10 licenses costing ₹600 each (total ₹6000)
  -- The trigger trg_generate_licenses_for_batch will automatically run generate_licenses_for_batch()
  -- which will insert the licenses and update the partner statistics (total_licenses_purchased, total_amount_paid, license_price_per_unit)
  INSERT INTO public.partner_license_batches (partner_id, qty, license_type, unit_price_inr, total_inr, notes)
  VALUES (_partner_id, 10, 'starter', 600.00, 6000.00, 'Default signup package');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reset and re-allocate default licenses to all existing partners
DO $$
DECLARE
  p RECORD;
BEGIN
  -- Clear all existing licenses and batches
  DELETE FROM public.partner_licenses;
  DELETE FROM public.partner_license_batches;
  
  -- Reset partners statistics to 0 before allocation
  UPDATE public.partners 
  SET total_licenses_purchased = 0,
      total_amount_paid = 0,
      license_price_per_unit = 0;
  
  -- Re-allocate the new defaults (10 Starter licenses costing ₹6000 total)
  FOR p IN SELECT id FROM public.partners LOOP
    PERFORM public.allocate_partner_licenses(p.id);
  END LOOP;
END $$;
