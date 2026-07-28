-- Replace ON CONFLICT upsert with safe IF EXISTS verification to work on any schema constraint configuration
CREATE OR REPLACE FUNCTION public.ensure_dine_in_enabled_for_qr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.store_fulfillment_settings WHERE store_id = NEW.store_id) THEN
    UPDATE public.store_fulfillment_settings
    SET dine_in_enabled = true
    WHERE store_id = NEW.store_id
      AND (dine_in_enabled = false OR dine_in_enabled IS NULL);
  ELSE
    INSERT INTO public.store_fulfillment_settings (store_id, dine_in_enabled, takeaway_enabled, delivery_enabled, dine_in_requires_table)
    VALUES (NEW.store_id, true, false, true, true);
  END IF;
  RETURN NEW;
END;
$$;
