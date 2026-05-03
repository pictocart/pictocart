# PicToCart 2.0 — Cockpit Model with Per-Client Lovable Storefronts

## The Core Pivot

Stop trying to make one React app serve every custom domain via Cloudflare-for-SaaS (which keeps failing with 1014, SSL, and DNS edge cases). Instead:

- **PicToCart.in** = the **Seller Cockpit** (orders, products, payments, analytics, content editor). One app, one codebase, one domain you fully control.
- **Each client's storefront** = a **separate Lovable project in your Antariksh workspace**, remixed from a master "Storefront Template" project. Each project natively connects its own custom domain through Lovable's domain system (which already works reliably).
- **Shared Supabase** = both the cockpit and every storefront project read/write the *same* database using the same anon key, scoped by `store_id` via RLS.

Result: customer sees `indilipi.shop` working with HTTPS in minutes (Lovable handles it), and manages everything from `pictocart.in/dashboard`. You stop fighting Cloudflare SaaS entirely.

---

## Architecture

```text
                    ┌─────────────────────────────┐
                    │   Shared Supabase (current) │
                    │   stores / products / orders│
                    └──────────────▲──────────────┘
                                   │ same anon key + RLS by store_id
              ┌────────────────────┼────────────────────┐
              │                    │                    │
   ┌──────────┴───────┐  ┌─────────┴────────┐  ┌────────┴────────┐
   │  PicToCart       │  │ Storefront proj  │  │ Storefront proj │
   │  Cockpit         │  │ "indilipi"       │  │ "client-2"      │
   │  (this project)  │  │ (Lovable remix)  │  │ (Lovable remix) │
   │  pictocart.in    │  │ indilipi.shop    │  │ client2.com     │
   └──────────────────┘  └──────────────────┘  └─────────────────┘
```

Cockpit = admin + seller dashboard + embedded preview iframe of the live storefront.
Storefront project = lightweight read-only React app, hardcoded to one `STORE_SLUG`, reads from shared Supabase, writes only orders/reviews/wishlist/newsletter.

---

## Phased Execution Plan

### Phase 0 — Indilipi manual launch (this week, unblock the customer)
1. Remix the current PicToCart project into a new Antariksh workspace project called `storefront-indilipi`.
2. Strip it down to storefront routes only (delete `/dashboard`, `/admin`, `/onboarding`, etc.).
3. Hardcode `STORE_SLUG = "indilipi"` and remove the `useStoreByHost` host-resolution layer.
4. Connect `indilipi.shop` + `www.indilipi.shop` via **Lovable's native custom domain** (A record `185.158.133.1` + `_lovable` TXT). No Cloudflare-for-SaaS.
5. Publish. Customer is live within 24h.
6. They continue managing products/orders inside `pictocart.in/dashboard` — the data flows through the shared Supabase automatically.

### Phase 1 — Build the Storefront Template project (week 2)
A canonical Lovable project that becomes the source for every remix:
- Reads `STORE_SLUG` from a single `src/config.ts` constant.
- All pages: Home, Product, Cart, Checkout, Account, Blog, Policies.
- Imports the shared Supabase client (same URL + anon key as cockpit).
- Ships with the most-used theme baked in; others applied via the existing `theme_packs` system.
- Includes a tiny `<RemoteContent>` component that pulls hero banners and section content from a new `store_content` table — so frequent banner/image swaps happen from the cockpit without touching the storefront project.

### Phase 2 — Cockpit becomes the control surface (week 2–3)
Inside `pictocart.in`:
- New "My Storefront" page with an iframe pointing at the customer's live domain (or staging URL) — this is the "small browser window" you described.
- Theme/content editor writes to `store_content` JSONB → live storefront re-fetches → no redeploy needed for banners, copy, product highlights.
- Orders, payments, shipping, analytics, coupons, customers — all stay in cockpit (already built).
- Add a "Storefront Project" status card showing: domain status, last deploy, theme version.

### Phase 3 — Automate project provisioning (week 3–5)
Goal: when a seller finishes onboarding in PicToCart, a new Lovable project is created automatically in your Antariksh workspace.

Today Lovable does **not** expose a public "create project" API, so for v1 the automation is semi-manual:
1. Seller completes onboarding → cockpit emits a `provision_request` row.
2. You (or an internal admin) get a one-click "Provision" button in `/admin` that:
   - Opens the Storefront Template project in a new tab (`Remix this project` link).
   - Pre-fills the project name (`storefront-{slug}`) via clipboard.
   - After remix, admin pastes the new project URL back into cockpit.
   - Cockpit calls a Lovable webhook (once we set one) or stores the project ID for tracking.
3. Customer sees: "Your store is being prepared (usually <2h)" then "Live — connect your domain".

When Lovable ships a workspace API (or via MCP), swap the manual step for a real call — the data model is already ready.

### Phase 4 — Domain self-service (week 4)
Inside cockpit, build a "Connect your domain" wizard that:
- Tells the customer exactly which DNS records to add (A + TXT) for *their specific storefront project*.
- Polls `dnschecker`-style verification.
- Surfaces Lovable domain status (Verifying → Setting up → Active).
This removes you from the loop for every new client.

---

## Supabase Optimizations (locked in now, pay off at scale)

These prepare the shared DB for N storefronts hitting it independently:

1. **Per-store read replicas via connection pooling** — keep using PgBouncer; storefronts only do `SELECT` + `INSERT order`, so they're cheap.
2. **Indexes** (most already added in last optimization pass; verify): `products(store_id, is_active)`, `orders(store_id, created_at desc)`, `stores(slug)`, `stores(custom_domain)`.
3. **`store_content` table (new)** — JSONB blobs keyed by `(store_id, section_key)` so banner/image swaps don't require redeploying the storefront project.
4. **CDN-cached edge function `get-storefront-bundle`** — single call returns `{store, products, content, theme}` so storefront first paint is 1 round-trip instead of 3–4. Cache 60s at the edge.
5. **Image CDN** — pipe `store-assets` and `product-images` buckets through Supabase's image transform (`?width=...&quality=75`) so storefronts ship WebP automatically.
6. **Drop the Cloudflare-for-SaaS code paths** (cloudflare-agent, custom hostname provisioning, domain_health_log writes) once Phase 0–1 are stable. Saves DB writes and edge function invocations.
7. **Realtime channels scoped per store** — only the cockpit subscribes; storefronts stay polling-free for reads.

---

## What Customers Will Experience

1. Sign up at pictocart.in → 5-minute onboarding → PicToCart says "We're spinning up your storefront."
2. Within 2 hours (Phase 3) or instantly (Phase 5): they get a `storefront-{slug}.lovable.app` URL.
3. They paste their domain (e.g. `indilipi.shop`) into the cockpit's domain wizard, follow 2 DNS instructions, and Lovable issues SSL automatically.
4. Day-to-day: they live inside pictocart.in — managing orders, products, banners, themes. The storefront iframe in the cockpit is their preview.
5. They never know there are two projects under the hood. To them, PicToCart did everything.

---

## Why This Wins

- **Reliability**: Lovable's native custom domain pipeline is rock-solid; Cloudflare SaaS was the failure point — we eliminate it.
- **Speed to market**: Indilipi can be live this week with zero new infrastructure.
- **Cost-aligned**: every storefront = a Lovable project = revenue for Lovable = aligned incentive for stable hosting.
- **Scales to thousands**: Supabase handles N readers easily; Lovable hosts each storefront independently so one bad client can't take down others.
- **Frequent banner edits stay cheap**: data-driven via `store_content`, no rebuilds.

---

## Concrete Next Step (what I'll implement when you approve)

1. Add a `store_content` table + RLS + edge function `get-storefront-bundle`.
2. Build the "My Storefront" cockpit page with iframe preview + content editor for hero/banner sections.
3. Write a `STOREFRONT_TEMPLATE.md` checklist describing exactly how to remix this project into a new client storefront (Phase 0 manual playbook for Indilipi).
4. Add an admin "Provision Request" queue so every new signup shows up as a task for you until Phase 3 automation lands.

Approve and I'll start with steps 1–3 in the next message.
