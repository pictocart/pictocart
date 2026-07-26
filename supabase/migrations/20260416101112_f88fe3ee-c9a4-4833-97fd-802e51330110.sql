CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  item jsonb;
  qty int;
  pid uuid;
BEGIN
  FOR item IN SELECT jsonb_array_elements(NEW.items)
  LOOP
    pid := (item->>'product_id')::uuid;
    qty := COALESCE((item->>'quantity')::int, 1);
    UPDATE public.products
    SET inventory_count = GREATEST(inventory_count - qty, 0)
    WHERE id = pid;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_deduct_inventory
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_inventory_on_order();
