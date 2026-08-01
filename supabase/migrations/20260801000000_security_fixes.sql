-- =============================================
-- Migration: 20260801000000_security_fixes.sql
-- Security improvements:
-- 1. Restrict search_path on all SECURITY DEFINER functions
-- 2. Tighten RLS policy for appointments
-- 3. Add balance tampering protection trigger to ai_credit_wallets
-- =============================================

-- 1. Alter all SECURITY DEFINER functions to set search_path
ALTER FUNCTION public.accrue_appointment_commission() SET search_path = public, pg_temp;
ALTER FUNCTION public.accrue_hierarchy_commissions(uuid, numeric, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.accrue_order_commission() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_assign_partner_parent(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_mark_payout_paid(uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_pending_payouts_summary(date) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_promote_partner(uuid, text, numeric, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_run_payout_batch(date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_coupon_to_recent_order(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.bump_ticket_last_message() SET search_path = public, pg_temp;
ALTER FUNCTION public.cancel_pending_plan_change(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.consume_credits(uuid, text, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.consume_partner_license(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.credit_wallet(uuid, integer, credit_txn_type, numeric, text, text, text, uuid, text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.deduct_inventory_on_order() SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_dine_in_enabled_for_qr() SET search_path = public, pg_temp;
ALTER FUNCTION public.family_plan_slots_left(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_licenses_for_batch() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_referral_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_active_plan_offer_pct(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_active_store_offer_pct(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_order_by_tracking(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_order_eligibility(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_public_credit_settings() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_storefront_cod_rules(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.grant_plan_signup_bonus(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_custom_page_slug() SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_customer_tenant_email() SET search_path = public, pg_temp;
ALTER FUNCTION public.guard_partner_parent_cycle() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_store_subscription() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.head_downline_partners(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.head_downline_summary(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_coupon_usage(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.inventory_on_purchase() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_partner_in_downline(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_phone_cod_blocked(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_store_access_blocked(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_order_status_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.next_invoice_number(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.partner_leaderboard(date, date, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.partner_license_summary(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.partner_self_stats(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.pnl_report(uuid, date, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_customer_balance() SET search_path = public, pg_temp;
ALTER FUNCTION public.schedule_plan_change(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.transfer_store_to_client(uuid, uuid, uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.transfer_store_to_client(uuid, uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_review_rating() SET search_path = public, pg_temp;

-- Dynamically alter functions that may not exist in standard migrations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'email_queue_dispatch' AND nspname = 'public') THEN
    EXECUTE 'ALTER FUNCTION public.email_queue_dispatch() SET search_path = public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'email_queue_wake' AND nspname = 'public') THEN
    EXECUTE 'ALTER FUNCTION public.email_queue_wake() SET search_path = public, pg_temp';
  END IF;
END $$;

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
