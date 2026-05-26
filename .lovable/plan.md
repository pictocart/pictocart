# Guided Onboarding Tour — Full Merchant Handholding

A first-time user walkthrough that lights up every important control on every dashboard/settings page with a tooltip whose arrow points **precisely** at the element it describes. Users can skip, replay from Help, or resume where they left off.

## Approach

Use **driver.js** (lightweight, ~10kb, no deps, MIT). It supports:
- Precise SVG-cutout highlight around a real DOM element (arrow always pinned to the anchor — no drift)
- Step-by-step popovers with Next / Back / Skip / Done
- Per-route tours (start on mount when not yet completed)
- Auto-scrolls element into view, repositions on resize/scroll

Why not Shopify-style custom popover? driver.js already solves arrow precision, viewport collision and scroll-locking — building this from scratch is weeks of edge-case work.

## Architecture

```text
src/tours/
  TourProvider.tsx        // wraps app, exposes useTour()
  useRouteTour.ts         // hook: starts tour for current pathname if unseen
  registry.ts             // pathname -> Tour definition
  tours/
    dashboard.ts
    products-list.ts
    product-form.ts       // post-AI: "Now fill inventory", "Set variants"...
    orders.ts
    order-detail.ts
    customise.ts
    store-design.ts
    themes.ts
    shipping.ts
    payments.ts
    cod.ts
    domain.ts
    seo.ts
    email-branding.ts
    coupons.ts
    categories.ts
    blog.ts
    customers.ts
    analytics.ts
    sourcing.ts
    wallet.ts
    accounts.ts           // covers cash book, khata, expenses, GST, P&L, suppliers, inventory ledger
    onboarding.ts         // overlay on each wizard step
```

Each tour = array of `{ element: '[data-tour="..."]', title, description, side, align }`.

## Anchoring (precision arrow)

Add `data-tour="<id>"` attributes directly on the target element in each page — never on a wrapper, so the arrow lands on the exact button/input. Examples:

- `HeroGreeting` "Add product with AI" → `data-tour="hero-add-product"`
- `Dashboard` View store ribbon → `data-tour="dash-view-store"`
- `ProductForm` inventory field → `data-tour="product-inventory"`, variants section → `data-tour="product-variants"`, shipping weight → `data-tour="product-shipping"`, SEO accordion → `data-tour="product-seo"`
- `OrderList` first row actions → `data-tour="order-row-actions"`
- `ShippingSettings` Shiprocket creds card → `data-tour="ship-credentials"`
- `PaymentSettings` Razorpay key field → `data-tour="pay-razorpay-key"`
- `DomainSettings` DNS records table → `data-tour="domain-dns"`
- …(one per highlighted step across the listed pages)

driver.js receives the selector string, queries it live, and renders the SVG overlay around the element's bounding box, so the pointer arrow is always correctly aligned even after scroll/resize.

## Persistence

`tour_progress` table:
```sql
user_id uuid pk, tour_key text pk, completed_at timestamptz, skipped boolean
```
RLS: user can read/write own rows. Hook `useRouteTour` checks this before auto-starting; "Replay tour" button in Help page wipes the row.

Fallback before the row syncs: `localStorage["tour:<key>"] = "done"` for instant UX.

## Special flows

1. **Onboarding wizard** — each of the 7 steps gets a 1–2 step intro tour (e.g. StepUploadImage: "Tap to upload — AI will write title, price, description"). Tours are step-scoped, not route-scoped.
2. **ProductForm after AI fill** — when AI completion event fires, trigger `product-form-postai` tour that walks: Inventory → Variants → Shipping weight → SEO → Save. Exactly the "Fill the inventory / left spaces" example from the request.
3. **Empty states** — if OrderList has 0 orders, run the "share your store" tour variant instead of order-row tour.
4. **Mobile** — driver.js handles small viewports; popovers auto-flip side. Bottom-nav steps use `side: top`.

## Help/Replay

`src/pages/Help.tsx` gets a "Take the tour again" section listing every tour with a Replay button (clears progress + navigates + starts).

## Files to create

- `src/tours/TourProvider.tsx`, `useRouteTour.ts`, `registry.ts`, 20+ tour definition files
- `supabase/migrations/<ts>_tour_progress.sql`
- Add `<TourProvider>` in `src/App.tsx`
- Add `useRouteTour()` call inside `DashboardShell` and inside `Onboarding.tsx` step renderer

## Files to edit (add `data-tour` anchors only — zero logic change)

Dashboard.tsx, HeroGreeting.tsx, SmartActions.tsx, ProductList.tsx, ProductForm.tsx, OrderList.tsx, OrderDetail.tsx, Customise.tsx, StoreDesign.tsx, Themes.tsx, ShippingSettings.tsx, PaymentSettings.tsx, CodSettings.tsx, DomainSettings.tsx, SEOSettings.tsx, EmailBrandingSettings.tsx, CouponList.tsx, Categories.tsx, BlogPosts.tsx, Customers.tsx, StoreAnalytics.tsx, Sourcing.tsx, Wallet.tsx, accounts/* (7 files), Onboarding step components (8 files), DashboardLayout.tsx (sidebar item anchors), Help.tsx.

## Dependency

`bun add driver.js` (≈10kb gz, MIT).

## Out of scope

- Storefront customer pages (request is about merchant handholding)
- Admin panel (super-admin only, not a "new user")

## Open questions

1. Auto-start every tour on first visit, or surface a single "Start guided tour" banner on the dashboard that opens them on demand? (default: auto-start once per page, dismissible)
2. Allow language localization now or English-only for v1? (default: English only)