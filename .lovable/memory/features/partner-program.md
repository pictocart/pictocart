---
name: Partner Program (Phase 6)
description: Freelancer/agency referral program — 20% commission for 12 months, ?ref=CODE attribution cookie, partner dashboard at /partners
type: feature
---

# Partner / Commission Program

## Tables
- `partners` — user_id, type ('freelancer'|'agency'), referral_code (7-char unique), name, email, upi_id, pan, kyc_status, commission_pct (default 20), commission_months (default 12)
- `partner_referrals` — partner_id, store_id, referred_user_id, status ('signup'|'paid'|'churned')
- `partner_commissions` — partner_id, referral_id, period_month, base_amount, commission_amount, status, payout_id
- `partner_payouts` — partner_id, amount, period, utr, status
- `stores.referred_by_code` — captures referral code at store creation

## Attribution flow
1. Visitor lands on `/?ref=ABC1234` → `captureReferralFromUrl()` writes cookie `ptc_ref` (30-day, root path).
2. They sign up, then create store in Onboarding → `referred_by_code` saved on `stores`.
3. If a partner with that code exists → row inserted in `partner_referrals` (status='signup'), cookie cleared.

## Routes
- `/partners`, `/partners/signup` — public landing + form (calls `generate_referral_code` RPC)
- `/partners/dashboard` — partner-only stats: signups, paid, pending payout, link
- `/admin/partners` — admin manages KYC, records payouts (UTR), views referrals

## Helpers
- `src/lib/referralCookie.ts` — capture / read / clear
- `public.generate_referral_code()` — 7-char alphanumeric, unique

## Commission math (not yet automated)
- 20% of seller's monthly subscription × 12 months
- Cron job (NOT YET BUILT) should compute monthly accruals into `partner_commissions`
- Admin manually records payouts via `/admin/partners` panel for now

## What's NOT built yet
- Monthly commission cron job
- Email notifications (signup, payout)
- Clawback automation on refund
- Agency tier (type='agency') — schema ready, UI deferred to Phase 8
