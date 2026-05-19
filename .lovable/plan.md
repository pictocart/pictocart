# Phase A2 + A4 — Menu Builder & Mode-aware Guest Checkout

Picking up where A1 (schema + fulfillment settings + QR codes) left off. Next we make the storefront actually usable for a café/restaurant: a menu page customers can browse, and a checkout that adapts to dine-in / takeaway / delivery without forcing sign-up.

## A2 — Menu Builder (dashboard side)

**New page `src/pages/Menu.tsx`** (route `/menu`, only shown in sidebar when `dine_in_enabled || takeaway_enabled` OR category is `food`/`grocery`).

- Drag-reorder sections built on existing categories (`categories.parent_id` already supports sections like Starters / Mains / Drinks).
- Per-item drawer to edit `menu_meta` jsonb on `products`:
  - `diet`: veg / non_veg / egg (color-coded badge)
  - `spice_level`: 0–3
  - `allergens[]`: nuts, dairy, gluten, …
  - `prep_minutes`: number
  - `available_modes[]`: dine_in / takeaway / delivery (default = all enabled)
  - `daily_window`: optional `{ from, to }` for breakfast-only items, etc.
- Reuses existing `useProducts`, `useCategories` hooks — no fork of the products table.
- Bulk action: "Mark all items veg" / "Set 15-min prep for section".

**New hook `src/hooks/useMenu.ts`** — wraps products+categories grouped into menu sections, filtered by `available_modes` for storefront use.

## A4 — Mode-aware storefront menu + checkout

**Public routes** (no auth):
- `/store/:slug/menu` — full menu with mode picker pinned to top
- `/menu/t/:tableToken` — auto-selects dine-in + binds table, hides address/phone entirely
- `/menu/takeaway` — phone-only checkout
- `/menu/delivery` — falls back to existing address flow

**New components** under `src/components/storefront/menu/`:
- `MenuPage.tsx` — sticky mode picker + scroll-spy section nav + item cards with veg dot, price, prep time, "+" button
- `ModePicker.tsx` — 3-tab selector (only shows enabled modes)
- `MenuItemCard.tsx` — compact card, veg/non-veg dot, spice icons, "Add" button
- `TableBanner.tsx` — "You're ordering at Table 4 · clear" pill on table-bound carts

**Cart changes** (`src/hooks/useCart.ts`):
- Add `fulfillment_mode` and `table_label` to cart state; persist alongside items in `localStorage`.
- Table token sets a 4-hour cookie binding cart to that table (prevents cross-table mix-ups).
- Filter out items whose `available_modes` excludes the active mode.

**Checkout split** (`src/pages/StorefrontCheckout.tsx` refactor):
- Three variants share one flow, branched on `cart.fulfillment_mode`:
  - **Dine-in**: no fields. Confirm button → creates order with `customer_user_id=NULL`, `guest_tracking_code`, `table_label`, `prep_status='received'`, payment defaults to "Pay at counter". Shows order code + estimated time on success screen.
  - **Takeaway**: single phone field (+ optional name). Creates guest order, payment = Razorpay or pay-at-pickup based on `takeaway_payment_modes`.
  - **Delivery**: existing flow stays, just tagged with `fulfillment_mode='delivery'`.
- Skip shipping fee for dine-in/takeaway; apply `delivery_fee_flat` + `delivery_min_order` for delivery.
- Order success page now shows `prep_status` timeline (Received → Preparing → Ready) for food modes.

**Public order tracking** `/track/:code` — looks up order by `guest_tracking_code`, shows current `prep_status`, no login needed.

## Sidebar / nav wiring

- Add "Menu" entry to `DashboardLayout.tsx` between Products and Categories, conditional on fulfillment settings or food category.
- Storefront header gets a "Menu" link when any non-delivery mode is enabled.

## Technical notes (for the dev)

- `useCart` migration: existing carts default to `{ fulfillment_mode: 'delivery' }` so current shoppers see no change.
- Guest order INSERT policy from A1 already allows anon dine-in/takeaway when store has those modes enabled — no new RLS needed for A4.
- `prep_status` is a separate column from `status`; retail orders ignore it. No enum change to `status`.
- Order success screen polls `prep_status` via `supabase.channel` (realtime publication added in A1 migration).
- Menu page is server-rendered via `useStorefrontBundle` (extend the bundle to include `menu_meta` and grouped sections) so first paint is instant on QR scan.
- Out of scope here: kitchen desk (A5), notifications (A7), food-menu theme archetype (A6) — they ship in the next batch.

## Files to create
```text
src/pages/Menu.tsx
src/hooks/useMenu.ts
src/components/storefront/menu/MenuPage.tsx
src/components/storefront/menu/ModePicker.tsx
src/components/storefront/menu/MenuItemCard.tsx
src/components/storefront/menu/TableBanner.tsx
src/pages/storefront/OrderTracking.tsx        (/track/:code)
```

## Files to edit
```text
src/App.tsx                         (new public routes + /menu dashboard route)
src/components/DashboardLayout.tsx  (Menu sidebar entry)
src/hooks/useCart.ts                (mode + table state)
src/pages/StorefrontCheckout.tsx    (3-way branch)
src/hooks/useStorefrontBundle.ts    (include menu_meta + sections)
src/components/storefront/StorefrontLayout.tsx  (Menu link in header)
```

Approve to start. After A2+A4 land, next batch is A5 (kitchen desk) + A6 (food-menu theme archetype) + A7 (notifications) so a café is fully production-ready.