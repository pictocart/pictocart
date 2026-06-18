# Partner Program v2 — License-Based Reseller Model

A complete pivot from the current referral/commission model to an **admin-issued license** model. Partners (Digital Marketing Agencies, Freelancers, Interns/Employees) get invited by admin with a fixed number of licenses at a custom price. Each license = 1 client store. Partners build the entire store, hand it to the client, and the client pays Pic To Cart the annual plan fee directly.

---

## Core Concepts

| Term | Meaning |
|---|---|
| **Partner** | Agency / Freelancer / Intern, onboarded by admin only |
| **License** | A credit that lets a partner spin up 1 client store. Sold in bulk to partner at a negotiated price (₹0 for interns) |
| **Client Store** | The actual seller store, billed annually at ₹5,500 / ₹16,500 / ₹55,000 (Starter / Growth / Scale) directly to the client |
| **Partner Build Mode** | Partner creates & customizes the store under their own login, then transfers ownership to the client by entering the client's email |
| **State Head / Regional Head** | (Phase 4) Sub-admins who can issue licenses from their own allotted pool |

---

## Phase 1 — Foundation: Schema & Admin Invite Flow

**Goal:** Admin can create a partner, allocate N licenses at a custom price, and the partner receives a branded Pic To Cart invite email.

### Database changes
- New enum `partner_type`: `agency | freelancer | intern`
- Extend `partners` table:
  - `partner_type`, `invited_by_admin`, `invite_status` (`pending | active | suspended`), `total_licenses_purchased`, `license_price_per_unit`, `total_amount_paid`, `notes`
  - Remove dependency on public signup (existing `PartnersSignup.tsx` route will be retired)
- New table `partner_license_batches`: each admin allocation = one batch (qty, unit_price, total, invoice ref, issued_at, issued_by)
- New table `partner_licenses`: one row per license unit (`partner_id`, `batch_id`, `status: available | consumed | revoked`, `consumed_by_store_id`, `consumed_at`)
- New table `partner_invites`: secure token, email, expires_at, accepted_at
- Helper: `has_role(uid, 'partner')` + new app_role `partner`

### Admin UI (`/admin/partners` rebuild)
- "Invite Partner" dialog: email, name, type (Agency/Freelancer/Intern), phone, # of licenses, price per license (auto ₹0 for intern), notes
- Partners list: licenses purchased / used / available, total revenue, client stores
- "Add more licenses" action on each partner (creates a new batch)
- Suspend / revoke / view audit trail

### Edge function `partner-invite`
- Generates signed token, stores in `partner_invites`, sends email via Lovable transactional email
- Email branded **Pic To Cart** only — no Lovable references, custom sender domain
- CTA: "Accept invite & set password" → `/partner/accept?token=...`

### Accept-invite flow (`/partner/accept`)
- Validates token
- Form: Password + Confirm Password (zod validation, HIBP enabled)
- Creates auth user with `partner` role and links to `partners` row
- Redirects to `/partner` dashboard

---

## Phase 2 — Partner Dashboard & Build Mode

**Goal:** Partner can spend a license to spin up a new client store, fully customize it, then hand it over to the client.

### Partner Dashboard (`/partner`)
- Header: branded Pic To Cart (no Lovable badge for partner role)
- Stats: Available licenses, Active client stores, Pending handovers, Total clients on each plan
- "Create new client store" button (disabled when 0 licenses available)
- Client store list with status: `Building | Awaiting client acceptance | Live | Plan expired`
- License history (batches purchased, dates, prices) — read only

### Create Client Store wizard
1. Consume 1 license (atomic RPC `consume_partner_license`)
2. Run the existing 7-step onboarding wizard **on behalf of** the client (store is owned by partner temporarily, flag `owned_by_partner = true`, `pending_client_email = null` yet)
3. Partner can use all paid features regardless of plan during build (build-mode override)

### Build Mode permissions
- `stores.owned_by_partner_id` column added
- RLS: partner can fully manage stores where `owned_by_partner_id = auth.uid()` AND `client_user_id IS NULL`
- Hide billing/credits UI from partner inside build mode (they're not paying)
- Plan selector shown but billed only on handover

### Handover flow
- "Send to client" → partner enters client email + selects plan (Starter/Growth/Scale)
- Creates `store_handover` record + sends client an invite email (Pic To Cart branded) with set-password link
- Once client accepts and pays the annual plan via Razorpay:
  - `stores.user_id` re-assigned to client
  - `stores.owned_by_partner_id` retained for analytics
  - Subscription activated for 365 days
  - Partner sees store status update to **Live**
- Partner retains read-only "view as" access (toggle in admin settings)

---

## Phase 3 — Client Side & Billing

**Goal:** Client pays Pic To Cart directly for the annual plan; partner gets nothing per-store (their margin is whatever they charged the client upfront for the build).

### Client accept flow (`/store-invite/accept?token=...`)
- Set password
- Razorpay checkout for selected annual plan
- On success: store goes live, plan = 365 days, COD/payment/shipping all activate
- Welcome email with login link to their dashboard

### Annual plan changes
- Extend `plan_configs` with `annual_price_inr` (5500 / 16500 / 55000)
- `subscriptions.billing_cycle` enum: `monthly | annual`
- Annual plans get a single Razorpay one-time payment (not subscription) + 365-day expiry
- Auto-renewal reminder 30/7/1 days before expiry (email + dashboard banner)

### What changes for existing flow
- Public signup at `/auth` continues to work (direct sellers)
- Partner-issued stores skip onboarding payment screen (partner already chose plan)
- Commission/referral tables kept but marked legacy (no new writes)

---

## Phase 4 — Hierarchy: State Head & Regional Head

**Goal:** Admin allocates a license pool to a State Head; State Head allocates to Regional Heads or directly to Partners; full audit trail.

### Schema
- New table `license_allocations`: tree of allocations (admin → state_head → regional_head → partner)
- New roles: `state_head`, `regional_head`
- Each role has `parent_id` and `license_pool_balance`

### UI
- `/admin/hierarchy` — assign State Heads, view tree, set commission overrides
- `/state-head` dashboard — allocate to Regional Heads + create partners directly
- `/regional-head` dashboard — create partners only
- Every license consumed bubbles analytics up the tree (no commission unless explicitly set)

---

## Phase 5 — Polish & White-Label

- All partner-facing emails through Pic To Cart sender domain, custom React Email templates
- Partner panel uses only Pic To Cart logo/colors; remove all Lovable badges via publish settings
- Partner help center, T&C, license agreement PDF (signed at first login)
- Audit log of every license issued / consumed / revoked
- CSV export of partners, licenses, stores, revenue

---

## Technical Details

### New tables (Phase 1)
```text
partner_license_batches(id, partner_id, qty, unit_price_inr, total_inr, invoice_ref, notes, issued_by, issued_at)
partner_licenses(id, partner_id, batch_id, status, consumed_by_store_id, consumed_at)
partner_invites(id, partner_id, token_hash, email, expires_at, accepted_at)
store_handovers(id, store_id, partner_id, client_email, plan, token_hash, status, accepted_at, paid_at)
```

### New RPCs
- `consume_partner_license(partner_id)` → returns license_id or raises
- `transfer_store_to_client(store_id, client_user_id, plan, billing_cycle)`
- `revoke_partner_license(license_id)` (admin only)

### New edge functions
- `partner-invite` — send branded invite
- `partner-accept` — validate token, create user, link partner
- `store-handover-invite` — send client invite
- `store-handover-accept` — set password + Razorpay order
- `annual-plan-renewal-reminder` (cron)

### Routes
- `/partner/accept` (public) — set password
- `/partner` (partner role) — dashboard
- `/partner/stores/new` — build wizard
- `/partner/stores/:id` — manage store in build mode
- `/store-invite/accept` (public) — client accept + pay
- `/admin/partners` — rebuilt admin panel
- `/admin/licenses` — global license ledger

### Security
- `partner` role cannot see other partners' stores or licenses
- RLS on every new table; SECURITY DEFINER RPCs for license consumption
- Token-based invites: SHA-256 hashed in DB, single-use, 7-day expiry
- Service-role-only edge functions for all email + Razorpay flows

---

## Out of Scope (this plan)
- Migrating existing referral partners to license model (will be a one-off data script later)
- Mobile app for partners
- Partner-to-partner license trading

---

**Recommended execution:** Build Phase 1 + Phase 2 first (MVP that proves the model end-to-end with 1 pilot agency), then Phase 3 billing, then Phase 4 hierarchy, then Phase 5 polish.
