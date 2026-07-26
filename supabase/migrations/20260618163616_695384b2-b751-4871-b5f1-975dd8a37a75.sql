CREATE OR REPLACE FUNCTION public.transfer_store_to_client(_store_id uuid, _client_user_id uuid, _handover_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  SELECT partner_id INTO v_partner_id FROM public.store_handovers WHERE id = _handover_id;
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Handover not found';
  END IF;

  UPDATE public.stores
     SET user_id = _client_user_id,
         partner_handover_status = 'accepted'
   WHERE id = _store_id
     AND owned_by_partner_id = v_partner_id;

  UPDATE public.store_handovers
     SET status = 'accepted',
         accepted_at = now()
   WHERE id = _handover_id;
END;
$$;
REVOKE ALL ON FUNCTION public.transfer_store_to_client(uuid, uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.transfer_store_to_client(uuid, uuid, uuid) TO service_role;
-- Allow partner to insert a stub store owned by themselves during build mode
DROP POLICY IF EXISTS "partner inserts own build store" ON public.stores;
CREATE POLICY "partner inserts own build store" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (
    owned_by_partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );
