
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  actor text NOT NULL DEFAULT 'System',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id, created_at);

GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their order history"
  ON public.order_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE o.id = order_status_history.order_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Customers can view their own order history"
  ON public.order_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_history.order_id AND o.customer_user_id = auth.uid()
  ));

-- Trigger: log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text;
  v_user uuid;
BEGIN
  v_user := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF v_user IS NOT NULL AND v_user = NEW.customer_user_id THEN
      v_actor := 'Customer';
    ELSIF v_user IS NULL THEN
      v_actor := 'System';
    ELSE
      v_actor := 'Merchant';
    END IF;

    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, actor, note)
    VALUES (NEW.id, NULL, COALESCE(NEW.status::text, 'pending'), v_user, v_actor, 'Order placed');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF v_user IS NULL THEN
      v_actor := 'System';
    ELSIF v_user = NEW.customer_user_id THEN
      v_actor := 'Customer';
    ELSE
      v_actor := 'Merchant';
    END IF;

    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, actor, note)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, v_user, v_actor, NULL);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;
CREATE TRIGGER trg_log_order_status_change
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- Backfill: seed an initial entry for existing orders that have no history yet
INSERT INTO public.order_status_history (order_id, from_status, to_status, actor, note, created_at)
SELECT o.id, NULL, COALESCE(o.status::text, 'pending'), 'Customer', 'Order placed', o.created_at
FROM public.orders o
LEFT JOIN public.order_status_history h ON h.order_id = o.id
WHERE h.id IS NULL;
