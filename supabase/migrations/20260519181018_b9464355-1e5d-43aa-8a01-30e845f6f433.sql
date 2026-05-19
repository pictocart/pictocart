
-- Backfill: stores that have QR codes but no fulfillment settings → create default with dine_in enabled
INSERT INTO public.store_fulfillment_settings (store_id, dine_in_enabled, takeaway_enabled, delivery_enabled, dine_in_requires_table)
SELECT DISTINCT q.store_id, true, false, true, true
FROM public.store_qr_codes q
LEFT JOIN public.store_fulfillment_settings f ON f.store_id = q.store_id
WHERE f.store_id IS NULL;

-- Backfill: stores that have QR codes AND a settings row but dine_in is off → turn it on
UPDATE public.store_fulfillment_settings f
SET dine_in_enabled = true
FROM public.store_qr_codes q
WHERE q.store_id = f.store_id
  AND COALESCE(f.dine_in_enabled, false) = false;

-- Trigger to auto-enable dine-in when a QR code is added
CREATE OR REPLACE FUNCTION public.ensure_dine_in_enabled_for_qr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_fulfillment_settings (store_id, dine_in_enabled, takeaway_enabled, delivery_enabled, dine_in_requires_table)
  VALUES (NEW.store_id, true, false, true, true)
  ON CONFLICT (store_id) DO UPDATE
    SET dine_in_enabled = true
    WHERE store_fulfillment_settings.dine_in_enabled = false OR store_fulfillment_settings.dine_in_enabled IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_dine_in_on_qr ON public.store_qr_codes;
CREATE TRIGGER trg_ensure_dine_in_on_qr
AFTER INSERT ON public.store_qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.ensure_dine_in_enabled_for_qr();
