# Pic to Cart — Market-Ready Product Plan

## Part 1 — Business Analyst Lens

### Market position

**Pic to Cart = "Shopify for Indian micro-sellers"** with one differentiator no one else owns: **AI-generated, fully-built theme storefronts (not templates) running as standalone Lovable projects on the seller's own domain**, provisioned in minutes.

### Target merchants (3 ICPs, in priority order)

1. **Solo artisans & D2C creators** (Indilipi-style): handmade, sarees, jewelry, art, food. 1–50 SKUs. Low tech literacy. Need: WhatsApp-shareable, mobile-first, COD, low monthly cost.
2. **Small retailers digitising** (kirana, boutiques, electronics resellers): existing offline business. Need: catalog + UPI + Delhivery + GST invoice.
3. **Side-hustle / dropshippers**: testing a niche. Need: 5-min setup, switch theme often, cancel anytime.

### Competitive moat vs Shopify / Dukaan / Shiprocket Social

- **AI Theme Marketplace** with real, live, customisable storefronts (not screenshot previews).
- **Free dev → pay only when live** (mirrors Shopify dev-store, but Indian price points: ₹0/₹499/₹1499).
- **5-minute go-live** with mandatory steps reduced to 3–4.
- **Built-in Delhivery + Razorpay + GST invoice + AI blog** — no plugins.

### Pricing tiers (proposed)


| Plan    | Price/mo | Commission | Domain         | Themes                   |
| ------- | -------- | ---------- | -------------- | ------------------------ |
| Free    | ₹0       | 3%         | subdomain only | 1 free theme             |
| Starter | ₹499     | 2%         | custom domain  | all free + 1 premium     |
| Growth  | ₹1,499   | 1%         | custom + email | all themes incl. premium |
| Scale   | ₹4,999   | 0%         | multi-domain   | all + early access       |


---

## Part 2 — Solution Architecture (the "what" we build)

### Architecture model (locked)

```text
┌─────────────────────────────────────────────────────┐
│ PIC TO CART COCKPIT (this project — pictocart.in)   │
│ • Marketing site (/)                                │
│ • Seller dashboard (/dashboard)                     │
│ • Super Admin (/admin)                              │
│ • Theme Marketplace (live previews open in new tab) │
│ • Provisioning engine                               │
└──────────────┬──────────────────────────────────────┘
               │ provisions & manages
               ▼
┌─────────────────────────────────────────────────────┐
│ PER-STORE LOVABLE PROJECTS (one per merchant)       │
│ e.g. storefront-indilipi → indilipi.shop            │
│ • Inherits chosen theme codebase                    │
│ • Reads ALL data from cockpit Supabase              │
│ • Merchant cannot edit code (but can configure)     │
└─────────────────────────────────────────────────────┘
```

### Data flow (single source of truth)

- **Cockpit Supabase** = master DB for stores, products, orders, customers, themes.
- Each storefront project uses `cockpitClient.ts` (already built) to read live data.
- Merchant edits in cockpit → instantly reflected on live storefront (no redeploy needed for content; theme code changes require provisioning patch).

---

## Part 3 — End-to-End Merchant Journey

### Phase 0: Sign-up (30 sec)

Email/Google → land on **simplified onboarding**.

### Phase 1: Mandatory Onboarding — reduced from 11 → **4 steps**


| #   | Step                                                      | Why mandatory   |
| --- | --------------------------------------------------------- | --------------- |
| 1   | **Store Name + Slug**                                     | Identity        |
| 2   | **Category** (drives default theme + sample products)     | Personalisation |
| 3   | **Pick a Theme** from marketplace (free default selected) | Visual identity |
| 4   | **Go Live** (publish on subdomain `name.pictocart.in`)    | Activation      |


**Removed from onboarding** (moved to dashboard pop-ups / setup checklist):

- Logo upload → dashboard "Brand Setup" card
- Theme color picker → REMOVED entirely (theme defines its own palette)
- Product Image / AI Magic / Store Info → dashboard "Add your first product" card
- Payments → dashboard "Accept payments" card (COD on by default)
- Email Branding → dashboard "Brand emails" card
- Preview → not a step; live preview button always available

### Phase 2: Dashboard Setup Checklist (Shopify-style)

Top of dashboard shows a **5-card progress widget**:

```
☐ Add your logo          ☐ Add first product
☐ Connect payments       ☐ Brand your emails
☐ Connect custom domain
```

Each card opens a focused modal — no more wizard. Dismissible.

### Phase 3: Daily operations (already built, keep as-is)

Products, Orders, Coupons, Blog, Subscribers, SEO, Analytics, Categories.

### Phase 4: Growth (custom domain, premium theme upgrade, plan upgrade)

Triggered from **Billing** + **Settings → Domain**.

---

## Part 4 — Sidebar Restructure (cleaner, market-standard)

```text
Home (Dashboard)
─ Catalog
   ├ Products
   └ Categories
─ Sales
   ├ Orders
   └ Coupons
─ Marketing
   ├ Blog Posts
   ├ Subscribers
   └ SEO
─ Storefront
   ├ Themes        ← NEW: marketplace + my active theme
   ├ Customise     ← header/footer/homepage links + sections
   └ Analytics
─ Settings
   ├ Payments
   ├ Shipping
   ├ Domain
   ├ Email Branding   ← NEW (moved out of onboarding)
   └ Billing
My Profile / Sign Out
```

**Removed**: "Store Design" page → split into **Themes** (browse/install) and **Customise** (edit active theme's content).

---

## Part 5 — Theme Marketplace Overhaul (the killer feature)

### Current problems

- `theme_packs` table contains JSON-only "themes" (just colors + section configs) → low quality previews.
- Live preview is a tiny iframe inside a modal.
- "Customise theme" lets users break the design.

### New model

- **Wipe `theme_packs**` of all existing JSON entries (keep table, repurpose).
- Each theme = a row in `**theme_master_projects**` (already exists) pointing to a real Lovable project URL (e.g. `theme-master-bazaar`).
- Marketplace card shows:
  - High-quality screenshot
  - **"Live Preview"** button → opens master project URL in **new tab** (full functional storefront)
  - **"Install"** button → triggers provisioning to spin up merchant's storefront project from this master
- **No live preview iframe inside cockpit.**

### Customisation rules (Shopify-style)

Merchant CAN edit:

- Logo, store name, header links, footer links/columns
- Homepage section ORDER + which sections show (toggle)
- Section CONTENT (text, banner image, featured product list)
- Newsletter on/off, blog on/off
- (Categories drive the catalog navigation automatically)

Merchant CANNOT edit:

- Colors, fonts, spacing, layout (theme's design integrity)
- Component structure
- Code

This is enforced by the schema of `store.settings.customisations` — a typed JSON with only the allowed keys.

### Theme cost matrix (admin-only, in Super Admin)

- Track AI generation cost per theme (already in `theme_packs.ai_generation_cost`).
- New: **per-token cost in INR** pulled from Lovable AI Gateway billing for each `generate-theme-pack` invocation.
- Profit/Loss = (sales_count × price) − ai_generation_cost.
- Display in `/admin/themes` → cost matrix tab.

---

## Part 6 — Admin Changes

### `/admin/stores` fixes

- Store row link currently → `/store/indilipi`. Change to:
  - If `custom_domain` set → `https://{custom_domain}` (e.g. `https://indilipi.shop`)
  - Else → `https://{slug}.pictocart.in`
- Add a "View live" external-link icon (already partially there).

### `/admin/themes` upgrade

- Tabs: **Master Projects** | **Cost Matrix** | **Image Pool**
- Master Projects: CRUD on `theme_master_projects` (URL, screenshot, category, default flag).
- Cost Matrix: per-theme P&L + token usage.
- Remove old "JSON theme pack" generation UI.

### `/admin/cloudflare` → renamed **Domains**

- Old Cloudflare-direct UI removed.
- New: list active custom domains across all stores, health status, retry SSL.

### `/admin/provisioning` (already exists)

- Adapt to new flow: when merchant picks theme → enqueue a `provision_request` with `theme_master_id`.
- Worker does: fork master project → set env (cockpit URL + anon key) → publish → connect subdomain → mark store `is_published`.

### `/admin/revenue`

- Add: subscription MRR, commission revenue, theme sales revenue, AI cost — net P&L.

---

## Part 7 — Analytics (live data from indilipi.shop)

- Storefronts already write orders/customers to **cockpit Supabase**.
- `/analytics` page reads directly from `orders`, `customers`, `products` for the seller's `store_id`. No external integration needed — it's already one DB.
- Add: traffic events table `storefront_events` (page_view, add_to_cart, checkout_start) → Edge Function `track-event` called from each storefront. Cockpit charts conversion funnel.

---

## Part 8 — Phased Development Plan

### Phase 1 — Foundation cleanup (week 1)

1. Onboarding: collapse to 4 steps (StoreName, Category, Theme, Go Live).
2. Dashboard: add **Setup Checklist** widget with 5 dismissible cards.
3. Sidebar restructure: rename Store Design → split into Themes + Customise; add Email Branding under Settings.
4. Admin Stores: fix live-link to use `custom_domain` or `{slug}.pictocart.in`.
5. Wipe `theme_packs` rows; keep schema.

### Phase 2 — Theme Marketplace v2 (week 2)

1. Rewrite `Themes` page → cards from `theme_master_projects`, "Live Preview" → new tab, "Install" → provision.
2. Lock down **Customise** page to schema-allowed fields only (header/footer/homepage links + section order + content).
3. Remove color picker / font picker UI from merchant side.
4. Admin Themes page: Master Projects CRUD + Cost Matrix tab.

### Phase 3 — Provisioning automation (week 3)

1. Hook "Install Theme" → creates `provision_request` row.
2. Provisioning worker: cross-project copy theme code → set cockpit env → publish → bind subdomain.
3. Status visible in merchant dashboard ("Your store is going live… 2 min remaining").
4. Email merchant when live.

### Phase 4 — Billing + Plans (week 4)

1. Subscription tiers in DB (already partially there).
2. Razorpay subscriptions for ₹499/₹1499/₹4999.
3. Plan-gated features (custom domain = paid, premium themes = paid).
4. Free trial: 14 days on Growth.

### Phase 5 — Analytics + Conversion (week 5)

1. `storefront_events` table + `track-event` edge function.
2. Funnel chart on `/analytics`: views → cart → checkout → paid.
3. Top products, traffic sources, device breakdown.

### Phase 6 — Admin polish + launch readiness (week 6)

1. Admin Revenue P&L dashboard.
2. Admin Domains page (replaces Cloudflare).
3. Cost matrix with token-level cost tracking via Lovable AI Gateway logs.
4. End-to-end QA: signup → onboarding → install theme → add product → custom domain → first sale.

---

## Part 9 — Concrete deletions

- `src/components/onboarding/StepTheme.tsx` (color theme picker) — DELETE
- `src/components/onboarding/StepUploadImage.tsx` — DELETE
- `src/components/onboarding/StepAIGenerate.tsx` — DELETE
- `src/components/onboarding/StepStorePreview.tsx` — DELETE
- `src/components/onboarding/StepGoLive.tsx` — keep but trigger from dashboard
- `src/components/store-design/ThemeMarketplace.tsx` (in-iframe preview) — REPLACE
- All rows in `theme_packs` — TRUNCATE (admin migration)
- `src/pages/admin/AdminCloudflare.tsx` — RENAME/REPURPOSE to AdminDomains

---

## Open questions for you (answer before Phase 1 starts)

1. **Pricing**: confirm ₹0 / ₹499 / ₹1499 / ₹4999 + commission tiers, or different numbers?  
answer: Fine
2. **Free plan**: should free stores get `{slug}.pictocart.in` only, or also allow custom domain?  
answer: Fine
3. **Theme install flow**: does picking a new theme on an existing live store **re-provision** (replace site, keep data) or do we lock theme after first install?  
answer: Reprovision, (replace site, keep data) Increase the sale of themes.
4. **Categories as theme inputs**: confirm sidebar/nav of the storefront should be auto-built from `categories` table (no manual nav editing needed)?  
Answer: Yes   
  
Just one this which I think I need to confirm before going ahead. Like we have created theme-master-bazaar, if we can create all the the themes in 1 theme bundle project of lovable then it will be a less of admin caos. 

Once you confirm, I'll start Phase 1 (onboarding collapse + sidebar + admin stores link fix + theme_packs wipe) in a single pass.  
