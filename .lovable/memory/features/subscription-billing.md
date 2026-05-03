---
name: Subscription Billing System
description: 4-tier Razorpay subscription (Free/Starter/Growth/Scale), DB-driven plan_configs, feature gating, admin plan editor
type: feature
---

## Plans (DB-driven via `plan_configs` table)
- **Free** ₹0 — 10 products, 1 theme, 3% commission, COD only
- **Starter** ₹499 — 100 products, 3 themes, 2% commission, custom domain, payments, shipping, blog, coupons, analytics, SEO, branded emails
- **Growth** ₹1499 — 1000 products, 10 themes, 1% commission, 14-day trial, premium themes, multi-domain
- **Scale** ₹4999 — Unlimited, 0% commission, early access

Admin can edit pricing, feature flags, Razorpay plan IDs at `/admin/plans`.

## Key files
- `src/hooks/useSubscription.ts` — reads `plan_configs` + `subscriptions`, exposes `planConfig`, `canUse(feature)`, legacy `PLAN_LIMITS`
- `src/pages/Billing.tsx` — 4-card plan picker + comparison table
- `src/pages/admin/AdminPlans.tsx` — admin CRUD for plans
- `supabase/functions/create-razorpay-subscription` — accepts `{store_id, plan}`, looks up `razorpay_plan_id` from plan_configs, supports trial via `start_at`
- `supabase/functions/subscription-webhook` — resolves plan from notes or razorpay_plan_id, persists correct tier

## Razorpay plan IDs
Set per-tier in Admin → Plans. Webhook resolves plan from `notes.plan` first, then falls back to `razorpay_plan_id` lookup.
