
-- 1) Product return/exchange policy fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_exchangeable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS return_window_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS exchange_window_days INTEGER NOT NULL DEFAULT 7;

-- 2) Eligibility RPC
CREATE OR REPLACE FUNCTION public.get_order_eligibility(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o public.orders%ROWTYPE;
  can_cancel boolean := false;
  can_return boolean := false;
  can_exchange boolean := false;
  can_review boolean := false;
  can_invoice boolean := false;
  can_track boolean := false;
  can_buy_again boolean := false;
  return_reason text := NULL;
  exchange_reason text := NULL;
  cancel_reason text := NULL;
  existing_return_id uuid;
  existing_exchange_id uuid;
  first_item jsonb;
  pid uuid;
  prod public.products%ROWTYPE;
  delivered_on timestamptz;
  days_since numeric;
  is_owner boolean := false;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','not_found');
  END IF;

  -- authorization: customer of order, store owner, or admin
  SELECT (o.customer_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = o.store_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  INTO is_owner;
  IF NOT is_owner THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Cancel: pre-shipment, not already cancelled
  IF o.status::text IN ('pending','new','confirmed','processing','packed')
     AND o.status::text NOT IN ('shipped','out_for_delivery','delivered','cancelled','returned') THEN
    can_cancel := true;
  ELSE
    cancel_reason := 'Order has already shipped or been finalized';
  END IF;

  -- Track: after confirmed, before final
  IF o.status::text IN ('confirmed','processing','packed','shipped','out_for_delivery') THEN
    can_track := true;
  END IF;

  -- Invoice
  IF o.payment_status::text = 'paid' THEN
    can_invoice := true;
  END IF;

  -- Post-delivery capabilities
  IF o.status::text = 'delivered' OR o.delivered_at IS NOT NULL THEN
    can_buy_again := true;

    delivered_on := COALESCE(o.delivered_at, o.updated_at);

    -- Load first product (best-effort; per-item eligibility is refined client-side)
    first_item := (SELECT jsonb_array_elements(o.items) LIMIT 1);
    pid := NULLIF(first_item->>'product_id','')::uuid;
    IF pid IS NOT NULL THEN
      SELECT * INTO prod FROM public.products WHERE id = pid;
    END IF;

    -- existing requests
    SELECT id INTO existing_return_id FROM public.returns
      WHERE order_id = _order_id AND request_type = 'return'
        AND status::text NOT IN ('rejected','cancelled')
      LIMIT 1;
    SELECT id INTO existing_exchange_id FROM public.returns
      WHERE order_id = _order_id AND request_type = 'exchange'
        AND status::text NOT IN ('rejected','cancelled')
      LIMIT 1;

    days_since := EXTRACT(EPOCH FROM (now() - delivered_on))/86400.0;

    -- Return
    IF existing_return_id IS NOT NULL THEN
      return_reason := 'Return request already exists';
    ELSIF prod.id IS NOT NULL AND prod.is_returnable = false THEN
      return_reason := 'This product is not returnable';
    ELSIF prod.id IS NOT NULL AND days_since > COALESCE(prod.return_window_days,7) THEN
      return_reason := 'Return window expired';
    ELSIF o.payment_status::text = 'refunded' THEN
      return_reason := 'Order already refunded';
    ELSE
      can_return := true;
    END IF;

    -- Exchange
    IF existing_exchange_id IS NOT NULL THEN
      exchange_reason := 'Exchange request already exists';
    ELSIF prod.id IS NOT NULL AND prod.is_exchangeable = false THEN
      exchange_reason := 'This product is not exchangeable';
    ELSIF prod.id IS NOT NULL AND days_since > COALESCE(prod.exchange_window_days,7) THEN
      exchange_reason := 'Exchange window expired';
    ELSE
      can_exchange := true;
    END IF;

    -- Review: no prior review by this customer for any product in this order
    IF o.customer_user_id IS NOT NULL AND pid IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.reviews r
        WHERE r.product_id = pid AND r.customer_user_id = o.customer_user_id
      ) THEN can_review := true; END IF;
    ELSE
      can_review := true;
    END IF;
  END IF;

  IF o.status::text = 'cancelled' THEN
    can_buy_again := true;
    can_track := false;
  END IF;

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'status', o.status::text,
    'payment_status', o.payment_status::text,
    'delivered_at', o.delivered_at,
    'canCancel', can_cancel,
    'canReturn', can_return,
    'canExchange', can_exchange,
    'canReview', can_review,
    'canDownloadInvoice', can_invoice,
    'canTrack', can_track,
    'canBuyAgain', can_buy_again,
    'cancelReason', cancel_reason,
    'returnReason', return_reason,
    'exchangeReason', exchange_reason,
    'existingReturnId', existing_return_id,
    'existingExchangeId', existing_exchange_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_eligibility(uuid) TO authenticated, anon;

-- 3) Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer manages own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Customer creates own ticket"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Store or customer updates ticket"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (customer_user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_support_tickets_store ON public.support_tickets(store_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON public.support_tickets(customer_user_id, created_at DESC);

-- 4) Ticket messages
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,           -- 'customer' | 'merchant' | 'system'
  sender_user_id UUID,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket parties read messages"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (t.customer_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = t.store_id AND s.user_id = auth.uid())
           OR public.has_role(auth.uid(),'admin'))
  ));

CREATE POLICY "Ticket parties send messages"
  ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (t.customer_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = t.store_id AND s.user_id = auth.uid())
           OR public.has_role(auth.uid(),'admin'))
  ));

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

-- Auto-bump last_message_at
CREATE OR REPLACE FUNCTION public.bump_ticket_last_message()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_tickets
    SET last_message_at = now(), updated_at = now()
    WHERE id = NEW.ticket_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_bump_ticket_last_message
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_ticket_last_message();
