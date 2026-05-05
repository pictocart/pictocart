
# Pic To Cart — Phase 2 Roadmap

Phase 1 (Provisioning + Themes cleanup) is shipped. This is the next 4 phases, sequenced by **revenue impact** and **build complexity**.

---

## Phase order & rationale

```text
Phase 6  Freelancer / Commission Program   (2-3 days)  ← cheapest, viral growth
Phase 7  Social Media Toolkit              (3-4 days)  ← lifts every existing seller
Phase 8  Solution Partners (Agencies)      (4-5 days)  ← B2B revenue, builds on Phase 6
Phase 9  Dropshipping Marketplace          (1-2 weeks) ← biggest, last
```

Reason: Phase 6 + 7 boost current sellers immediately. Phase 8 is a natural extension of Phase 6. Phase 9 is a separate product surface and warrants its own focus block.

---

## Phase 6 — Freelancer / Commission Program

**Goal:** Let store-builders, designers, and influencers sign up, get a referral link, and earn recurring commission on every seller they bring in.

### Schema
- `partners` (id, user_id, type='freelancer', referral_code unique, name, upi_id, pan, kyc_status, payout_email)
- `partner_referrals` (id, partner_id, store_id, signed_up_at, first_paid_at, status)
- `partner_commissions` (id, partner_id, referral_id, period_month, base_amount, commission_amount, status: pending/paid/clawback)
- `partner_payouts` (id, partner_id, amount, period, utr, paid_at)
- Add `referred_by_code` to `stores`

### Commission model (proposed default — confirm later)
- **20% of seller's monthly subscription for first 12 months**
- Excludes free plan; clawback if seller refunds within 30 days
- Cron job runs on the 1st of each month → computes commissions, marks `pending`
- Admin clicks "Mark Paid" + UTR → status=paid

### UI
- `/partners/signup` — public landing + form
- `/partners/dashboard` — referral link, click stats, signups, MRR contribution, pending payout, history
- `/admin/partners` — approve KYC, view all partners, trigger payout run, override commission

### Acceptance
- Anyone hitting `?ref=CODE` on landing page → cookie persists 30 days → applied at signup
- Partner sees commission accrue in near real-time
- Admin can pay out and mark UTR

---

## Phase 7 — Social Media Toolkit

**Goal:** Help sellers get traffic without leaving the dashboard.

### Tier A — ship first (3 days)
- **One-click share kit per product**: WhatsApp message, IG story image (auto-generated 1080x1920), FB post, X post — all with deep link back to product.
- **WhatsApp catalog export**: generate `.csv` and one-tap share to WA Business catalog.
- **Auto-generated marketing creatives**: Gemini generates 5 caption variants + creates a square promo image with product photo + price + brand colors.
- **UTM tracker**: every share link auto-tagged; `/dashboard/marketing` shows clicks per channel per product.
- **Schema**: `marketing_share_links` (id, store_id, product_id, channel, utm, clicks, created_at)

### Tier B — defer to Phase 7.5
Meta Graph API auto-posting + post scheduler. Heavy build (OAuth, queue, retry, Meta review). Park until Tier A shows traction.

### UI
- New seller-side page `/dashboard/marketing` with tabs: Share Kit · Creatives · Performance
- Per-product "Share" button injected on `ProductList` and `StorefrontProduct`

### Acceptance
- Generate creative for any product in <5s
- Click on shared link in WhatsApp opens product page and increments counter

---

## Phase 8 — Solution Partners (Agencies)

**Goal:** Let an agency manage 10–500 client stores from one login with revenue share + white-label storefront for their brand.

### Schema (extends Phase 6 partners)
- `partners.type = 'agency'` (reuse table)
- `agency_clients` (agency_id, store_id, role: owner/manager, added_at)
- `agencies` extras: logo_url, brand_color, support_email, custom_subdomain (e.g. acme.partners.pictocart.in)
- `agency_payouts` rolls up commissions across all clients

### Permissions
- Agency staff can sign in and switch between client stores via a "Client switcher" header dropdown
- New role `agency_admin` in `user_roles` (already-existing pattern)
- RLS: `agency_admin` can read/write any store in their `agency_clients` map

### Commission
- 30% recurring of every client's subscription (higher than freelancer to incentivize agency model)
- Optional: agencies can mark up themes/services and bill clients via wallet credits (revisit later)

### UI
- `/agency` — agency dashboard: client list, MRR, churn risk, pending tasks per client
- `/agency/clients/new` — onboard new client (creates store + invites owner email)
- `/admin/partners` gets a tab to manage agencies separately

### Acceptance
- Agency can add a new client store in <60s
- Agency dashboard shows aggregate revenue across all clients
- Clients still see their own store with no agency branding (unless white-label flag enabled)

---

## Phase 9 — Dropshipping Marketplace

**Goal:** Suppliers list inventory; sellers import in one click; orders auto-route to supplier; supplier ships; platform settles.

### Roles
- **Supplier**: lists products, sets cost price, manages inventory + dispatch
- **Seller**: imports supplier product to own store at retail price (margin = retail − cost)
- **Customer**: buys as usual; doesn't see supplier
- **Platform**: takes commission, splits payout, mediates disputes

### Schema
- `suppliers` (id, user_id, business_name, gstin, kyc, payout_bank, rating)
- `supplier_products` (id, supplier_id, title, description, images, cost_price, mrp, stock, hsn, weight, ship_from_pincode, category, status)
- `dropship_listings` (id, store_id, supplier_product_id, retail_price, custom_title, custom_images, is_active)
- `orders` extension: `fulfilled_by_supplier_id`, `supplier_payout_amount`, `supplier_status`
- `supplier_payouts` (id, supplier_id, period, amount, utr, paid_at)

### Order flow
```text
Customer pays seller (Razorpay)
  -> Order created with fulfilled_by_supplier_id
  -> Supplier notified (email + dashboard)
  -> Supplier dispatches via Delhivery (uses platform Delhivery account)
  -> AWB updates flow back; customer notified
  -> On delivery: settlement runs
        cost_price -> supplier
        platform_commission -> platform
        margin - commission -> seller wallet
```

### UI
- `/suppliers/signup` + `/suppliers/dashboard` (mirrors seller dashboard)
- New seller page `/dashboard/dropship/marketplace` — browse supplier catalog, "Import" button
- Imported items appear in Products list with a "Dropship" badge
- Admin: `/admin/dropship` — approve suppliers, monitor SLA, dispute panel

### Acceptance
- Seller imports a product in 1 click; appears in their store
- Customer order auto-creates a supplier dispatch task
- Settlement splits money correctly across 3 parties

### Hard parts to flag now
- KYC + bank verification for suppliers (use Cashfree Payouts or Razorpay X)
- Inventory sync if supplier sells on multiple seller stores (atomic decrement)
- Returns/RTO routing to supplier address, not seller
- Margin protection: prevent two sellers from racing prices to zero

---

## Cross-cutting infrastructure (build once, reused by all phases)

1. **Wallet & payout engine** — already partially exists (`wallet`, `wallet_transactions`). Extend to support: partner payouts, supplier payouts, agency settlements. Use Razorpay X or Cashfree Payouts for UPI/NEFT.
2. **Role & permission expansion** — current `user_roles` enum (`admin`, `user`) needs: `freelancer`, `agency_admin`, `agency_staff`, `supplier`. Single migration adds all four.
3. **Notification templates** — reuse `send-transactional-email`; add templates for: partner-signup, partner-payout, supplier-new-order, supplier-payout, agency-client-added.
4. **Attribution cookie** — single utility for `?ref=` and `?utm_*` so Phases 6, 7, 8 share the same tracking.

---

## Memory updates after approval

Save these so future sessions don't lose context:
- `mem://business/phase2-roadmap` — this whole document, summarised
- `mem://features/partner-program` — once Phase 6 ships
- `mem://features/social-toolkit` — once Phase 7 ships
- `mem://features/agency-portal` — once Phase 8 ships
- `mem://features/dropshipping` — once Phase 9 ships
- Update `mem://index.md` Core to mention "Multi-role platform: sellers, freelancers, agencies, suppliers"

---

## Suggested next action

Approve this plan, then we start **Phase 6 (Freelancer / Commission Program)** — smallest, fastest to validate, and creates a growth flywheel before bigger phases.

Open decisions to confirm before Phase 6 starts:
1. Commission %: 20% of subscription for 12 months — yes / change?
2. Min payout threshold: ₹500 — yes / change?
3. KYC: PAN + UPI only at signup; bank details on first payout — yes / change?

Reply "go ahead with defaults" or send your changes.
