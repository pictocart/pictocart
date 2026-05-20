---
name: Premium Theme Payments
description: Razorpay-backed premium theme purchase, soft paywall on Customise, launch discount, pending-theme dashboard nudge
type: feature
---
- **Money flow**: client → `create-theme-purchase-order` edge fn (platform Razorpay keys) → Razorpay checkout → `razorpay-webhook` flips `theme_purchase_intents.status='paid'` and writes `theme_purchases` (packs) or appends to `stores.settings.purchased_themes` (master themes).
- **Tables**: `theme_purchase_intents` (kind: 'pack'|'master', status pending/paid/failed). `theme_master_projects.is_premium` flag + existing `price` numeric.
- **RLS**: Removed client INSERT on `theme_purchases` — only service role via webhook. Owners can SELECT own intents.
- **Launch discount**: 30% off first paid theme per store, computed server-side in `create-theme-purchase-order`.
- **Onboarding**: Premium master themes show a Crown ₹price badge in `StepTheme`. On Go-Live, if a premium theme was picked, `stores.settings.pending_premium_theme = { theme_id, selected_at }` is set and the store goes live anyway with the premium theme's default content.
- **Dashboard**: `PremiumThemePendingCard` reads `pending_premium_theme` and opens Razorpay inline. On success, calls `applyMasterTheme()` to re-seed overrides.
- **Customise**: If active master theme `is_premium` AND not in `purchased_themes`, the whole editor is disabled (`pointer-events-none opacity-50`) and an amber unlock card overlays at the top. Save is also blocked server-permissive but client-blocked.
- **Hook**: `usePremiumThemePurchase().purchase(kind, ref)` loads Razorpay SDK, opens checkout, polls intent until webhook confirms (12s budget).
- **Convenience levers**: UPI-first via prefill, inline modal (no redirects), 7-day refund window message, store goes live regardless of payment.
