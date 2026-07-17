-- =============================================
-- STEP 0: ENUMS (CREATE TYPE STATEMENTS)
-- Paste this FIRST in NEW Supabase SQL Editor
-- Run this BEFORE 01_schema.sql
-- =============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'customer', 'freelancer', 'provider', 'front_desk', 'pharmacist', 'partner');
CREATE TYPE public.appointment_mode AS ENUM ('in_store', 'home_visit', 'teleconsult');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'en_route', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.bill_payment_status AS ENUM ('paid', 'partial', 'unpaid');
CREATE TYPE public.commission_invoice_status AS ENUM ('pending', 'paid', 'overdue', 'waived');
CREATE TYPE public.commission_status AS ENUM ('accrued', 'invoiced', 'waived');
CREATE TYPE public.coupon_type AS ENUM ('percentage', 'flat', 'bogo', 'tiered');
CREATE TYPE public.credit_promo_type AS ENUM ('code', 'sitewide', 'first_recharge', 'loyalty', 'referral');
CREATE TYPE public.credit_txn_type AS ENUM ('debit', 'credit', 'bonus', 'refund', 'grant');
CREATE TYPE public.family_plan_status AS ENUM ('active', 'expired', 'cancelled', 'waitlist');
CREATE TYPE public.fulfillment_mode AS ENUM ('dine_in', 'takeaway', 'delivery');
CREATE TYPE public.inv_movement_type AS ENUM ('opening', 'purchase', 'sale', 'adjustment', 'return');
CREATE TYPE public.khata_entry_type AS ENUM ('credit', 'payment');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'rejected', 'new', 'packed', 'out_for_delivery');
CREATE TYPE public.partner_invite_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE public.partner_license_status AS ENUM ('available', 'consumed', 'revoked');
CREATE TYPE public.partner_tier AS ENUM ('partner', 'state_head', 'regional_head');
CREATE TYPE public.partner_type AS ENUM ('agency', 'freelancer', 'intern');
CREATE TYPE public.payment_mode_t AS ENUM ('cash', 'upi', 'card', 'bank', 'credit', 'other');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cod');
CREATE TYPE public.prep_status AS ENUM ('received', 'preparing', 'ready', 'served', 'out_for_delivery', 'completed', 'cancelled');
CREATE TYPE public.store_handover_status AS ENUM ('pending', 'accepted', 'paid', 'cancelled', 'expired');
CREATE TYPE public.subscription_plan AS ENUM ('free', 'premium', 'starter', 'growth', 'scale');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'incomplete');
