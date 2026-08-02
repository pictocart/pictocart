-- Redefine all signature overrides of allocate_partner_licenses as no-ops to completely disable automatic default licenses allocation on partner creation.

CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(
  _partner_id UUID
)
RETURNS void AS $$
BEGIN
  -- No-op: Disable automatic default license allocation
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(
  _partner_id UUID,
  _qty_basic INT,
  _qty_premium INT
)
RETURNS void AS $$
BEGIN
  -- No-op: Disable automatic default license allocation
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.allocate_partner_licenses(
  _partner_id UUID,
  _qty_starter INT,
  _qty_growth INT,
  _qty_scale INT
)
RETURNS void AS $$
BEGIN
  -- No-op: Disable automatic default license allocation
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
