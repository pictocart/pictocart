# Phase 5 — Partner Payouts Automation & Analytics

Automate monthly partner commission payouts and add a leaderboard/analytics view so admins and Heads can rank partners by GMV, licenses, and commission.

## 1. Payouts automation
- Added bank fields (`bank_account_number`, `bank_ifsc`, `bank_account_holder`) and `period_month`/`commission_count` to payouts.
- RPCs: `admin_pending_payouts_summary`, `admin_run_payout_batch(_period_month, _method)`, `admin_mark_payout_paid(_payout_id, _utr, _method)`.
- New page `/admin/partner-payouts`:
  - Pending commissions grouped by partner with direct vs override split.
  - One-click "Run batch" creates a payout per partner for the chosen month and marks commissions approved.
  - Payout history with "Mark paid" + UTR capture.
  - On mark-paid → sends `partner-payout-paid` email.
- New page `/partner/payouts` for partners:
  - Lifetime / month / pending / paid stats (`partner_self_stats` RPC).
  - Editable payout details (UPI, bank, PAN).
  - Payout + commission history.

## 2. Analytics & Leaderboard
- RPC `partner_leaderboard(_from, _to, _metric, _head_partner_id)` — admin sees all, head sees downline.
- New page `/admin/partner-analytics`: date range + presets, ranked table, CSV export, totals.

## 3. Email
- `partner-payout-paid` transactional template registered & deployed.

## Files
- Created: `src/pages/admin/AdminPartnerPayouts.tsx`, `src/pages/admin/AdminPartnerAnalytics.tsx`, `src/pages/partner/PartnerPayouts.tsx`, `supabase/functions/_shared/transactional-email-templates/partner-payout-paid.tsx`
- Edited: `src/App.tsx` (routes), `src/components/AdminLayout.tsx` (nav), `src/pages/partner/PartnerDashboard.tsx` (My Payouts button), email registry, migration.
