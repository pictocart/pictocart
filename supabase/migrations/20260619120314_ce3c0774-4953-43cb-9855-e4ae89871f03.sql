
-- 1) Restrict sensitive supplier columns on sourcing_suppliers and sourcing_products
-- so they cannot be read by anon or authenticated roles via the Data API.
REVOKE SELECT (bank_account_number, bank_ifsc, bank_account_name, gstin, email, phone, whatsapp)
  ON public.sourcing_suppliers FROM anon, authenticated;

REVOKE SELECT (supplier_phone_full, supplier_email_full)
  ON public.sourcing_products FROM anon, authenticated;

-- 2) Remove the head-reads-downline RLS policy on partners that exposed every column
-- (including PAN, bank, UPI, email, phone) of downline partners to head partners.
DROP POLICY IF EXISTS "Head reads downline partners" ON public.partners;

-- 3) Provide a SECURITY DEFINER function for heads to list their downline with
-- only non-sensitive columns. Admins can also use it.
CREATE OR REPLACE FUNCTION public.head_downline_partners(_head_partner_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email_masked text,
  tier public.partner_tier,
  partner_type text,
  invite_status text,
  total_licenses_purchased integer,
  total_amount_paid numeric,
  state_name text,
  region_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.partners WHERE id = _head_partner_id AND user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH RECURSIVE down AS (
    SELECT p.id FROM public.partners p WHERE p.parent_partner_id = _head_partner_id
    UNION ALL
    SELECT c.id FROM public.partners c JOIN down d ON c.parent_partner_id = d.id
  )
  SELECT
    p.id,
    p.name,
    -- mask email: keep first 2 chars + domain
    CASE
      WHEN p.email IS NULL OR position('@' in p.email) = 0 THEN NULL
      ELSE substring(p.email from 1 for 2) || '***@' || split_part(p.email, '@', 2)
    END AS email_masked,
    p.tier,
    p.partner_type,
    p.invite_status,
    p.total_licenses_purchased,
    p.total_amount_paid,
    p.state_name,
    p.region_name,
    p.created_at
  FROM public.partners p
  WHERE p.id IN (SELECT id FROM down)
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.head_downline_partners(uuid) TO authenticated;

-- 4) Enable RLS on realtime.messages with a default-deny policy so authenticated
-- users cannot subscribe to arbitrary channel topics. Specific app channels that
-- need broadcast access can be opened up with targeted policies later.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_realtime_messages" ON realtime.messages;
CREATE POLICY "deny_all_realtime_messages"
  ON realtime.messages
  FOR SELECT
  TO authenticated, anon
  USING (false);
