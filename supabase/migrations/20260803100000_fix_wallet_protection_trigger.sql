-- Fix protect_wallet_balance trigger function to permit updates executing from system triggers/functions (SECURITY DEFINER contexts)
CREATE OR REPLACE FUNCTION public.protect_wallet_balance()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.balance IS DISTINCT FROM NEW.balance OR
       OLD.lifetime_purchased IS DISTINCT FROM NEW.lifetime_purchased OR
       OLD.lifetime_used IS DISTINCT FROM NEW.lifetime_used OR
       OLD.welcome_grant_given IS DISTINCT FROM NEW.welcome_grant_given THEN
      
      -- Only service_role, admin, or system superusers (postgres/supabase_admin) can update these fields
      IF NOT (has_role(auth.uid(), 'admin'::app_role)) 
         AND (auth.role() <> 'service_role') 
         AND (CURRENT_USER NOT IN ('postgres', 'supabase_admin', 'service_role')) THEN
        NEW.balance := OLD.balance;
        NEW.lifetime_purchased := OLD.lifetime_purchased;
        NEW.lifetime_used := OLD.lifetime_used;
        NEW.welcome_grant_given := OLD.welcome_grant_given;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
