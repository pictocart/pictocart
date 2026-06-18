
-- Bank fields on partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS bank_account_holder text;

-- Payouts metadata
ALTER TABLE public.partner_payouts
  ADD COLUMN IF NOT EXISTS period_month date,
  ADD COLUMN IF NOT EXISTS commission_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_partner_payouts_period ON public.partner_payouts(period_month);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_status ON public.partner_commissions(partner_id, status);

-- =========================================================
-- Admin: pending payouts summary
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_pending_payouts_summary(_period_month date DEFAULT NULL)
RETURNS TABLE(
  partner_id uuid,
  partner_name text,
  partner_email text,
  upi_id text,
  bank_account_number text,
  bank_ifsc text,
  bank_account_holder text,
  pan text,
  tier public.partner_tier,
  commission_count integer,
  pending_amount numeric,
  direct_amount numeric,
  override_amount numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.email,
    p.upi_id,
    p.bank_account_number,
    p.bank_ifsc,
    p.bank_account_holder,
    p.pan,
    p.tier,
    COUNT(pc.id)::int,
    COALESCE(SUM(pc.commission_amount), 0),
    COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.commission_type = 'direct'), 0),
    COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.commission_type <> 'direct'), 0)
  FROM public.partners p
  JOIN public.partner_commissions pc ON pc.partner_id = p.id
  WHERE pc.status IN ('pending','approved')
    AND pc.payout_id IS NULL
    AND (_period_month IS NULL OR pc.period_month <= _period_month)
    AND public.has_role(auth.uid(),'admin')
  GROUP BY p.id
  HAVING COALESCE(SUM(pc.commission_amount), 0) > 0
  ORDER BY COALESCE(SUM(pc.commission_amount), 0) DESC;
$$;

-- =========================================================
-- Admin: generate payout batch for a month
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_run_payout_batch(_period_month date, _method text DEFAULT 'upi')
RETURNS TABLE(payouts_created integer, total_amount numeric)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  payout_id uuid;
  v_count int := 0;
  v_total numeric := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR r IN
    SELECT pc.partner_id, SUM(pc.commission_amount)::numeric AS amt, COUNT(*)::int AS cnt
    FROM public.partner_commissions pc
    WHERE pc.status IN ('pending','approved')
      AND pc.payout_id IS NULL
      AND pc.period_month <= _period_month
    GROUP BY pc.partner_id
    HAVING SUM(pc.commission_amount) > 0
  LOOP
    INSERT INTO public.partner_payouts(
      partner_id, amount, period, period_month, method, status, commission_count, notes
    ) VALUES (
      r.partner_id, r.amt, to_char(_period_month,'YYYY-MM'),
      _period_month, _method, 'initiated', r.cnt,
      'Auto-batch for ' || to_char(_period_month,'YYYY-MM')
    )
    RETURNING id INTO payout_id;

    UPDATE public.partner_commissions
       SET payout_id = payout_id, status = 'approved'
     WHERE partner_id = r.partner_id
       AND status IN ('pending','approved')
       AND payout_id IS NULL
       AND period_month <= _period_month;

    v_count := v_count + 1;
    v_total := v_total + r.amt;
  END LOOP;

  payouts_created := v_count;
  total_amount := v_total;
  RETURN NEXT;
END;
$$;

-- =========================================================
-- Admin: mark payout paid
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(_payout_id uuid, _utr text DEFAULT NULL, _method text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.partner_payouts
     SET status = 'paid',
         paid_at = now(),
         utr = COALESCE(_utr, utr),
         method = COALESCE(_method, method)
   WHERE id = _payout_id;

  UPDATE public.partner_commissions
     SET status = 'paid'
   WHERE payout_id = _payout_id;
END;
$$;

-- =========================================================
-- Partner: own stats
-- =========================================================
CREATE OR REPLACE FUNCTION public.partner_self_stats(_partner_id uuid)
RETURNS TABLE(
  total_licenses int,
  gmv numeric,
  lifetime_commission numeric,
  this_month_commission numeric,
  pending_payout numeric,
  paid_out numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _partner_id AND user_id = auth.uid())
     AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((SELECT total_licenses_purchased FROM public.partners WHERE id = _partner_id), 0)::int,
    COALESCE((SELECT total_amount_paid FROM public.partners WHERE id = _partner_id), 0)::numeric,
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions WHERE partner_id = _partner_id), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions
              WHERE partner_id = _partner_id AND period_month = date_trunc('month',now())::date), 0),
    COALESCE((SELECT SUM(commission_amount) FROM public.partner_commissions
              WHERE partner_id = _partner_id AND status IN ('pending','approved')), 0),
    COALESCE((SELECT SUM(amount) FROM public.partner_payouts
              WHERE partner_id = _partner_id AND status = 'paid'), 0);
END;
$$;

-- =========================================================
-- Leaderboard (admin sees all; head sees downline)
-- =========================================================
CREATE OR REPLACE FUNCTION public.partner_leaderboard(_from date, _to date, _metric text DEFAULT 'commission', _head_partner_id uuid DEFAULT NULL)
RETURNS TABLE(
  partner_id uuid,
  partner_name text,
  tier public.partner_tier,
  state_name text,
  licenses int,
  gmv numeric,
  commission numeric,
  rank int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin bool := public.has_role(auth.uid(),'admin');
  is_head bool := FALSE;
BEGIN
  IF _head_partner_id IS NOT NULL THEN
    is_head := EXISTS(SELECT 1 FROM public.partners WHERE id = _head_partner_id AND user_id = auth.uid());
    IF NOT is_head AND NOT is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;
  ELSIF NOT is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH RECURSIVE down AS (
    SELECT id FROM public.partners
      WHERE _head_partner_id IS NOT NULL AND parent_partner_id = _head_partner_id
    UNION ALL
    SELECT p.id FROM public.partners p JOIN down d ON p.parent_partner_id = d.id
  ),
  scope AS (
    SELECT id FROM public.partners
    WHERE (_head_partner_id IS NULL) OR id IN (SELECT id FROM down)
  ),
  agg AS (
    SELECT
      p.id AS pid,
      p.name AS pname,
      p.tier AS ptier,
      p.state_name AS pstate,
      COALESCE(SUM(plb.qty) FILTER (WHERE plb.created_at::date BETWEEN _from AND _to), 0)::int AS lic,
      COALESCE(SUM(plb.total_inr) FILTER (WHERE plb.created_at::date BETWEEN _from AND _to), 0)::numeric AS gmv_amt,
      COALESCE(SUM(pc.commission_amount) FILTER (WHERE pc.created_at::date BETWEEN _from AND _to), 0)::numeric AS comm
    FROM public.partners p
    LEFT JOIN public.partner_license_batches plb ON plb.partner_id = p.id
    LEFT JOIN public.partner_commissions pc ON pc.partner_id = p.id
    WHERE p.id IN (SELECT id FROM scope)
    GROUP BY p.id
  )
  SELECT
    pid, pname, ptier, pstate, lic, gmv_amt, comm,
    ROW_NUMBER() OVER (
      ORDER BY CASE _metric
        WHEN 'licenses' THEN lic::numeric
        WHEN 'gmv' THEN gmv_amt
        ELSE comm END DESC
    )::int
  FROM agg
  WHERE (lic > 0 OR gmv_amt > 0 OR comm > 0)
  ORDER BY 8 ASC
  LIMIT 100;
END;
$$;
