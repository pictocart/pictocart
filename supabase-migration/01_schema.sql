-- =============================================
-- STEP 1: SCHEMA (CREATE TABLE STATEMENTS)
-- Paste this in NEW Supabase SQL Editor
-- Run AFTER 00_enums.sql
-- =============================================

CREATE TABLE IF NOT EXISTS public.account_deletion_requests
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  reason text,
  status text NOT NULL DEFAULT 'pending'::text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  scheduled_for timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  processed_at timestamp with time zone,
  processed_by uuid,
  notes text
);

CREATE TABLE IF NOT EXISTS public.accounts_settings
(
  store_id uuid NOT NULL,
  opening_cash numeric NOT NULL DEFAULT 0,
  opening_bank numeric NOT NULL DEFAULT 0,
  low_stock_notify_enabled boolean NOT NULL DEFAULT true,
  gst_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_settings
(
  id integer NOT NULL DEFAULT 1,
  session_timeout_minutes integer NOT NULL DEFAULT 480,
  alert_email text,
  auto_heal_enabled boolean NOT NULL DEFAULT true,
  downtime_threshold_minutes integer NOT NULL DEFAULT 10,
  notify_merchants boolean NOT NULL DEFAULT true,
  notify_customers boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_action_costs
(
  action_key text NOT NULL,
  label text NOT NULL,
  credits integer NOT NULL,
  cache_hit_credits integer NOT NULL DEFAULT 1,
  manual_cost_inr numeric NOT NULL DEFAULT 0,
  manual_minutes integer NOT NULL DEFAULT 0,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash'::text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_call_log
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  model text NOT NULL,
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  cost_inr numeric NOT NULL DEFAULT 0,
  reuse_hit boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_credit_packs
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_inr integer NOT NULL,
  credits integer NOT NULL,
  bonus_pct integer NOT NULL DEFAULT 0,
  badge text,
  is_popular boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamp with time zone,
  valid_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_credit_transactions
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  type credit_txn_type NOT NULL,
  action_key text,
  credits integer NOT NULL,
  inr_value numeric NOT NULL DEFAULT 0,
  manual_cost_inr numeric NOT NULL DEFAULT 0,
  manual_minutes integer NOT NULL DEFAULT 0,
  razorpay_order_id text,
  razorpay_payment_id text,
  cache_hit boolean NOT NULL DEFAULT false,
  promo_code text,
  granted_by_admin uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_credit_wallets
(
  store_id uuid NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  lifetime_purchased integer NOT NULL DEFAULT 0,
  lifetime_used integer NOT NULL DEFAULT 0,
  lifetime_saved_inr numeric NOT NULL DEFAULT 0,
  lifetime_saved_minutes integer NOT NULL DEFAULT 0,
  low_balance_notified_at timestamp with time zone,
  zero_balance_notified_at timestamp with time zone,
  auto_recharge_enabled boolean NOT NULL DEFAULT false,
  auto_recharge_pack_id uuid,
  loyalty_tier text NOT NULL DEFAULT 'bronze'::text,
  welcome_grant_given boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_response_cache
(
  key text NOT NULL,
  action_key text NOT NULL,
  response jsonb NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.analytics_events
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  event_type text NOT NULL,
  product_id uuid,
  order_id uuid,
  user_id uuid,
  session_id text,
  path text,
  referrer text,
  value numeric DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  appointment_number text,
  customer_id uuid,
  customer_user_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  provider_id uuid,
  service_id uuid,
  service_name_snapshot text,
  slot_start timestamp with time zone NOT NULL,
  slot_end timestamp with time zone NOT NULL,
  mode appointment_mode NOT NULL DEFAULT 'in_store'::appointment_mode,
  status appointment_status NOT NULL DEFAULT 'pending'::appointment_status,
  address jsonb,
  price numeric DEFAULT 0,
  gst numeric DEFAULT 0,
  total numeric DEFAULT 0,
  payment_status text DEFAULT 'unpaid'::text,
  payment_mode text,
  order_id uuid,
  family_group_id uuid,
  notes_customer text,
  notes_internal text,
  special_request text,
  before_photos text[] DEFAULT '{}'::text[],
  after_photos text[] DEFAULT '{}'::text[],
  reminder_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  travel_fee numeric DEFAULT 0,
  en_route_at timestamp with time zone,
  package_balance_id uuid
);

CREATE TABLE IF NOT EXISTS public.blog_posts
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  body text DEFAULT ''::text,
  cover_image text,
  is_published boolean DEFAULT false,
  seo_title text,
  seo_description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  thumbnail_image text
);

CREATE TABLE IF NOT EXISTS public.categories
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  parent_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  description text
);

CREATE TABLE IF NOT EXISTS public.client_error_logs
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  store_id uuid,
  path text,
  message text NOT NULL,
  stack text,
  user_agent text,
  url text,
  level text NOT NULL DEFAULT 'error'::text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cod_rules
(
  store_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  max_order_value numeric NOT NULL DEFAULT 5000,
  min_order_value numeric NOT NULL DEFAULT 0,
  require_phone_verification boolean NOT NULL DEFAULT false,
  min_prior_orders integer NOT NULL DEFAULT 0,
  pincode_allowlist text[] NOT NULL DEFAULT '{}'::text[],
  pincode_blocklist text[] NOT NULL DEFAULT '{}'::text[],
  blocked_phones text[] NOT NULL DEFAULT '{}'::text[],
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commission_invoices
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_gmv numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  invoice_number text,
  status commission_invoice_status NOT NULL DEFAULT 'pending'::commission_invoice_status,
  due_date date NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  paid_at timestamp with time zone,
  paid_via text,
  pdf_url text,
  waive_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  code text NOT NULL,
  type coupon_type NOT NULL DEFAULT 'percentage'::coupon_type,
  value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  auto_apply boolean NOT NULL DEFAULT false,
  bogo_buy_qty integer,
  bogo_get_qty integer,
  bogo_get_discount_pct integer,
  tiers jsonb,
  description text,
  allowed_modes fulfillment_mode[] NOT NULL DEFAULT '{dine_in,takeaway,delivery}'::fulfillment_mode[]
);

CREATE TABLE IF NOT EXISTS public.credit_milestone_grants
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  milestone_key text NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_milestones
(
  key text NOT NULL,
  label text NOT NULL,
  credits integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_promo_redemptions
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL,
  store_id uuid NOT NULL,
  transaction_id uuid,
  redeemed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_promos
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text,
  type credit_promo_type NOT NULL,
  description text,
  bonus_pct integer NOT NULL DEFAULT 0,
  bonus_flat_credits integer NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  min_recharge_inr integer NOT NULL DEFAULT 0,
  eligible_pack_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  valid_from timestamp with time zone,
  valid_until timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_package_balances
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  package_id uuid NOT NULL,
  customer_id uuid,
  customer_user_id uuid,
  customer_phone text,
  visits_left integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  saved_addresses jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text,
  email text,
  phone text,
  balance numeric NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.disputes
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid,
  order_id uuid,
  razorpay_dispute_id text,
  razorpay_payment_id text,
  amount_inr numeric NOT NULL DEFAULT 0,
  reason_code text,
  reason_description text,
  status text NOT NULL DEFAULT 'open'::text,
  phase text,
  respond_by timestamp with time zone,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.domain_connect_sessions
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  domain text NOT NULL,
  registrar text,
  status text NOT NULL DEFAULT 'pending'::text,
  callback_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'::text),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.dropship_orders
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  product_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  wholesale_cost numeric NOT NULL DEFAULT 0,
  retail_price numeric NOT NULL DEFAULT 0,
  margin numeric NOT NULL DEFAULT 0,
  shipping_address jsonb NOT NULL,
  supplier_invoice_url text,
  tracking_number text,
  courier text,
  status text NOT NULL DEFAULT 'pending'::text,
  forwarded_at timestamp with time zone,
  delivered_at timestamp with time zone,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_send_log
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id text,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_send_state
(
  id integer NOT NULL DEFAULT 1,
  retry_after_until timestamp with time zone,
  batch_size integer NOT NULL DEFAULT 10,
  send_delay_ms integer NOT NULL DEFAULT 200,
  auth_email_ttl_minutes integer NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes integer NOT NULL DEFAULT 60,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.expense_categories
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_mode payment_mode_t NOT NULL DEFAULT 'cash'::payment_mode_t,
  notes text,
  attachment_url text,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence text,
  parent_expense_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.family_groups
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  plan_id uuid,
  head_customer_id uuid,
  head_user_id uuid,
  family_name text NOT NULL,
  status family_plan_status NOT NULL DEFAULT 'active'::family_plan_status,
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  free_visits_used integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.family_members
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  customer_id uuid,
  name text NOT NULL,
  relation text,
  dob date,
  gender text,
  phone text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.family_plans
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  provider_id uuid,
  name text NOT NULL,
  description text,
  monthly_fee numeric DEFAULT 0,
  yearly_fee numeric DEFAULT 0,
  max_families integer DEFAULT 0,
  max_members_per_family integer DEFAULT 6,
  discount_pct numeric DEFAULT 0,
  free_visits_per_year integer DEFAULT 0,
  included_service_ids uuid[] DEFAULT '{}'::uuid[],
  home_visit_included boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fssai_history
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  fssai_number text NOT NULL,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by_user boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.help_articles
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL DEFAULT ''::text,
  category text NOT NULL DEFAULT 'general'::text,
  sort integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  movement_type inv_movement_type NOT NULL,
  qty integer NOT NULL,
  reference_table text,
  reference_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_counters
(
  store_id uuid NOT NULL,
  fiscal_year text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  prefix text NOT NULL DEFAULT 'INV'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.khata_entries
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  entry_type khata_entry_type NOT NULL,
  amount numeric NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  order_id uuid,
  payment_mode payment_mode_t,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.low_balance_alerts
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  threshold_type text NOT NULL,
  balance_at_alert integer NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.master_theme_deliveries
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  master_id uuid,
  theme_pack_id uuid,
  name text NOT NULL,
  category text,
  payload jsonb NOT NULL,
  preview_image text,
  generation_cost_inr numeric DEFAULT 0,
  tokens_used integer DEFAULT 0,
  reuse_ratio numeric DEFAULT 0,
  reused_components integer DEFAULT 0,
  reused_images integer DEFAULT 0,
  source_research jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  delivered_at timestamp with time zone NOT NULL DEFAULT now(),
  layout_slug text
);

CREATE TABLE IF NOT EXISTS public.merchant_chat_messages
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_chat_threads
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid,
  title text NOT NULL DEFAULT 'New conversation'::text,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_sourcing_saved
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_supplier_unlocks
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  supplier_id uuid,
  product_id uuid,
  credits_charged integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  email text NOT NULL,
  subscribed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_commissions
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  store_id uuid NOT NULL,
  gmv_amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  plan text NOT NULL,
  status commission_status NOT NULL DEFAULT 'accrued'::commission_status,
  invoice_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_feedback
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  store_id uuid NOT NULL,
  rating smallint NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_status_history
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  actor text NOT NULL DEFAULT 'System'::text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  order_number text NOT NULL,
  status order_status DEFAULT 'pending'::order_status,
  payment_status payment_status DEFAULT 'pending'::payment_status,
  payment_method text,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  shipping numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  tracking_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  customer_user_id uuid,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount_refunded numeric NOT NULL DEFAULT 0,
  invoice_number text,
  courier_provider text,
  courier_response jsonb DEFAULT '{}'::jsonb,
  fulfillment_mode fulfillment_mode NOT NULL DEFAULT 'delivery'::fulfillment_mode,
  table_label text,
  prep_status prep_status,
  guest_tracking_code text,
  courier text,
  awb text,
  shipping_label_url text,
  delivered_at timestamp with time zone,
  delivery_attempts integer NOT NULL DEFAULT 0,
  pod_url text
);

CREATE TABLE IF NOT EXISTS public.partner_commissions
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  referral_id uuid,
  period_month date NOT NULL,
  base_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  payout_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  commission_type text NOT NULL DEFAULT 'direct'::text,
  source_partner_id uuid,
  source_kind text,
  source_ref text,
  commission_rate numeric
);

CREATE TABLE IF NOT EXISTS public.partner_invites
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_license_batches
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  qty integer NOT NULL,
  unit_price_inr numeric NOT NULL DEFAULT 0,
  total_inr numeric NOT NULL DEFAULT 0,
  invoice_ref text,
  notes text,
  issued_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_licenses
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  batch_id uuid,
  status partner_license_status NOT NULL DEFAULT 'available'::partner_license_status,
  consumed_by_store_id uuid,
  consumed_at timestamp with time zone,
  revoked_at timestamp with time zone,
  revoked_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_payouts
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  amount numeric NOT NULL,
  period text,
  utr text,
  method text DEFAULT 'upi'::text,
  status text NOT NULL DEFAULT 'initiated'::text,
  paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  period_month date,
  commission_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.partner_referrals
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  store_id uuid,
  referred_user_id uuid,
  signed_up_at timestamp with time zone NOT NULL DEFAULT now(),
  first_paid_at timestamp with time zone,
  status text NOT NULL DEFAULT 'signup'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partners
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL DEFAULT 'freelancer'::text,
  referral_code text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  upi_id text,
  pan text,
  payout_email text,
  kyc_status text NOT NULL DEFAULT 'pending'::text,
  commission_pct numeric NOT NULL DEFAULT 20,
  commission_months integer NOT NULL DEFAULT 12,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  partner_type partner_type DEFAULT 'freelancer'::partner_type,
  invite_status partner_invite_status DEFAULT 'pending'::partner_invite_status,
  invited_by_admin uuid,
  total_licenses_purchased integer NOT NULL DEFAULT 0,
  license_price_per_unit numeric,
  total_amount_paid numeric NOT NULL DEFAULT 0,
  company_name text,
  tier partner_tier NOT NULL DEFAULT 'partner'::partner_tier,
  parent_partner_id uuid,
  region_name text,
  state_name text,
  override_commission_pct numeric NOT NULL DEFAULT 0,
  bank_account_number text,
  bank_ifsc text,
  bank_account_holder text
);

CREATE TABLE IF NOT EXISTS public.payment_events
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'razorpay'::text,
  event_id text NOT NULL,
  event_type text NOT NULL,
  order_id uuid,
  store_id uuid,
  razorpay_order_id text,
  razorpay_payment_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_configs
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan subscription_plan NOT NULL,
  display_name text NOT NULL,
  price_inr integer NOT NULL DEFAULT 0,
  commission_percent numeric NOT NULL DEFAULT 0,
  razorpay_plan_id text,
  trial_days integer NOT NULL DEFAULT 0,
  product_limit integer NOT NULL DEFAULT 10,
  theme_limit integer NOT NULL DEFAULT 1,
  custom_domain boolean NOT NULL DEFAULT false,
  razorpay_payments boolean NOT NULL DEFAULT false,
  shipping boolean NOT NULL DEFAULT false,
  blog boolean NOT NULL DEFAULT false,
  coupons boolean NOT NULL DEFAULT false,
  analytics boolean NOT NULL DEFAULT false,
  seo boolean NOT NULL DEFAULT false,
  email_branding boolean NOT NULL DEFAULT false,
  premium_themes boolean NOT NULL DEFAULT false,
  multi_domain boolean NOT NULL DEFAULT false,
  early_access boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  signup_bonus_credits integer NOT NULL DEFAULT 0,
  gst_percent numeric NOT NULL DEFAULT 18,
  annual_price_inr numeric NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.platform_credit_settings
(
  id integer NOT NULL DEFAULT 1,
  base_cost_per_credit_inr numeric NOT NULL DEFAULT 0.03,
  margin_multiplier numeric NOT NULL DEFAULT 3.0,
  custom_recharge_rate numeric NOT NULL DEFAULT 10.0,
  low_balance_threshold integer NOT NULL DEFAULT 200,
  critical_balance_threshold integer NOT NULL DEFAULT 50,
  welcome_grant_credits integer NOT NULL DEFAULT 500,
  custom_min_inr integer NOT NULL DEFAULT 99,
  custom_max_inr integer NOT NULL DEFAULT 50000,
  freelancer_inr_per_hour integer NOT NULL DEFAULT 600,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.platform_invoices
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  user_id uuid NOT NULL,
  store_id uuid,
  type text NOT NULL,
  description text NOT NULL,
  amount_inr numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 18,
  gst_amount_inr numeric NOT NULL DEFAULT 0,
  total_inr numeric NOT NULL DEFAULT 0,
  razorpay_payment_id text,
  customer_name text,
  customer_email text,
  customer_gstin text,
  customer_address jsonb DEFAULT '{}'::jsonb,
  pdf_url text,
  emailed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_plan_offers
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  percent_off numeric NOT NULL DEFAULT 0,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  label text,
  banner_text text,
  banner_bg_color text DEFAULT '#F97316'::text,
  banner_text_color text DEFAULT '#FFFFFF'::text,
  show_banner boolean NOT NULL DEFAULT true,
  applies_to_monthly boolean NOT NULL DEFAULT true,
  applies_to_annual boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  short_description text,
  images text[] DEFAULT '{}'::text[],
  price numeric NOT NULL DEFAULT 0,
  compare_at_price numeric,
  category text,
  tags text[] DEFAULT '{}'::text[],
  variants jsonb DEFAULT '[]'::jsonb,
  inventory_count integer DEFAULT 0,
  sku text,
  is_active boolean DEFAULT true,
  ai_generated_data jsonb,
  seo_title text,
  seo_description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  menu_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost_price numeric DEFAULT 0,
  reorder_level integer DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  is_returnable boolean NOT NULL DEFAULT true,
  is_exchangeable boolean NOT NULL DEFAULT true,
  return_window_days integer NOT NULL DEFAULT 7,
  exchange_window_days integer NOT NULL DEFAULT 7
);

CREATE TABLE IF NOT EXISTS public.profiles
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_commissions
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  appointment_id uuid,
  base_amount numeric NOT NULL DEFAULT 0,
  commission_pct numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'pending'::text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_schedules
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  weekday smallint,
  start_time time without time zone,
  end_time time without time zone,
  override_date date,
  is_off boolean DEFAULT false,
  slot_buffer_min integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provision_job_logs
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  step text NOT NULL,
  status text NOT NULL DEFAULT 'info'::text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provision_requests
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  theme_master_id uuid,
  status text NOT NULL DEFAULT 'queued'::text,
  client_patch_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_patch_prompt text DEFAULT ''::text,
  new_project_url text,
  new_project_subdomain text,
  notes text,
  error text,
  queued_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamp with time zone,
  next_run_at timestamp with time zone NOT NULL DEFAULT now(),
  requested_domain text
);

CREATE TABLE IF NOT EXISTS public.provisioning_budget
(
  id integer NOT NULL DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT true,
  hourly_inr_cap numeric NOT NULL DEFAULT 50,
  daily_inr_cap numeric NOT NULL DEFAULT 500,
  per_job_inr_estimate numeric NOT NULL DEFAULT 2,
  current_hour_spent_inr numeric NOT NULL DEFAULT 0,
  current_day_spent_inr numeric NOT NULL DEFAULT 0,
  hour_window_started_at timestamp with time zone NOT NULL DEFAULT now(),
  day_window_started_at timestamp with time zone NOT NULL DEFAULT now(),
  paused_until timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_bills
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  supplier_id uuid,
  bill_number text,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  payment_status bill_payment_status NOT NULL DEFAULT 'unpaid'::bill_payment_status,
  payment_mode payment_mode_t,
  attachment_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.refunds
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  store_id uuid NOT NULL,
  razorpay_payment_id text NOT NULL,
  razorpay_refund_id text,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  speed text NOT NULL DEFAULT 'normal'::text,
  reason text,
  notes jsonb DEFAULT '{}'::jsonb,
  initiated_by uuid,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.research_jobs
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'queued'::text,
  query text,
  total integer NOT NULL DEFAULT 0,
  completed integer NOT NULL DEFAULT 0,
  found_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.returns
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  store_id uuid NOT NULL,
  customer_user_id uuid,
  reason text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  refund_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'requested'::text,
  seller_notes text,
  customer_notes text,
  refund_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  request_type text NOT NULL DEFAULT 'return'::text,
  exchange_details jsonb,
  pickup_scheduled_at timestamp with time zone,
  picked_up_at timestamp with time zone,
  pickup_awb text,
  pickup_courier text,
  qc_status text,
  qc_notes text,
  qc_photos jsonb DEFAULT '[]'::jsonb,
  customer_photos jsonb DEFAULT '[]'::jsonb,
  refund_status text,
  refund_initiated_at timestamp with time zone,
  refund_completed_at timestamp with time zone,
  replacement_product_id uuid,
  replacement_awb text,
  replacement_courier text,
  replacement_shipped_at timestamp with time zone,
  replacement_delivered_at timestamp with time zone,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_notes text
);

CREATE TABLE IF NOT EXISTS public.reviews
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating smallint NOT NULL,
  title text,
  body text,
  images text[] DEFAULT '{}'::text[],
  is_verified_purchase boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  moderation_status text NOT NULL DEFAULT 'approved'::text,
  moderated_at timestamp with time zone,
  moderated_by uuid,
  moderation_notes text,
  appointment_id uuid,
  provider_id uuid
);

CREATE TABLE IF NOT EXISTS public.seller_push_tokens
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid,
  token text NOT NULL,
  platform text NOT NULL,
  device_id text,
  app_version text,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_packages
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  included_service_ids uuid[] DEFAULT '{}'::uuid[],
  total_visits integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  validity_days integer DEFAULT 365,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_providers
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  role_label text,
  photo_url text,
  specialization text[] DEFAULT '{}'::text[],
  experience_years integer DEFAULT 0,
  languages text[] DEFAULT '{}'::text[],
  gender text,
  bio text,
  commission_pct numeric DEFAULT 0,
  accepts_home_visit boolean DEFAULT false,
  accepts_teleconsult boolean DEFAULT false,
  registration_number text,
  max_families_cap integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  home_visit_pincodes text[] DEFAULT '{}'::text[],
  home_visit_radius_km numeric DEFAULT 0,
  home_base_lat numeric,
  home_base_lng numeric,
  rating_avg numeric DEFAULT 0,
  rating_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.services
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  description text,
  duration_min integer NOT NULL DEFAULT 30,
  price numeric NOT NULL DEFAULT 0,
  deposit_pct numeric DEFAULT 0,
  gst_pct numeric DEFAULT 0,
  requires_room boolean DEFAULT false,
  max_parallel integer DEFAULT 1,
  allowed_provider_ids uuid[] DEFAULT '{}'::uuid[],
  home_visit_addon numeric DEFAULT 0,
  teleconsult_enabled boolean DEFAULT false,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  home_visit_enabled boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.sourcing_inquiries
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  product_id uuid,
  kind text NOT NULL DEFAULT 'quote'::text,
  quantity integer,
  target_price numeric,
  message text,
  status text NOT NULL DEFAULT 'sent'::text,
  reply text,
  replied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sourcing_products
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  source text NOT NULL,
  source_url text,
  external_id text,
  title text NOT NULL,
  description text,
  category text,
  subcategory text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  images text[] NOT NULL DEFAULT '{}'::text[],
  hero_image text,
  moq integer,
  price_min numeric,
  price_max numeric,
  currency text NOT NULL DEFAULT 'INR'::text,
  suggested_retail_price numeric,
  estimated_margin_pct numeric,
  supplier_name_cached text,
  supplier_city_cached text,
  supplier_phone_masked text,
  supplier_phone_full text,
  supplier_email_full text,
  ships_pan_india boolean NOT NULL DEFAULT true,
  lead_time_days integer,
  rating numeric,
  reviews_count integer,
  ai_score numeric NOT NULL DEFAULT 0,
  ai_insight text,
  raw_json jsonb,
  dedupe_hash text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sourcing_supplier_payouts
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  reference text,
  period_start date,
  period_end date,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sourcing_supplier_reviews
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating numeric NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sourcing_suppliers
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  website text,
  gstin text,
  gst_verified boolean NOT NULL DEFAULT false,
  address text,
  city text,
  state text,
  pincode text,
  country text NOT NULL DEFAULT 'India'::text,
  categories text[] NOT NULL DEFAULT '{}'::text[],
  description text,
  logo_url text,
  banner_url text,
  min_order_value numeric,
  default_lead_time_days integer,
  ships_pan_india boolean NOT NULL DEFAULT true,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  commission_pct numeric NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending'::text,
  rating numeric NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'self_signup'::text,
  source_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sourcing_viral_products
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  rank integer NOT NULL,
  growth_pct numeric,
  trend_score numeric NOT NULL DEFAULT 0,
  category text,
  reason text,
  week_of date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_content
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  section_key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_custom_pages
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  brief text,
  status text NOT NULL DEFAULT 'draft'::text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  style_hint text DEFAULT 'match_theme'::text,
  show_in_nav boolean NOT NULL DEFAULT false,
  nav_order integer NOT NULL DEFAULT 0,
  credits_spent integer NOT NULL DEFAULT 0,
  ai_model text,
  version integer NOT NULL DEFAULT 1,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_email_domains
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  domain text NOT NULL,
  resend_domain_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  dns_records jsonb DEFAULT '[]'::jsonb,
  sender_prefix text NOT NULL DEFAULT 'notifications'::text,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_email_templates
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_fulfillment_settings
(
  store_id uuid NOT NULL,
  dine_in_enabled boolean NOT NULL DEFAULT false,
  takeaway_enabled boolean NOT NULL DEFAULT false,
  delivery_enabled boolean NOT NULL DEFAULT true,
  dine_in_requires_table boolean NOT NULL DEFAULT true,
  tables jsonb NOT NULL DEFAULT '[]'::jsonb,
  takeaway_min_phone_only boolean NOT NULL DEFAULT true,
  delivery_radius_km numeric NOT NULL DEFAULT 0,
  delivery_min_order numeric NOT NULL DEFAULT 0,
  delivery_fee_flat numeric NOT NULL DEFAULT 0,
  auto_accept boolean NOT NULL DEFAULT false,
  kitchen_prep_minutes integer NOT NULL DEFAULT 20,
  dine_in_payment_modes text[] NOT NULL DEFAULT '{cash}'::text[],
  takeaway_payment_modes text[] NOT NULL DEFAULT '{razorpay,cash}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_google_reviews_cache
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL,
  store_id uuid NOT NULL,
  google_review_id text,
  author_name text,
  author_photo_url text,
  rating integer,
  text text,
  relative_time text,
  time_unix bigint,
  language text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_google_reviews_connections
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  place_id text NOT NULL,
  business_name text,
  business_address text,
  business_url text,
  is_active boolean NOT NULL DEFAULT false,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamp with time zone,
  payment_id text,
  amount_inr numeric NOT NULL DEFAULT 1499,
  last_synced_at timestamp with time zone,
  sync_error text,
  average_rating numeric,
  total_reviews integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_handovers
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  client_email text NOT NULL,
  plan text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'annual'::text,
  token_hash text NOT NULL,
  status store_handover_status NOT NULL DEFAULT 'pending'::store_handover_status,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  paid_at timestamp with time zone,
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_qr_codes
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  kind text NOT NULL,
  slug text NOT NULL,
  table_label text,
  target_path text NOT NULL,
  scans_count integer NOT NULL DEFAULT 0,
  last_scanned_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_secrets
(
  store_id uuid NOT NULL,
  razorpay_key_id text,
  razorpay_key_secret text,
  razorpay_test_mode boolean DEFAULT true,
  delhivery_api_token text,
  delhivery_test_mode boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  shiprocket_email text,
  shiprocket_password text,
  shiprocket_token text,
  shiprocket_token_expires_at timestamp with time zone,
  preferred_courier text DEFAULT 'delhivery'::text
);

CREATE TABLE IF NOT EXISTS public.store_site_offers
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  percent_off numeric NOT NULL DEFAULT 0,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  label text,
  banner_text text,
  banner_bg_color text DEFAULT '#F97316'::text,
  banner_text_color text DEFAULT '#FFFFFF'::text,
  show_banner boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_testimonials
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_role text,
  content text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  photo_url text,
  is_featured boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stores
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  category text,
  logo_url text,
  banner_url text,
  theme jsonb DEFAULT '{"name": "minimal-light", "primary_color": "#F97316"}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  is_published boolean DEFAULT false,
  onboarding_step integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  custom_domain text,
  downtime_notified_at timestamp with time zone,
  installed_theme_version text,
  theme_update_dismissed_version text,
  referred_by_code text,
  layout_slug text,
  owned_by_partner_id uuid,
  is_partner_build boolean NOT NULL DEFAULT false,
  partner_handover_status store_handover_status,
  home_page_kind text NOT NULL DEFAULT 'default'::text,
  home_page_id uuid,
  home_page_product_id uuid
);

CREATE TABLE IF NOT EXISTS public.subscription_events
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  event_type text NOT NULL,
  razorpay_event_id text,
  amount numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  plan subscription_plan NOT NULL DEFAULT 'free'::subscription_plan,
  status subscription_status NOT NULL DEFAULT 'active'::subscription_status,
  razorpay_subscription_id text,
  razorpay_plan_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  grace_period_end timestamp with time zone,
  is_blocked boolean NOT NULL DEFAULT false,
  expiry_notified_at timestamp with time zone,
  grace_warning_notified_at timestamp with time zone,
  blocked_notified_at timestamp with time zone,
  pending_plan subscription_plan,
  pending_plan_effective_at timestamp with time zone,
  billing_cycle text NOT NULL DEFAULT 'monthly'::text,
  last_renewal_reminder_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.suppliers
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  gstin text,
  address jsonb DEFAULT '{}'::jsonb,
  opening_balance numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_type text NOT NULL,
  sender_user_id uuid,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  customer_user_id uuid NOT NULL,
  order_id uuid,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  priority text NOT NULL DEFAULT 'normal'::text,
  status text NOT NULL DEFAULT 'open'::text,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppressed_emails
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_category_briefs
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  subcategory text NOT NULL,
  display_name text NOT NULL,
  prompt_addendum text NOT NULL DEFAULT ''::text,
  palette_hints text,
  vocabulary text,
  hero_archetypes text,
  section_priority text[] NOT NULL DEFAULT '{}'::text[],
  image_style text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  icon text,
  merchant_facing boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.theme_generation_metrics
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  theme_pack_id uuid,
  delivery_id uuid,
  category text,
  tokens_used integer DEFAULT 0,
  cost_inr numeric DEFAULT 0,
  reuse_ratio numeric DEFAULT 0,
  generated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_image_pool
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category text NOT NULL,
  section_type text NOT NULL,
  image_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_layout_archetypes
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  best_for text[] NOT NULL DEFAULT '{}'::text[],
  hero_style text NOT NULL,
  category_style text NOT NULL,
  product_style text NOT NULL,
  header_style text NOT NULL,
  density text NOT NULL DEFAULT 'balanced'::text,
  radius_hint text NOT NULL DEFAULT '8px'::text,
  section_order text[] NOT NULL DEFAULT '{}'::text[],
  allowed_extra_sections text[] NOT NULL DEFAULT '{}'::text[],
  forbidden_sections text[] NOT NULL DEFAULT '{}'::text[],
  image_ratios jsonb NOT NULL DEFAULT '{"hero": "16:9", "product": "4:5", "category": "1:1"}'::jsonb,
  motion_language text NOT NULL DEFAULT 'subtle fades, no parallax'::text,
  prompt_instructions text NOT NULL,
  editor_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_image text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_master_metrics
(
  theme_id text NOT NULL,
  total_cost_inr numeric NOT NULL DEFAULT 0,
  image_count integer NOT NULL DEFAULT 0,
  reuse_hits integer NOT NULL DEFAULT 0,
  shipped_to_pictocart boolean NOT NULL DEFAULT false,
  pictocart_response jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_master_projects
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  theme_id text NOT NULL,
  name text NOT NULL,
  description text DEFAULT ''::text,
  lovable_project_url text,
  remix_url text,
  client_patch_prompt text NOT NULL DEFAULT ''::text,
  preview_image text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  category text,
  is_default boolean NOT NULL DEFAULT false,
  current_version text NOT NULL DEFAULT '1.0.0'::text,
  latest_changelog text,
  features jsonb DEFAULT '{}'::jsonb,
  customisable_slots jsonb DEFAULT '[]'::jsonb,
  price numeric NOT NULL DEFAULT 0,
  compare_at_price numeric,
  is_premium boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.theme_master_versions
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  theme_id text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  files_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_packs
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  description text DEFAULT ''::text,
  thumbnail text,
  pages jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  price integer NOT NULL DEFAULT 0,
  ai_generation_cost numeric NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  compare_at_price integer,
  layout_slug text
);

CREATE TABLE IF NOT EXISTS public.theme_purchase_intents
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  theme_kind text NOT NULL,
  theme_ref text NOT NULL,
  amount_inr numeric NOT NULL,
  discount_inr numeric NOT NULL DEFAULT 0,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.theme_purchases
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  theme_pack_id uuid NOT NULL,
  purchased_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_release_calendar
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category text NOT NULL,
  archetype text,
  hero_style text,
  planned_for date NOT NULL,
  status text NOT NULL DEFAULT 'planned'::text,
  theme_pack_id uuid,
  expected_cost_inr numeric DEFAULT 0,
  research_brief jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  slot_date date,
  theme_brief jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.theme_research_corpus
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  source_site text NOT NULL,
  category text,
  insights jsonb NOT NULL DEFAULT '{}'::jsonb,
  palette jsonb,
  fonts jsonb,
  section_order jsonb,
  hero_style text,
  copy_motifs jsonb,
  reuse_count integer NOT NULL DEFAULT 0,
  scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_section_blueprints
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_type text NOT NULL,
  layout text NOT NULL DEFAULT 'full-width'::text,
  variant_name text NOT NULL,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  category_tags text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_settings
(
  id integer NOT NULL DEFAULT 1,
  auto_research boolean NOT NULL DEFAULT false,
  auto_generate boolean NOT NULL DEFAULT false,
  cadence_days integer NOT NULL DEFAULT 7,
  themes_per_batch integer NOT NULL DEFAULT 4,
  research_query text NOT NULL DEFAULT 'best ecommerce theme inspiration 2026'::text,
  last_research_at timestamp with time zone,
  last_generation_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_versions
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  theme_master_id uuid NOT NULL,
  version text NOT NULL,
  summary text NOT NULL DEFAULT ''::text,
  changelog text NOT NULL DEFAULT ''::text,
  released_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tour_progress
(
  user_id uuid NOT NULL,
  tour_key text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  skipped boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.trial_reminders_sent
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  store_id uuid NOT NULL,
  stage text NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL
);

CREATE TABLE IF NOT EXISTS public.wishlists
(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  store_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
