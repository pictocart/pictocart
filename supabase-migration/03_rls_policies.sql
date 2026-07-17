-- =============================================
-- STEP 3: RLS POLICIES
-- Paste this in NEW Supabase SQL Editor
-- Run AFTER 02_functions.sql
-- =============================================

-- -----------------------------------------------
-- ENABLE ROW LEVEL SECURITY (all tables)
-- -----------------------------------------------
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cod_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_milestone_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_package_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_connect_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropship_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_balance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_theme_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_sourcing_saved ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_supplier_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_license_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_credit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_plan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provision_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisioning_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_supplier_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_supplier_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_viral_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_custom_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_fulfillment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_google_reviews_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_google_reviews_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_site_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_category_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_generation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_image_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_layout_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_master_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_master_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_master_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_purchase_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_release_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_research_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_section_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- POLICIES
-- -----------------------------------------------

-- account_deletion_requests
CREATE POLICY "Admins manage deletion req" ON public.account_deletion_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service manages deletion req" ON public.account_deletion_requests AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Users insert own deletion req" ON public.account_deletion_requests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users view own deletion req" ON public.account_deletion_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

-- accounts_settings
CREATE POLICY owner_all_accounts_settings ON public.accounts_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = accounts_settings.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = accounts_settings.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- admin_settings
CREATE POLICY "Admins read settings" ON public.admin_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update settings" ON public.admin_settings AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages settings" ON public.admin_settings AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ai_action_costs
CREATE POLICY "Admins manage action costs" ON public.ai_action_costs AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon read action costs" ON public.ai_action_costs AS PERMISSIVE FOR SELECT TO anon
  USING (true);
CREATE POLICY "Authenticated read action costs" ON public.ai_action_costs AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Service role manages action costs" ON public.ai_action_costs AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ai_call_log
CREATE POLICY "Admins read ai log" ON public.ai_call_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages ai log" ON public.ai_call_log AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ai_credit_packs
CREATE POLICY "Admins manage packs" ON public.ai_credit_packs AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone reads active packs" ON public.ai_credit_packs AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));
CREATE POLICY "Service role manages packs" ON public.ai_credit_packs AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ai_credit_transactions
CREATE POLICY "Admins view all txns" ON public.ai_credit_transactions AS PERMISSIVE FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners view own txns" ON public.ai_credit_transactions AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = ai_credit_transactions.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Service role manages txns" ON public.ai_credit_transactions AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ai_credit_wallets
CREATE POLICY "Admins view all wallets" ON public.ai_credit_wallets AS PERMISSIVE FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners insert own wallet" ON public.ai_credit_wallets AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = ai_credit_wallets.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Owners update own wallet prefs" ON public.ai_credit_wallets AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = ai_credit_wallets.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Owners view own wallet" ON public.ai_credit_wallets AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = ai_credit_wallets.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Service role manages wallets" ON public.ai_credit_wallets AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ai_response_cache
CREATE POLICY "Admins read cache" ON public.ai_response_cache AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages cache" ON public.ai_response_cache AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- analytics_events
CREATE POLICY "Admins read all events" ON public.analytics_events AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can insert events for published stores" ON public.analytics_events AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = analytics_events.store_id) AND (s.is_published = true)))));
CREATE POLICY "Service role manages events" ON public.analytics_events AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners read own events" ON public.analytics_events AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = analytics_events.store_id) AND (s.user_id = auth.uid())))));

-- appointments
CREATE POLICY "Customer cancels own appointment" ON public.appointments AS PERMISSIVE FOR UPDATE TO public
  USING ((customer_user_id = auth.uid()));
CREATE POLICY "Customer reads own appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO public
  USING ((customer_user_id = auth.uid()));
CREATE POLICY "Owners manage appointments" ON public.appointments AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = appointments.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = appointments.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Provider sees own appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM service_providers p WHERE ((p.id = appointments.provider_id) AND (p.user_id = auth.uid())))));
CREATE POLICY "Provider updates own appointments" ON public.appointments AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS (SELECT 1 FROM service_providers p WHERE ((p.id = appointments.provider_id) AND (p.user_id = auth.uid())))));
CREATE POLICY "Public can create appointment for published store" ON public.appointments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = appointments.store_id) AND (s.is_published = true)))));

-- blog_posts
CREATE POLICY "Public can read published posts" ON public.blog_posts AS PERMISSIVE FOR SELECT TO public
  USING (((is_published = true) AND (EXISTS (SELECT 1 FROM stores WHERE ((stores.id = blog_posts.store_id) AND (stores.is_published = true))))));
CREATE POLICY "Store owners manage blog posts" ON public.blog_posts AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = blog_posts.store_id) AND (stores.user_id = auth.uid())))));

-- categories
CREATE POLICY "Public can read categories of published stores" ON public.categories AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = categories.store_id) AND (stores.is_published = true)))));
CREATE POLICY "Store owners can manage categories" ON public.categories AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = categories.store_id) AND (stores.user_id = auth.uid())))));

-- client_error_logs
CREATE POLICY "Admins delete errors" ON public.client_error_logs AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read errors" ON public.client_error_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can log errors" ON public.client_error_logs AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- cod_rules
CREATE POLICY "Service role manages cod rules" ON public.cod_rules AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners manage cod rules" ON public.cod_rules AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = cod_rules.store_id) AND (s.user_id = auth.uid())))))
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = cod_rules.store_id) AND (s.user_id = auth.uid())))));

-- commission_invoices
CREATE POLICY "Admins manage all commission invoices" ON public.commission_invoices AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants view own commission invoices" ON public.commission_invoices AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = commission_invoices.store_id) AND (s.user_id = auth.uid())))));

-- coupons
CREATE POLICY "Active coupons in published stores are readable" ON public.coupons AS PERMISSIVE FOR SELECT TO public
  USING (((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now())) AND (EXISTS (SELECT 1 FROM stores WHERE ((stores.id = coupons.store_id) AND (stores.is_published = true))))));
CREATE POLICY "Store owners can manage coupons" ON public.coupons AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = coupons.store_id) AND (stores.user_id = auth.uid())))));

-- credit_milestone_grants
CREATE POLICY "Owners view own milestone grants" ON public.credit_milestone_grants AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = credit_milestone_grants.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Service role manages milestone grants" ON public.credit_milestone_grants AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- credit_milestones
CREATE POLICY "Admins manage milestones" ON public.credit_milestones AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read milestones" ON public.credit_milestones AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Service role manages milestones" ON public.credit_milestones AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- credit_promo_redemptions
CREATE POLICY "Admins view all redemptions" ON public.credit_promo_redemptions AS PERMISSIVE FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners view own redemptions" ON public.credit_promo_redemptions AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = credit_promo_redemptions.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Service role manages redemptions" ON public.credit_promo_redemptions AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- credit_promos
CREATE POLICY "Admins manage promos" ON public.credit_promos AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read active promos" ON public.credit_promos AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_active = true));
CREATE POLICY "Service role manages promos" ON public.credit_promos AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- customer_package_balances
CREATE POLICY "Customer reads own balance" ON public.customer_package_balances AS PERMISSIVE FOR SELECT TO public
  USING ((customer_user_id = auth.uid()));
CREATE POLICY "Owners manage balances" ON public.customer_package_balances AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = customer_package_balances.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = customer_package_balances.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- customers
CREATE POLICY "Customers can manage own data" ON public.customers AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Store owners can view customers" ON public.customers AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = customers.store_id) AND (stores.user_id = auth.uid())))));

-- disputes
CREATE POLICY "Admins manage disputes" ON public.disputes AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service manages disputes" ON public.disputes AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners view own disputes" ON public.disputes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = disputes.store_id) AND (s.user_id = auth.uid())))));

-- domain_connect_sessions
CREATE POLICY "Admins view all domain connect sessions" ON public.domain_connect_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages sessions" ON public.domain_connect_sessions AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners create sessions" ON public.domain_connect_sessions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = domain_connect_sessions.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Store owners view own sessions" ON public.domain_connect_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = domain_connect_sessions.store_id) AND (s.user_id = auth.uid())))));

-- dropship_orders
CREATE POLICY dropship_insert ON public.dropship_orders AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY dropship_read ON public.dropship_orders AS PERMISSIVE FOR SELECT TO public
  USING (((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM sourcing_suppliers s WHERE ((s.id = dropship_orders.supplier_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY dropship_update ON public.dropship_orders AS PERMISSIVE FOR UPDATE TO public
  USING (((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM sourcing_suppliers s WHERE ((s.id = dropship_orders.supplier_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- email_send_log
CREATE POLICY "Service role can insert send log" ON public.email_send_log AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can read send log" ON public.email_send_log AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can update send log" ON public.email_send_log AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));

-- email_send_state
CREATE POLICY "Service role can manage send state" ON public.email_send_state AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));

-- email_unsubscribe_tokens
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));

-- expense_categories
CREATE POLICY owner_all_expense_categories ON public.expense_categories AS PERMISSIVE FOR ALL TO authenticated
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = expense_categories.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = expense_categories.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- expenses
CREATE POLICY owner_all_expenses ON public.expenses AS PERMISSIVE FOR ALL TO authenticated
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = expenses.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = expenses.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- family_groups
CREATE POLICY "Head customer reads own family" ON public.family_groups AS PERMISSIVE FOR SELECT TO public
  USING ((head_user_id = auth.uid()));
CREATE POLICY "Owners manage family groups" ON public.family_groups AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = family_groups.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = family_groups.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- family_members
CREATE POLICY "Head customer reads members of own family" ON public.family_members AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM family_groups g WHERE ((g.id = family_members.group_id) AND (g.head_user_id = auth.uid())))));
CREATE POLICY "Owners manage family members" ON public.family_members AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM (family_groups g JOIN stores s ON ((s.id = g.store_id))) WHERE ((g.id = family_members.group_id) AND ((s.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))))
  WITH CHECK ((EXISTS (SELECT 1 FROM (family_groups g JOIN stores s ON ((s.id = g.store_id))) WHERE ((g.id = family_members.group_id) AND ((s.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));

-- family_plans
CREATE POLICY "Owners manage family plans" ON public.family_plans AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = family_plans.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = family_plans.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Public reads active family plans of published store" ON public.family_plans AS PERMISSIVE FOR SELECT TO public
  USING (((is_active = true) AND (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = family_plans.store_id) AND (s.is_published = true))))));

-- help_articles
CREATE POLICY "Admins manage help" ON public.help_articles AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public reads published help" ON public.help_articles AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((is_published = true));

-- inventory_movements
CREATE POLICY owner_all_inventory_movements ON public.inventory_movements AS PERMISSIVE FOR ALL TO authenticated
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = inventory_movements.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = inventory_movements.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- invoice_counters
CREATE POLICY "Service role manages invoice counters" ON public.invoice_counters AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners read counters" ON public.invoice_counters AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = invoice_counters.store_id) AND (s.user_id = auth.uid())))));

-- khata_entries
CREATE POLICY owner_all_khata_entries ON public.khata_entries AS PERMISSIVE FOR ALL TO authenticated
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = khata_entries.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = khata_entries.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- low_balance_alerts
CREATE POLICY "Admins view all alerts" ON public.low_balance_alerts AS PERMISSIVE FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages alerts" ON public.low_balance_alerts AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners view own alerts" ON public.low_balance_alerts AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = low_balance_alerts.store_id) AND (s.user_id = auth.uid())))));

-- master_theme_deliveries
CREATE POLICY "Admins manage deliveries" ON public.master_theme_deliveries AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages deliveries" ON public.master_theme_deliveries AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- merchant_chat_messages
CREATE POLICY "own messages insert" ON public.merchant_chat_messages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM merchant_chat_threads t WHERE ((t.id = merchant_chat_messages.thread_id) AND (t.user_id = auth.uid())))));
CREATE POLICY "own messages select" ON public.merchant_chat_messages AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM merchant_chat_threads t WHERE ((t.id = merchant_chat_messages.thread_id) AND (t.user_id = auth.uid())))));

-- merchant_chat_threads
CREATE POLICY "own threads delete" ON public.merchant_chat_threads AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = auth.uid()));
CREATE POLICY "own threads insert" ON public.merchant_chat_threads AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "own threads select" ON public.merchant_chat_threads AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));
CREATE POLICY "own threads update" ON public.merchant_chat_threads AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- merchant_sourcing_saved
CREATE POLICY saved_owner_all ON public.merchant_sourcing_saved AS PERMISSIVE FOR ALL TO public
  USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((user_id = auth.uid()));

-- merchant_supplier_unlocks
CREATE POLICY unlocks_owner_read ON public.merchant_supplier_unlocks AS PERMISSIVE FOR SELECT TO public
  USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

-- newsletter_subscribers
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Store owners can view subscribers" ON public.newsletter_subscribers AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = newsletter_subscribers.store_id) AND (stores.user_id = auth.uid())))));

-- order_commissions
CREATE POLICY "Admins manage all commissions" ON public.order_commissions AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants view own commissions" ON public.order_commissions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = order_commissions.store_id) AND (s.user_id = auth.uid())))));

-- order_feedback
CREATE POLICY "Anyone can submit order feedback" ON public.order_feedback AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Store owners can read their feedback" ON public.order_feedback AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = order_feedback.store_id) AND (s.user_id = auth.uid())))));

-- order_status_history
CREATE POLICY "Customers can view their own order history" ON public.order_status_history AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM orders o WHERE ((o.id = order_status_history.order_id) AND (o.customer_user_id = auth.uid())))));
CREATE POLICY "Store owners can view their order history" ON public.order_status_history AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM (orders o JOIN stores s ON ((s.id = o.store_id))) WHERE ((o.id = order_status_history.order_id) AND (s.user_id = auth.uid())))));

-- orders
CREATE POLICY "Authenticated users can create orders" ON public.orders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = orders.store_id) AND (stores.is_published = true)))));
CREATE POLICY "Customers can view own orders" ON public.orders AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = customer_user_id));
CREATE POLICY "Guests can place dine-in orders" ON public.orders AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (((fulfillment_mode = 'dine_in'::fulfillment_mode) AND (customer_user_id IS NULL) AND (EXISTS (SELECT 1 FROM (stores s JOIN store_fulfillment_settings f ON ((f.store_id = s.id))) WHERE ((s.id = orders.store_id) AND (s.is_published = true) AND (f.dine_in_enabled = true))))));
CREATE POLICY "Guests can place takeaway orders" ON public.orders AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (((fulfillment_mode = 'takeaway'::fulfillment_mode) AND (customer_user_id IS NULL) AND (customer_phone IS NOT NULL) AND (length(customer_phone) >= 7) AND (EXISTS (SELECT 1 FROM (stores s JOIN store_fulfillment_settings f ON ((f.store_id = s.id))) WHERE ((s.id = orders.store_id) AND (s.is_published = true) AND (f.takeaway_enabled = true))))));
CREATE POLICY "Store owners can update orders" ON public.orders AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = orders.store_id) AND (stores.user_id = auth.uid())))));
CREATE POLICY "Store owners can view orders" ON public.orders AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = orders.store_id) AND (stores.user_id = auth.uid())))));

-- partner_commissions
CREATE POLICY "Admin manages commissions" ON public.partner_commissions AS PERMISSIVE FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Head reads downline commissions" ON public.partner_commissions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((source_partner_id IS NOT NULL) AND is_partner_in_downline(auth.uid(), source_partner_id)));
CREATE POLICY "Partner can view own commissions" ON public.partner_commissions AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR (partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid())))));

-- partner_invites
CREATE POLICY "admin manage partner invites" ON public.partner_invites AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- partner_license_batches
CREATE POLICY "admin manage license batches" ON public.partner_license_batches AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "partner reads own batches" ON public.partner_license_batches AS PERMISSIVE FOR SELECT TO authenticated
  USING ((partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid()))));

-- partner_licenses
CREATE POLICY "Head reads downline licenses" ON public.partner_licenses AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_partner_in_downline(auth.uid(), partner_id));
CREATE POLICY "admin manage licenses" ON public.partner_licenses AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "partner reads own licenses" ON public.partner_licenses AS PERMISSIVE FOR SELECT TO authenticated
  USING ((partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid()))));

-- partner_payouts
CREATE POLICY "Admin manages payouts" ON public.partner_payouts AS PERMISSIVE FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partner can view own payouts" ON public.partner_payouts AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR (partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid())))));

-- partner_referrals
CREATE POLICY "Admin manages referrals" ON public.partner_referrals AS PERMISSIVE FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partner can view own referrals" ON public.partner_referrals AS PERMISSIVE FOR SELECT TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR (partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid())))));
CREATE POLICY "Referred user can record own attribution" ON public.partner_referrals AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((referred_user_id = auth.uid()));

-- partners
CREATE POLICY "Admin can delete partners" ON public.partners AS PERMISSIVE FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update partners" ON public.partners AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partner can insert own row" ON public.partners AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Partner can update own row" ON public.partners AS PERMISSIVE FOR UPDATE TO public
  USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Partner can view own row" ON public.partners AS PERMISSIVE FOR SELECT TO public
  USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));

-- payment_events
CREATE POLICY "Admins view all payment events" ON public.payment_events AS PERMISSIVE FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Store owners view payment events" ON public.payment_events AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = payment_events.store_id) AND (s.user_id = auth.uid())))));

-- plan_configs
CREATE POLICY "Admins manage plan configs" ON public.plan_configs AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon reads active plans" ON public.plan_configs AS PERMISSIVE FOR SELECT TO anon
  USING ((is_active = true));
CREATE POLICY "Authenticated reads active plans" ON public.plan_configs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_active = true));

-- platform_credit_settings
CREATE POLICY "Admins read settings" ON public.platform_credit_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update settings" ON public.platform_credit_settings AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages settings" ON public.platform_credit_settings AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- platform_invoices
CREATE POLICY "Admins manage invoices" ON public.platform_invoices AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service manages invoices" ON public.platform_invoices AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Users view own invoices" ON public.platform_invoices AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

-- platform_plan_offers
CREATE POLICY "Anyone can read plan offer" ON public.platform_plan_offers AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Only admin manages plan offer" ON public.platform_plan_offers AS PERMISSIVE FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- products
CREATE POLICY "Active products in published stores are public" ON public.products AS PERMISSIVE FOR SELECT TO public
  USING (((is_active = true) AND (EXISTS (SELECT 1 FROM stores WHERE ((stores.id = products.store_id) AND (stores.is_published = true))))));
CREATE POLICY "Store owners can manage products" ON public.products AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = products.store_id) AND (stores.user_id = auth.uid())))));

-- profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- provider_commissions
CREATE POLICY "Owners manage commissions" ON public.provider_commissions AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = provider_commissions.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = provider_commissions.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- provider_schedules
CREATE POLICY "Owners manage schedules" ON public.provider_schedules AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = provider_schedules.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = provider_schedules.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Provider manages own schedule" ON public.provider_schedules AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM service_providers p WHERE ((p.id = provider_schedules.provider_id) AND (p.user_id = auth.uid())))))
  WITH CHECK ((EXISTS (SELECT 1 FROM service_providers p WHERE ((p.id = provider_schedules.provider_id) AND (p.user_id = auth.uid())))));
CREATE POLICY "Public reads provider schedules" ON public.provider_schedules AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM (service_providers p JOIN stores s ON ((s.id = p.store_id))) WHERE ((p.id = provider_schedules.provider_id) AND (p.is_active = true) AND (s.is_published = true)))));
CREATE POLICY "Public reads schedules of published store" ON public.provider_schedules AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = provider_schedules.store_id) AND (s.is_published = true)))));

-- provision_job_logs
CREATE POLICY "Admins read job logs" ON public.provision_job_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages job logs" ON public.provision_job_logs AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners read own job logs" ON public.provision_job_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM (provision_requests pr JOIN stores s ON ((s.id = pr.store_id))) WHERE ((pr.id = provision_job_logs.request_id) AND (s.user_id = auth.uid())))));

-- provision_requests
CREATE POLICY "Admins manage provision requests" ON public.provision_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages provision requests" ON public.provision_requests AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners read own provision requests" ON public.provision_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = provision_requests.store_id) AND (s.user_id = auth.uid())))));

-- provisioning_budget
CREATE POLICY "Admins manage provisioning budget" ON public.provisioning_budget AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- purchase_bills
CREATE POLICY owner_all_purchase_bills ON public.purchase_bills AS PERMISSIVE FOR ALL TO authenticated
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = purchase_bills.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = purchase_bills.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- refunds
CREATE POLICY "Admins view all refunds" ON public.refunds AS PERMISSIVE FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Customers view their refunds" ON public.refunds AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM orders o WHERE ((o.id = refunds.order_id) AND (o.customer_user_id = auth.uid())))));
CREATE POLICY "Store owners view refunds" ON public.refunds AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = refunds.store_id) AND (s.user_id = auth.uid())))));

-- research_jobs
CREATE POLICY "Admins read research jobs" ON public.research_jobs AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages research jobs" ON public.research_jobs AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- returns
CREATE POLICY "Admins manage returns" ON public.returns AS PERMISSIVE FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Customers create own returns" ON public.returns AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = customer_user_id));
CREATE POLICY "Customers view own returns" ON public.returns AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = customer_user_id));
CREATE POLICY "Service role manages returns" ON public.returns AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners manage returns" ON public.returns AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = returns.store_id) AND (s.user_id = auth.uid())))))
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = returns.store_id) AND (s.user_id = auth.uid())))));

-- reviews
CREATE POLICY "Authenticated users can create reviews" ON public.reviews AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Public can read approved reviews of published stores" ON public.reviews AS PERMISSIVE FOR SELECT TO public
  USING ((((moderation_status = 'approved'::text) AND (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = reviews.store_id) AND (s.is_published = true))))) OR (auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = reviews.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can update own reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

-- seller_push_tokens
CREATE POLICY "Sellers delete own push tokens" ON public.seller_push_tokens AS PERMISSIVE FOR DELETE TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Sellers insert own push tokens" ON public.seller_push_tokens AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Sellers update own push tokens" ON public.seller_push_tokens AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Sellers view own push tokens" ON public.seller_push_tokens AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- service_packages
CREATE POLICY "Owners manage packages" ON public.service_packages AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = service_packages.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = service_packages.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Public reads active packages" ON public.service_packages AS PERMISSIVE FOR SELECT TO public
  USING (((is_active = true) AND (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = service_packages.store_id) AND (s.is_published = true))))));

-- service_providers
CREATE POLICY "Owners manage providers" ON public.service_providers AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = service_providers.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = service_providers.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Provider sees self" ON public.service_providers AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));
CREATE POLICY "Provider updates self" ON public.service_providers AS PERMISSIVE FOR UPDATE TO public
  USING ((user_id = auth.uid()));
CREATE POLICY "Public reads active providers of published store" ON public.service_providers AS PERMISSIVE FOR SELECT TO public
  USING (((is_active = true) AND (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = service_providers.store_id) AND (s.is_published = true))))));

-- services
CREATE POLICY "Owners manage services" ON public.services AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = services.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = services.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Public reads active services of published store" ON public.services AS PERMISSIVE FOR SELECT TO public
  USING (((is_active = true) AND (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = services.store_id) AND (s.is_published = true))))));

-- sourcing_inquiries
CREATE POLICY src_inq_insert ON public.sourcing_inquiries AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY src_inq_read ON public.sourcing_inquiries AS PERMISSIVE FOR SELECT TO public
  USING (((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM sourcing_suppliers s WHERE ((s.id = sourcing_inquiries.supplier_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY src_inq_update ON public.sourcing_inquiries AS PERMISSIVE FOR UPDATE TO public
  USING (((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM sourcing_suppliers s WHERE ((s.id = sourcing_inquiries.supplier_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- sourcing_products
CREATE POLICY sourcing_products_public_read ON public.sourcing_products AS PERMISSIVE FOR SELECT TO public
  USING (((is_active = true) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY sourcing_products_supplier_delete ON public.sourcing_products AS PERMISSIVE FOR DELETE TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS (SELECT 1 FROM sourcing_suppliers s WHERE ((s.id = sourcing_products.supplier_id) AND (s.user_id = auth.uid()))))));
CREATE POLICY sourcing_products_supplier_insert ON public.sourcing_products AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS (SELECT 1 FROM sourcing_suppliers s WHERE ((s.id = sourcing_products.supplier_id) AND (s.user_id = auth.uid()))))));
CREATE POLICY sourcing_products_supplier_update ON public.sourcing_products AS PERMISSIVE FOR UPDATE TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS (SELECT 1 FROM sourcing_suppliers s WHERE ((s.id = sourcing_products.supplier_id) AND (s.user_id = auth.uid()))))));

-- sourcing_supplier_payouts
CREATE POLICY src_payouts_admin_manage ON public.sourcing_supplier_payouts AS PERMISSIVE FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY src_payouts_supplier_read ON public.sourcing_supplier_payouts AS PERMISSIVE FOR SELECT TO public
  USING (((EXISTS (SELECT 1 FROM sourcing_suppliers s WHERE ((s.id = sourcing_supplier_payouts.supplier_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- sourcing_supplier_reviews
CREATE POLICY src_reviews_owner_all ON public.sourcing_supplier_reviews AS PERMISSIVE FOR ALL TO public
  USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY src_reviews_public_read ON public.sourcing_supplier_reviews AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- sourcing_suppliers
CREATE POLICY src_suppliers_admin_delete ON public.sourcing_suppliers AS PERMISSIVE FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY src_suppliers_public_read ON public.sourcing_suppliers AS PERMISSIVE FOR SELECT TO public
  USING (((status = 'approved'::text) OR (user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY src_suppliers_self_insert ON public.sourcing_suppliers AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY src_suppliers_self_update ON public.sourcing_suppliers AS PERMISSIVE FOR UPDATE TO public
  USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

-- sourcing_viral_products
CREATE POLICY viral_admin_manage ON public.sourcing_viral_products AS PERMISSIVE FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY viral_public_read ON public.sourcing_viral_products AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- store_content
CREATE POLICY "Public reads content of published stores" ON public.store_content AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_content.store_id) AND (s.is_published = true)))));
CREATE POLICY "Store owners manage own content" ON public.store_content AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_content.store_id) AND (s.user_id = auth.uid())))))
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_content.store_id) AND (s.user_id = auth.uid())))));

-- store_custom_pages
CREATE POLICY "Admins manage all custom pages" ON public.store_custom_pages AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners manage their custom pages" ON public.store_custom_pages AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_custom_pages.store_id) AND (s.user_id = auth.uid())))))
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_custom_pages.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Public can read published custom pages" ON public.store_custom_pages AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (((status = 'published'::text) AND (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_custom_pages.store_id) AND (s.is_published = true))))));

-- store_email_domains
CREATE POLICY "Service role full access on email domains" ON public.store_email_domains AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners can insert own email domain" ON public.store_email_domains AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = store_email_domains.store_id) AND (stores.user_id = auth.uid())))));
CREATE POLICY "Store owners can update own email domain" ON public.store_email_domains AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = store_email_domains.store_id) AND (stores.user_id = auth.uid())))));
CREATE POLICY "Store owners can view own email domain" ON public.store_email_domains AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = store_email_domains.store_id) AND (stores.user_id = auth.uid())))));

-- store_email_templates
CREATE POLICY "Service role full access" ON public.store_email_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Store owners can insert own templates" ON public.store_email_templates AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = store_email_templates.store_id) AND (stores.user_id = auth.uid())))));
CREATE POLICY "Store owners can update own templates" ON public.store_email_templates AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = store_email_templates.store_id) AND (stores.user_id = auth.uid())))));
CREATE POLICY "Store owners can view own templates" ON public.store_email_templates AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = store_email_templates.store_id) AND (stores.user_id = auth.uid())))));

-- store_fulfillment_settings
CREATE POLICY "Owners manage fulfillment" ON public.store_fulfillment_settings AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_fulfillment_settings.store_id) AND (s.user_id = auth.uid())))))
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_fulfillment_settings.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Public reads fulfillment of published stores" ON public.store_fulfillment_settings AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_fulfillment_settings.store_id) AND (s.is_published = true)))));
CREATE POLICY "Service manages fulfillment" ON public.store_fulfillment_settings AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- store_google_reviews_cache
CREATE POLICY "Public can view cached reviews of published stores" ON public.store_google_reviews_cache AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_google_reviews_cache.store_id) AND (s.is_published = true)))));

-- store_google_reviews_connections
CREATE POLICY "Anyone can view active Google review connections" ON public.store_google_reviews_connections AS PERMISSIVE FOR SELECT TO public
  USING (((is_active = true) AND (is_paid = true)));
CREATE POLICY "Store owners delete own connection" ON public.store_google_reviews_connections AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_google_reviews_connections.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Store owners insert own connection" ON public.store_google_reviews_connections AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_google_reviews_connections.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Store owners update own connection" ON public.store_google_reviews_connections AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_google_reviews_connections.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Store owners view own connection" ON public.store_google_reviews_connections AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_google_reviews_connections.store_id) AND (s.user_id = auth.uid())))));

-- store_handovers
CREATE POLICY "admin manage handovers" ON public.store_handovers AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "partner manages own handovers" ON public.store_handovers AS PERMISSIVE FOR ALL TO authenticated
  USING ((partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid()))))
  WITH CHECK ((partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid()))));

-- store_qr_codes
CREATE POLICY "Owners manage qr" ON public.store_qr_codes AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_qr_codes.store_id) AND (s.user_id = auth.uid())))))
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_qr_codes.store_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Public reads active qr of published stores" ON public.store_qr_codes AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (((is_active = true) AND (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_qr_codes.store_id) AND (s.is_published = true))))));
CREATE POLICY "Service manages qr" ON public.store_qr_codes AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- store_secrets
CREATE POLICY "Store owners manage own secrets" ON public.store_secrets AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_secrets.store_id) AND (s.user_id = auth.uid())))))
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_secrets.store_id) AND (s.user_id = auth.uid())))));

-- store_site_offers
CREATE POLICY "Owner manages own offer" ON public.store_site_offers AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_site_offers.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_site_offers.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Public can view active offer" ON public.store_site_offers AS PERMISSIVE FOR SELECT TO public
  USING (((enabled = true) AND (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_site_offers.store_id) AND (s.is_published = true))))));

-- store_testimonials
CREATE POLICY "Public can view testimonials of published stores" ON public.store_testimonials AS PERMISSIVE FOR SELECT TO public
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_testimonials.store_id) AND (s.is_published = true)))) OR (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_testimonials.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Store owners manage their testimonials" ON public.store_testimonials AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_testimonials.store_id) AND (s.user_id = auth.uid())))))
  WITH CHECK ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = store_testimonials.store_id) AND (s.user_id = auth.uid())))));

-- stores
CREATE POLICY "Admins can view all stores" ON public.stores AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners can manage own store" ON public.stores AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Public can lookup stores by custom domain" ON public.stores AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (((custom_domain IS NOT NULL) AND (is_published = true)));
CREATE POLICY "Published stores are public" ON public.stores AS PERMISSIVE FOR SELECT TO public
  USING ((is_published = true));
CREATE POLICY "partner inserts own build store" ON public.stores AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((owned_by_partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid()))) AND (user_id = auth.uid())));
CREATE POLICY "partner manages built stores" ON public.stores AS PERMISSIVE FOR ALL TO authenticated
  USING (((is_partner_build = true) AND (owned_by_partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid())))))
  WITH CHECK (((is_partner_build = true) AND (owned_by_partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid())))));

-- subscription_events
CREATE POLICY "Admins can view all events" ON public.subscription_events AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Store owners can view own events" ON public.subscription_events AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM (subscriptions s JOIN stores st ON ((st.id = s.store_id))) WHERE ((s.id = subscription_events.subscription_id) AND (st.user_id = auth.uid())))));

-- subscriptions
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Store owners can view own subscription" ON public.subscriptions AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = subscriptions.store_id) AND (stores.user_id = auth.uid())))));

-- suppliers
CREATE POLICY owner_all_suppliers ON public.suppliers AS PERMISSIVE FOR ALL TO authenticated
  USING (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = suppliers.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = suppliers.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- support_ticket_messages
CREATE POLICY "Ticket parties read messages" ON public.support_ticket_messages AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM support_tickets t WHERE ((t.id = support_ticket_messages.ticket_id) AND ((t.customer_user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = t.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role))))));
CREATE POLICY "Ticket parties send messages" ON public.support_ticket_messages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM support_tickets t WHERE ((t.id = support_ticket_messages.ticket_id) AND ((t.customer_user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = t.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role))))));

-- support_tickets
CREATE POLICY "Customer creates own ticket" ON public.support_tickets AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((customer_user_id = auth.uid()));
CREATE POLICY "Customer manages own tickets" ON public.support_tickets AS PERMISSIVE FOR SELECT TO authenticated
  USING (((customer_user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = support_tickets.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Store or customer updates ticket" ON public.support_tickets AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((customer_user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM stores s WHERE ((s.id = support_tickets.store_id) AND (s.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));

-- suppressed_emails
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));

-- theme_category_briefs
CREATE POLICY "Admins can delete briefs" ON public.theme_category_briefs AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert briefs" ON public.theme_category_briefs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read all briefs" ON public.theme_category_briefs AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update briefs" ON public.theme_category_briefs AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read active briefs" ON public.theme_category_briefs AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

-- theme_generation_metrics
CREATE POLICY "Admins read metrics" ON public.theme_generation_metrics AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages metrics" ON public.theme_generation_metrics AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- theme_image_pool
CREATE POLICY "Admins can manage image pool" ON public.theme_image_pool AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read image pool" ON public.theme_image_pool AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- theme_layout_archetypes
CREATE POLICY "Admins manage layouts" ON public.theme_layout_archetypes AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone reads active layouts" ON public.theme_layout_archetypes AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((is_active = true));
CREATE POLICY "Service role manages layouts" ON public.theme_layout_archetypes AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- theme_master_metrics
CREATE POLICY "Admins read master metrics" ON public.theme_master_metrics AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages master metrics" ON public.theme_master_metrics AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- theme_master_projects
CREATE POLICY "Admins manage theme masters" ON public.theme_master_projects AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read active theme masters" ON public.theme_master_projects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_active = true));
CREATE POLICY "Public read active theme masters" ON public.theme_master_projects AS PERMISSIVE FOR SELECT TO anon
  USING ((is_active = true));

-- theme_master_versions
CREATE POLICY "Admins manage master versions" ON public.theme_master_versions AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read master theme versions" ON public.theme_master_versions AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Service role manages master versions" ON public.theme_master_versions AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- theme_packs
CREATE POLICY "Admins can manage theme packs" ON public.theme_packs AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read published theme packs" ON public.theme_packs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_published = true));

-- theme_purchase_intents
CREATE POLICY "Owners can view own intents" ON public.theme_purchase_intents AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores s WHERE ((s.id = theme_purchase_intents.store_id) AND (s.user_id = auth.uid())))));

-- theme_purchases
CREATE POLICY "Admins can view all purchases" ON public.theme_purchases AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Store owners can view purchases" ON public.theme_purchases AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = theme_purchases.store_id) AND (stores.user_id = auth.uid())))));

-- theme_release_calendar
CREATE POLICY "Admins manage calendar" ON public.theme_release_calendar AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages calendar" ON public.theme_release_calendar AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- theme_research_corpus
CREATE POLICY "Admins manage research corpus" ON public.theme_research_corpus AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages research corpus" ON public.theme_research_corpus AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- theme_section_blueprints
CREATE POLICY "Admins can manage blueprints" ON public.theme_section_blueprints AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read blueprints" ON public.theme_section_blueprints AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- theme_settings
CREATE POLICY "Admins manage theme settings" ON public.theme_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages theme settings" ON public.theme_settings AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- theme_versions
CREATE POLICY "Admins manage theme versions" ON public.theme_versions AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read theme versions" ON public.theme_versions AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- tour_progress
CREATE POLICY tour_progress_delete_own ON public.tour_progress AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY tour_progress_insert_own ON public.tour_progress AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY tour_progress_select_own ON public.tour_progress AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY tour_progress_update_own ON public.tour_progress AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id));

-- trial_reminders_sent
CREATE POLICY "Admins can view trial reminders" ON public.trial_reminders_sent AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- user_roles
CREATE POLICY "Admins can delete roles" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage roles" ON public.user_roles AS PERMISSIVE FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- wishlists
CREATE POLICY "Customers can add to wishlist" ON public.wishlists AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Customers can remove from wishlist" ON public.wishlists AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Customers can view own wishlist" ON public.wishlists AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Store owners can view wishlist" ON public.wishlists AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM stores WHERE ((stores.id = wishlists.store_id) AND (stores.user_id = auth.uid())))));

