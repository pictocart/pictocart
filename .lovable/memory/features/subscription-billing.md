---
name: Subscription Billing System
description: Razorpay-based platform subscription with Free/Premium plans, feature gating, and webhook handling
type: feature
---

## Plans
- **Free**: 10 products, 1 theme, COD only. No blog, coupons, analytics, SEO, custom domain, shipping, or Razorpay.
- **Premium** (₹499/mo): Unlimited products/themes, all features unlocked.

## Database
- `subscriptions` table: store_id (unique), plan enum, status enum, razorpay_subscription_id, period dates
- `subscription_events` table: billing history/audit log
- Auto-creates free subscription on new store via trigger `handle_new_store_subscription`

## Feature Gating
- `useSubscription` hook: returns plan, isPremium, canUse(feature), limits
- `PremiumGate` component: wraps content with blur overlay + upgrade CTA
- Applied to: CouponList, BlogPosts, StoreAnalytics, ProductForm (limit check)

## Edge Functions
- `subscription-webhook`: Handles Razorpay subscription events (activated, charged, cancelled, halted)
- Webhook URL: `https://{project}.supabase.co/functions/v1/subscription-webhook`

## Integration
- Billing page at `/billing` with plan comparison and upgrade button
- Sidebar entry with Crown icon
