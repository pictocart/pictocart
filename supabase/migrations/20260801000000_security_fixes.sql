-- =============================================
-- Migration: 20260801000000_security_fixes.sql
-- Security improvements:
-- 1. Restrict search_path on all SECURITY DEFINER functions
-- 2. Tighten RLS policy for appointments
-- 3. Add balance tampering protection trigger to ai_credit_wallets
-- =============================================

-- 1. Alter all SECURITY DEFINER functions to set search_path
ALTER FUNCTION public.accrue_appointment_commission() SET search_path = public, pg_temp;
ALTER FUNCTION public.accrue_hierarchy_commissions(_partner_id uuid, _base_amount numeric, _source_kind text, _source_ref text) SET search_path = public, pg_temp;
ALTER FUNCTION public.accrue_order_commission() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_assign_partner_parent(_partner_id uuid, _parent_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_mark_payout_paid(_payout_id uuid, _utr text DEFAULT NULL::text, _method text DEFAULT NULL::text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_pending_payouts_summary(_period_month date DEFAULT NULL::date) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_promote_partner(_partner_id uuid, _tier text, _override_pct numeric, _region_name text DEFAULT NULL::text, _state_name text DEFAULT NULL::text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_run_payout_batch(_period_month date, _method text DEFAULT 'upi'::text) SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_coupon_to_recent_order(_coupon_id uuid, _order_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.bump_ticket_last_message() SET search_path = public, pg_temp;
ALTER FUNCTION public.cancel_pending_plan_change(_store_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.consume_credits(_store_id uuid, _action_key text, _cache_hit boolean DEFAULT false) SET search_path = public, pg_temp;
ALTER FUNCTION public.consume_partner_license(_partner_id uuid, _store_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.credit_wallet(_store_id uuid, _credits integer, _type credit_txn_type, _inr_value numeric DEFAULT 0, _razorpay_order_id text DEFAULT NULL::text, _razorpay_payment_id text DEFAULT NULL::text, _promo_code text DEFAULT NULL::text, _granted_by_admin uuid DEFAULT NULL::uuid, _reason text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.deduct_inventory_on_order() SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_email(queue_name text, message_id bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.email_queue_dispatch() SET search_path = public, pg_temp;
ALTER FUNCTION public.email_queue_wake() SET search_path = public, pg_temp;
ALTER FUNCTION public.enqueue_email(queue_name text, payload jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_dine_in_enabled_for_qr() SET search_path = public, pg_temp;
ALTER FUNCTION public.family_plan_slots_left(_plan_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_licenses_for_batch() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_referral_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_active_plan_offer_pct(_cycle text DEFAULT 'monthly'::text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_active_store_offer_pct(_store_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_order_by_tracking(tracking_code text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_order_eligibility(_order_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_public_credit_settings() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_storefront_cod_rules(_store_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.grant_plan_signup_bonus(_store_id uuid, _plan text) SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_custom_page_slug() SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_customer_tenant_email() SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_partner_parent_cycle() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_store_subscription() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.head_downline_partners(_head_partner_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.head_downline_summary(_head_partner_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_coupon_usage(coupon_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.inventory_on_purchase() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_partner_in_downline(_head_user_id uuid, _partner_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_phone_cod_blocked(_store_id uuid, _phone text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_store_access_blocked(_store_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_order_status_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.next_invoice_number(_store_id uuid, _prefix text DEFAULT 'INV'::text) SET search_path = public, pg_temp;
ALTER FUNCTION public.partner_leaderboard(_from date, _to date, _metric text DEFAULT 'commission'::text, _head_partner_id uuid DEFAULT NULL::uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.partner_license_summary(_partner_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.partner_self_stats(_partner_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.pnl_report(_store_id uuid, _from date, _to date) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_customer_balance() SET search_path = public, pg_temp;
ALTER FUNCTION public.schedule_plan_change(_store_id uuid, _new_plan text) SET search_path = public, pg_temp;
ALTER FUNCTION public.transfer_store_to_client(_store_id uuid, _client_user_id uuid, _handover_id uuid, _plan text DEFAULT NULL::text, _billing_cycle text DEFAULT 'annual'::text) SET search_path = public, pg_temp;
ALTER FUNCTION public.transfer_store_to_client(_store_id uuid, _client_user_id uuid, _handover_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_review_rating() SET search_path = public, pg_temp;
ALTER FUNCTION public.protect_wallet_balance() SET search_path = public, pg_temp;

-- 2. Tighten appointments INSERT policy
DROP POLICY IF EXISTS "Public can create appointment for published store" ON public.appointments;
CREATE POLICY "Public can create appointment for published store" ON public.appointments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = appointments.store_id) AND (s.is_published = true))))
    AND (customer_user_id IS NULL OR customer_user_id = auth.uid())
  );

-- 3. Create wallet balance protection trigger
CREATE OR REPLACE FUNCTION public.protect_wallet_balance()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.balance IS DISTINCT FROM NEW.balance OR
       OLD.lifetime_purchased IS DISTINCT FROM NEW.lifetime_purchased OR
       OLD.lifetime_used IS DISTINCT FROM NEW.lifetime_used OR
       OLD.welcome_grant_given IS DISTINCT FROM NEW.welcome_grant_given THEN
      
      -- Only service_role or admin can update balance/purchased/used fields
      IF NOT (has_role(auth.uid(), 'admin'::app_role)) AND (auth.role() <> 'service_role') THEN
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

CREATE OR REPLACE TRIGGER protect_wallet_balance_trigger
  BEFORE UPDATE ON public.ai_credit_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_wallet_balance();
