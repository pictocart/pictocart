-- Create trigger to force new partner registrations to start in 'suspended' status by default

CREATE OR REPLACE FUNCTION public.force_partner_suspended_on_create()
RETURNS trigger AS $$
BEGIN
  NEW.invite_status := 'suspended'::partner_invite_status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_force_partner_suspended_on_create ON public.partners;
CREATE TRIGGER trg_force_partner_suspended_on_create
  BEFORE INSERT ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.force_partner_suspended_on_create();
