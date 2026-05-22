
# GMV Commission — make it real (accrue → invoice → collect)

## Where we stand today
- `plan_configs.commission_percent` is **already set** at 3% (Free), 2% (Starter), 1% (Growth), 0% (Scale).
- It is **only displayed analytically** in `AdminRevenue.tsx` and on the pricing/Billing page.
- **No merchant is actually being charged.** No per-order accrual, no invoice, no collection. That's the gap.

## What we'll build

### 1. Per-order accrual (automatic, at the moment payment is confirmed)
- New table `order_commissions`:
  - `order_id`, `store_id`, `gmv_amount` (order subtotal, excluding tax + shipping), `commission_rate`, `commission_amount`, `plan` (snapshot at time of order), `status` (`accrued` | `invoiced` | `waived`), `invoice_id`, `created_at`.
  - Unique on `order_id` so it can't double-charge.
- Trigger on `orders` AFTER UPDATE: when `payment_status` transitions to `paid` (and order is not `cancelled`/`refunded`), insert a row using the store's *current* `subscriptions.plan` → `plan_configs.commission_percent`.
- On `cancelled` / `refunded` transition → flip the accrual to `waived`.
- GMV definition: `subtotal` (excludes platform-collected tax and shipping). Documented in code.

### 2. Monthly invoice generation
- New table `commission_invoices`:
  - `store_id`, `period_start`, `period_end`, `total_gmv`, `total_commission`, `invoice_number` (reuses `next_invoice_number` with prefix `COM`), `status` (`pending` | `paid` | `overdue` | `waived`), `due_date` (period_end + 7 days), `razorpay_order_id`, `razorpay_payment_id`, `paid_at`, `pdf_url`.
- New edge function `generate-commission-invoices` (cron: 1st of every month, 02:00 IST):
  - For each store with `status='accrued'` rows in the previous month → create one `commission_invoices` row, set those `order_commissions` to `invoiced` and link `invoice_id`.
  - Skip stores whose plan has `commission_percent = 0` or whose total < ₹10 (carry forward to next month).
- Email the invoice via existing `send-transactional-email` with a new template `commission_invoice_generated` (PDF link + pay button).

### 3. Collection (3 fallback paths, in order)
1. **Auto-debit from AI credit wallet** — if `ai_credit_wallets.balance` covers the INR amount at current credit rate, debit it via existing `credit_wallet` (negative entry with type `debit` and reason `commission_settlement`). Mark invoice `paid`. Opt-in toggle in Billing → "Auto-pay commission from credits".
2. **Razorpay checkout link** — edge function `create-commission-payment` creates a Razorpay order tied to `commission_invoices.id`. Existing `razorpay-webhook` extended with a new `commission_invoice` branch that marks the invoice paid on `payment.captured`.
3. **Grace period + soft block** — if unpaid after `due_date + 7 days`: hide premium theme catalog + show a non-dismissible banner in the dashboard. After +14 days: pause new-order acceptance on storefront (return a "store temporarily unavailable" page). All thresholds configurable in `platform_credit_settings`.

### 4. Merchant UI (extend existing Billing page)
- New tab **"GMV Commission"** on `/billing`:
  - This month's accrued commission (live counter), last month's invoice card with Pay Now button, history table.
  - Toggle "Auto-pay from AI credits".
  - Plan upsell card: "On Growth you'd save ₹X this month" (live calc from current accrual × delta).

### 5. Admin UI
- Extend `AdminRevenue`: add a "Collected vs accrued" column so we can see leakage.
- New page `/admin/commissions`:
  - Filter by store, status, period.
  - Actions: mark paid manually (offline payment), waive (with reason → audit log), re-send invoice email, download PDF.

### 6. Edge functions (new)
- `generate-commission-invoices` (cron)
- `create-commission-payment` (callable from Billing)
- `commission-pdf` (reuses invoice PDF code path from `next_invoice_number` / existing invoice generator)

### 7. RLS
- `order_commissions`: store owner can SELECT own rows; admin full; no INSERT/UPDATE from client.
- `commission_invoices`: store owner SELECT + UPDATE only on the `razorpay_*` fields via edge function; admin full.

## Non-goals (explicit, so we don't scope-creep)
- No retroactive commission on orders placed before this ships.
- No partial refunds re-prorating commission (full refund → waive, partial refund → keep accrual). Documented in Terms.
- No multi-currency — INR only.
- Partner commission share (existing `partners` table) is unaffected; we'll wire partner payouts from this invoice in a follow-up.

## Rollout
- Migration (additive only, no destructive change).
- Trigger goes live but only accrues from deploy time onward (no backfill).
- First invoice run: 1st of next month. Send a heads-up email to all merchants 7 days before via existing newsletter engine.
- Add to `mem://business/monetization-strategy`.

## Files touched (estimate, ~8 edits + 4 new)
- Migration: `order_commissions`, `commission_invoices`, trigger, RLS.
- Edge fns: `generate-commission-invoices`, `create-commission-payment`, `commission-pdf`; extend `razorpay-webhook`.
- Frontend: `src/pages/Billing.tsx` (new tab), `src/pages/admin/AdminCommissions.tsx` (new), `src/pages/admin/AdminRevenue.tsx` (add collected column), `src/App.tsx` (route).
- Memory: update monetization-strategy.

## One decision before I build
GMV base — confirm: **subtotal only (excludes tax & shipping)**, or **order total (includes both)**? Subtotal is the industry default and what most merchants expect. I'll go with subtotal unless you say otherwise.

