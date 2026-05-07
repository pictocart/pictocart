# Pictocart — Completion Roadmap (Web Platform)

Below is an honest audit of every feature area against the original scope, marked with current completion %. Anything <100% has a concrete completion plan. The native mobile app is excluded (handed to Emergent).

---

## Completion Scorecard

| # | Area | Status | % |
|---|---|---|---|
| 1 | Seller onboarding (7-step) | Done | 100 |
| 2 | Product CRUD + variants + images | Done | 100 |
| 3 | Storefront rendering + themes | Done | 100 |
| 4 | Customer auth (per-store tenancy) | Done | 100 |
| 5 | Cart + one-page checkout | Done | 100 |
| 6 | **Razorpay payments** | Live keys path works; webhook + refund flow partial | **80** |
| 7 | **COD with risk controls** | Toggle works; no fraud guardrails | **70** |
| 8 | **Order management + invoices** | Detail + PDF done; bulk ops + returns missing | **75** |
| 9 | **Shipping (Delhivery)** | AWB + tracking done; pickup scheduling + multi-courier missing | **70** |
| 10 | **Coupons & discounts** | Done; no auto-apply / BOGO / tiered | **85** |
| 11 | **Reviews & ratings** | Done; no moderation queue / reply | **80** |
| 12 | **Customer notifications (email)** | Order + shipping emails live; abandoned cart + win-back missing | **75** |
| 13 | **Push notifications (web/PWA)** | Token table + edge fn ready; UI subscribe + send pipeline missing | **40** |
| 14 | **WhatsApp / SMS notifications** | Not started | **10** |
| 15 | **SEO** | SEOHead + sitemap basic; structured data partial, no robots per-store | **70** |
| 16 | **Marketing (blog, newsletter)** | Done; no campaign send tool | **80** |
| 17 | **Custom domains** | DNS verify works; SSL auto-renew telemetry missing | **85** |
| 18 | **Wallet & billing** | Manual recharge UI; Razorpay top-up + invoices for credits missing | **65** |
| 19 | **Subscription / Plans** | Schema + admin page; checkout + entitlement gates partial | **55** |
| 20 | **Super Admin panel** | Most pages done; disputes + payouts incomplete | **80** |
| 21 | **Partner program** | Signup + dashboard; payout flow + commission ledger missing | **60** |
| 22 | **Theme marketplace** | AI generation + purchase done; preview-before-buy partial | **85** |
| 23 | **AI engagement / health** | Score live; weekly digest email missing | **75** |
| 24 | **Analytics (seller)** | Revenue chart + funnel; cohort + LTV missing | **70** |
| 25 | **Customer accounts** | Auth, addresses, orders, wishlist | 100 |
| 26 | **Legal / compliance** | Policies generated; GST invoice numbering + audit log missing | **80** |
| 27 | **PWA / install** | Manifest + bottom nav; offline cache + install prompt missing | **70** |
| 28 | **Performance / Lighthouse** | Acceptable; no image CDN, no route preload | **75** |
| 29 | **Error monitoring & logs** | Edge fn logs only; no Sentry-style client capture | **40** |
| 30 | **Test coverage** | Vitest scaffold + 1 example; no E2E | **15** |

Native mobile (Emergent) — **out of scope** for this plan.

---

## Completion Plan (grouped by sprint, ~1–2 weeks each)

### Sprint A — Money & Trust (highest revenue impact)

**A1. Razorpay completion (#6) → 100%**
- `razorpay-webhook` edge function: verify HMAC, mark order `paid`, idempotency table `payment_events`.
- Refund UI on OrderDetail → `razorpay-refund` edge fn (full + partial).
- Failed-payment retry email.

**A2. COD risk controls (#7) → 100%**
- Per-store COD rules: max order value, pincode allowlist, min orders before COD.
- Phone OTP verify before placing COD order (reuse Supabase phone OTP).
- Auto-cancel after N undelivered COD attempts.

**A3. Wallet recharge via Razorpay (#18) → 100%**
- `wallet-recharge-create-order` + `wallet-recharge-verify` edge fns.
- GST tax invoice PDF for each top-up.
- Low-balance email at <100 credits.

**A4. Subscription checkout (#19) → 100%**
- Razorpay subscription plans (Free / Pro ₹499 / Business ₹1499).
- Edge fn `subscription-webhook` updates `subscriptions` table.
- Entitlement gates: products>30, themes>1, custom domain → require Pro.

---

### Sprint B — Operations (orders, shipping, returns)

**B1. Orders polish (#8) → 100%**
- Bulk actions: mark fulfilled, print labels, export CSV.
- Returns/RMA flow: customer requests → seller approves → refund.
- Sequential GST-compliant invoice numbering (per FY, per store).

**B2. Shipping expansion (#9) → 100%**
- Delhivery pickup scheduling endpoint.
- Add Shiprocket as 2nd courier (rate compare in ShipOrderDialog).
- Tracking webhook → auto-update order status + customer email.

**B3. Reviews moderation (#11) → 100%**
- Admin queue: hide / approve / reply.
- Auto-flag profanity (Lovable AI).
- "Verified Purchase" already done; add reply thread.

---

### Sprint C — Growth (notifications, marketing)

**C1. Notifications expansion (#12, #13, #14) → 100%**
- Web push: VAPID keys, `useWebPush` hook, subscribe button in customer account; reuse `seller_push_tokens` pattern for `customer_push_tokens`.
- Abandoned cart job: cron edge fn every 1h, email + push after 3h, 24h, 72h.
- WhatsApp via Interakt/Gupshup (seller-provided API key) — reuse send-transactional-email pattern.
- SMS fallback via MSG91 for OTP + order updates.

**C2. Coupons advanced (#10) → 100%**
- Auto-apply best coupon at checkout.
- BOGO (buy X get Y) rule type.
- Tiered (₹500 off above ₹2000).

**C3. SEO finishing (#15) → 100%**
- Per-store `robots.txt` edge fn.
- JSON-LD: Product, BreadcrumbList, Organization, AggregateRating.
- Sitemap split: products/blog/static, gzip.

**C4. Newsletter campaigns (#16) → 100%**
- Compose UI in `/subscribers`, AI subject suggestions.
- Send via Resend batches; open/click tracking via redirect proxy.

---

### Sprint D — Platform health

**D1. Custom domain SSL telemetry (#17) → 100%**
- Cron checks cert expiry per domain → email seller 14d before.

**D2. Super Admin disputes & payouts (#20) → 100%**
- Disputes inbox (Razorpay disputes API webhook).
- Monthly payout ledger per seller (commission deducted, GST report).

**D3. Partner payout (#21) → 100%**
- Commission ledger table, monthly payout button (manual UPI), CSV export for accountant.

**D4. Theme marketplace preview (#22) → 100%**
- Live preview iframe with seller's products before purchase.

**D5. AI weekly digest (#23) → 100%**
- Cron Sunday 8am: generate digest email per seller (sales, top product, AI tips).

**D6. Analytics depth (#24) → 100%**
- Cohort retention chart, customer LTV, repeat-rate widget on Dashboard.

---

### Sprint E — Quality, performance, compliance

**E1. PWA polish (#27) → 100%**
- Workbox runtime cache (storefront product pages, images).
- A2HS prompt with custom UI.
- Offline fallback page.

**E2. Performance (#28) → 100%**
- Cloudflare Image Resizing in front of Supabase Storage.
- Route-level `React.lazy` for admin + storefront chunks.
- Preload hero image + LCP font.

**E3. Error monitoring (#29) → 100%**
- Lightweight client logger → `client_errors` table (already partially in `errorReporter.ts`); add severity, dedupe, admin viewer.
- Optional Sentry connector (keep ours as default to avoid extra cost).

**E4. Test coverage (#30) → 70%**
- Playwright E2E: signup → onboarding → publish → place order → fulfil.
- Vitest: hooks (useCart, useCustomerAuth, useCoupons), edge fn pure helpers.
- Target 70% — full 100% is overkill for current stage.

**E5. GST + audit (#26) → 100%**
- Sequential invoice numbering with FY reset.
- Audit log: who changed price/stock/order, IP, timestamp.

---

## Technical Notes (for engineers)

- All new edge fns: `verify_jwt = true` except webhooks (`razorpay-webhook`, `delhivery-webhook`, `subscription-webhook`).
- New tables: `payment_events`, `customer_push_tokens`, `web_push_subscriptions`, `cod_rules`, `returns`, `invoice_counters`, `audit_log`, `partner_commission_ledger`, `disputes`, `client_errors`, `whatsapp_settings`.
- All tables require RLS — store-scoped `has_store_access(store_id)` helper already exists.
- Cron jobs via `pg_cron` + Supabase Edge: abandoned cart, weekly digest, SSL check, low-balance.
- Reuse existing Resend multi-domain sender for all new emails.
- No new third-party dependencies for V1 except Razorpay subscription SDK (already loaded) and `web-push` (npm) for VAPID.

---

## Estimated effort

- Sprint A: 5–7 days
- Sprint B: 5–7 days
- Sprint C: 7–10 days
- Sprint D: 5–7 days
- Sprint E: 7–10 days

**Total: ~5–6 weeks of focused build to take the web platform from current ~75% to 100%.**

Approve and I'll start with **Sprint A1 (Razorpay webhook + refunds)** since that unblocks real revenue.
