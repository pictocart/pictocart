## Phase 4 — Partner Hierarchy (State & Regional Heads)

Introduce a multi-tier partner structure so Pic To Cart can be sold through Regional Heads → State Heads → Partners, with automatic commission splits on every license sale and store handover.

### 1. Roles & Hierarchy

Extend `partners` table with:
- `tier` enum: `regional_head` | `state_head` | `partner` (default `partner`)
- `parent_partner_id` (uuid, self-FK) — the upline
- `region_name` (text) — e.g. "North India" for regional heads
- `state_name` (text) — e.g. "Maharashtra" for state heads
- `override_commission_pct` (numeric) — share earned from downline sales

Add app_role `partner_head` for hierarchy management access.

### 2. Commission Splits

When a partner buys a license batch or a client pays for a handover:
- Partner earns existing commission
- State Head (parent) earns `state_head.override_commission_pct` of the sale
- Regional Head (grandparent) earns `regional_head.override_commission_pct` of the sale

Implemented via a new RPC `accrue_hierarchy_commissions(_partner_id, _amount, _source)` that writes rows into `partner_commissions` with a new `commission_type` column (`direct` | `override_state` | `override_regional`).

Hook into:
- `generate_licenses_for_batch` trigger (license purchase)
- `handover-verify-payment` edge function (client annual payment)

### 3. Admin UI (`/admin/partners`)

- Add **Tier**, **Parent**, **Region/State** columns
- New "Promote to State Head / Regional Head" action with dialog to set override %
- New "Assign Parent" action to attach partners to a State Head, and State Heads to a Regional Head
- Filter by tier

### 4. Head Dashboard (`/partner/hierarchy`)

New page for State / Regional Heads showing:
- Downline partners list with license counts, GMV, status
- Total override earnings this month / lifetime
- Commission breakdown (direct vs override)
- "Invite Partner" button (reuses `partner-invite` flow but auto-sets `parent_partner_id`)

Add nav entry in `PartnerDashboard` visible only when `tier <> 'partner'`.

### 5. Payouts

Update `partner_payouts` admin view to group by partner and show pending override commissions alongside direct ones. No payout logic change — same monthly cycle.

### 6. Emails

- `partner-promotion` template — sent when admin promotes a partner to State/Regional Head
- Update `partner-commissions-monthly` summary email (if exists) to break down direct vs override earnings

### Technical Notes

- Migration: alter `partners`, alter `partner_commissions`, create `accrue_hierarchy_commissions` RPC (SECURITY DEFINER), backfill `tier='partner'` for existing rows.
- RLS: heads can read their downline's `partners` / `partner_licenses` / `partner_commissions` rows via a new `is_in_downline(_user_id, _partner_id)` security-definer helper.
- Cycle protection: trigger on `partners` UPDATE prevents `parent_partner_id` cycles (max depth 3).
- No changes to the client-facing storefront or billing flows.

### Files to Create
- `supabase/functions/_shared/transactional-email-templates/partner-promotion.tsx`
- `src/pages/partner/PartnerHierarchy.tsx`
- `src/components/admin/PromotePartnerDialog.tsx`
- `src/components/admin/AssignParentDialog.tsx`

### Files to Edit
- `src/pages/admin/AdminPartners.tsx` — tier columns, promote/assign actions
- `src/pages/partner/PartnerDashboard.tsx` — hierarchy nav entry, override earnings card
- `src/App.tsx` — `/partner/hierarchy` route
- `supabase/functions/handover-verify-payment/index.ts` — call hierarchy RPC
- `supabase/functions/_shared/transactional-email-templates/registry.ts`
- Migration + types regen
