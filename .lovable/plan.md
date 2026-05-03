
# PicToCart 2.0 — The Provisioning Agent Model

You nailed the missing piece. Lovable doesn't expose a public "create project" API, but it **does** accept a chat prompt inside any project. So we don't need an API — we need an **agent that acts as you, the admin**, opens a remix of the master Storefront Template, pastes a fully-prepared prompt, and lets Lovable's own agent do the build. Humans only click "Approve". This is the breakthrough.

This plan covers four parallel tracks so we can ship Indilipi this week and scale immediately after.

---

## Track 1 — The Provisioning Agent (the heart of the system)

### How it works end-to-end

```text
1. Customer signs up on pictocart.in
2. Completes onboarding (store name, category, logo, products, theme, domain)
3. Cockpit creates a `provision_request` row (status: queued)
4. Provisioning Agent (admin-side tool) picks up the request:
     a. Opens https://lovable.dev/projects/<MASTER_TEMPLATE_ID>?action=remix in a new tab
     b. Auto-fills project name = "storefront-{slug}"
     c. Pastes the pre-baked Mega Prompt into Lovable chat
     d. Waits for Lovable to finish + extract the new project URL
     e. Writes new project URL back into `stores.storefront_project_url`
     f. Triggers Lovable's domain connection flow (manual click for now)
5. Customer sees status pipeline in cockpit: Queued → Building → Connect Domain → Live
```

### Phase A — Manual + assisted (this week, for Indilipi)
A simple **admin dashboard page** (`/admin/provisioning`) that for each new signup shows:
- A "Mega Prompt" generated from the customer's onboarding choices (store name, category, theme ID, color palette, hero copy, product list, policies, payment mode).
- A **"Copy Prompt + Open Remix"** button that:
  - Copies the Mega Prompt to clipboard
  - Opens `lovable.dev/projects/{MASTER_ID}` in a new tab with `?remix=true`
- Fields to paste back the new project URL + `.lovable.app` subdomain
- A "Mark as Built" button that updates `stores.storefront_project_url` and notifies the customer

Admin (you) does ~30 seconds of clicking per new store. Customer never knows.

### Phase B — Browser-extension agent (week 2)
A small Chrome extension ("PicToCart Provisioner") that:
- Reads queued requests from Supabase
- Opens the remix URL itself
- Pastes the Mega Prompt into Lovable's chat box (DOM injection)
- Detects when Lovable finishes (watches chat for "Build complete" / preview URL)
- Posts the new project URL back to Supabase
- Repeats for the next request

This stays within Lovable ToS because **you are signed in as the admin** — the extension just automates clicks you'd do anyway. No reverse-engineering of private APIs.

### Phase C — Headless agent (week 4)
Move the extension logic to a Playwright script running on a small VPS, triggered by a Supabase webhook. Same flow, no browser tab needed.

### The Mega Prompt template
Stored in `prompt_templates` table (one per theme). Filled at provision time with the customer's data:

```
Build a complete e-commerce storefront for "{store_name}" — a {category} store.

Theme: {theme_name} (refer to design-system.md)
Brand colors: primary {primary}, accent {accent}, background {bg}
Logo: {logo_url}
Domain: {custom_domain}

Backend: Use the existing Supabase project (URL + anon key already in .env).
Hardcode STORE_SLUG = "{slug}" in src/config.ts.
Pull all products, categories, content, theme overrides, blog, reviews from
the shared backend filtered by store_id = "{store_id}".

Pages required: Home, Product Detail, Cart, Checkout (Razorpay + COD),
Customer Account, Wishlist, Blog, Policies (Privacy, Refund, Terms, Shipping).

Use the components in src/components/storefront/ exactly as-is.
Hero, banners, USP strip, featured products, testimonials, newsletter — all
read from the `store_content` table so the seller can edit them later from
pictocart.in cockpit.

Connect the custom domain "{custom_domain}" using Lovable's native domain flow.

Do NOT include: dashboard, onboarding, admin, or seller routes.
This project is read-only storefront only.
```

---

## Track 2 — Indilipi launch playbook (do this within 48h)

### Step 1 — Clean the test data
- Reset Supabase: keep only `antarikshdwivedi@gmail.com` as admin user.
- Delete all other auth.users, profiles, stores, products, orders, customers, wishlists, reviews, subscriptions, theme_purchases, domain_health_log.
- Keep `theme_packs`, `theme_section_blueprints`, `theme_image_pool`, `admin_settings`.
- Re-create only the Indilipi store under your admin account, then transfer ownership to `contact.indilipi@gmail.com` once they sign up.

### Step 2 — Manual remix for Indilipi
- Open this PicToCart project → Remix as `storefront-indilipi` in your Antariksh workspace.
- In the new project, run the Mega Prompt manually with Indilipi's data filled in.
- Strip everything except `/`, `/product/:id`, `/cart`, `/checkout`, `/account`, `/wishlist`, `/blog`, `/policies/*`.
- Hardcode `STORE_SLUG = "indilipi"`.
- Connect `indilipi.shop` + `www.indilipi.shop` via Lovable's native custom domain (A `185.158.133.1` + `_lovable` TXT). **No Cloudflare-for-SaaS.**
- Publish. Indilipi is live.

### Step 3 — Cockpit handoff
- In pictocart.in dashboard, Indilipi logs in and manages all products/orders/banners.
- Banner edits flow through the new `store_content` table → storefront refetches without redeploy.

---

## Track 3 — Cloudflare Pages as Customer Portal

Repurpose Cloudflare Pages (which already serves your domain edge) into the **customer-facing self-service portal** at `account.pictocart.in`:

**What it shows the seller:**
- Active subscription (Free/Premium) + renewal date
- AI credit balance + top-up packs (₹99 = 100 credits, ₹499 = 1000)
- Add-on purchases: extra themes, premium support, custom domain SSL
- Storefront project status: building / live / domain connected
- Quick links: "Edit storefront content", "View orders", "Open dashboard"

**Why Cloudflare Pages, not part of the cockpit:**
- Lighter weight, cached at edge → loads in <500ms even on slow 4G
- Sellers check billing more often than they edit products
- Frees the main cockpit React bundle from billing/payment code
- Stripe/Razorpay subscription pages can be embedded without bloating the main app

**Tables to add:**
- `ai_credits` (store_id, balance, last_topup_at)
- `ai_credit_transactions` (store_id, type, amount, reason, created_at)
- `addon_purchases` (store_id, addon_type, amount, razorpay_payment_id, created_at)

**Edge functions:**
- `purchase-ai-credits` — Razorpay order + verification → credit ai_credits.balance
- `consume-ai-credit` — atomic decrement, called by every AI-using edge function (generate-product, generate-blog, generate-theme-pack, store-engagement)

---

## Track 4 — Premium Themes overhaul (the "amaze me" part)

Current pain: 6 themes look identical because they only swap colors. Fix it by giving each theme a **completely different layout system**, not just a palette.

### New theme architecture

Each theme = a folder under `src/themes/{theme-id}/` containing:
- `Hero.tsx` — unique hero design (split, full-bleed video, marquee, 3D card stack…)
- `ProductCard.tsx` — unique card (overlay, magazine, tile-flip, sticker)
- `ProductDetail.tsx` — unique PDP layout (sticky-rail, scroll-tell, gallery-first)
- `Header.tsx` + `Footer.tsx`
- `tokens.ts` — colors, fonts, radii, shadows, motion curves
- `preview.png` — real screenshot for the picker

The `Storefront` route reads `theme.id` from the store and dynamically imports `./themes/{theme.id}/index.tsx` as the root.

### The 6 launch themes (each genuinely distinct)

| Theme | Vibe | Hero | PDP | Card | Best for |
|---|---|---|---|---|---|
| **Atelier** | Editorial luxury | Split image + serif headline | Sticky gallery + long-form story | Magazine tile | Fashion, jewelry |
| **Bazaar** | Indian handcraft | Mosaic banner + Devanagari accent | Tabbed (Story, Craft, Care) | Bordered card with motif | Indilipi, Kalamkari, sarees |
| **Pulse** | Streetwear neon | Full-bleed video + glitch text | Asymmetric grid | Floating sticker | Gen-Z, sneakers, gadgets |
| **Bloom** | Beauty pastel | 3-up product carousel + soft blob | Ingredient breakdown + reviews-first | Rounded card + emoji rating | Skincare, candles |
| **Forge** | Industrial dark | Marquee + monospace | Spec sheet + comparison table | Dense terminal-style | Tools, electronics |
| **Garden** | Organic earthy | Parallax leaves + handwritten | Story + farmer profile | Polaroid-style | Food, organic, wellness |

### Theme builder process (you, with AI)
For each theme, run the existing `generate-theme-pack` edge function with a **per-theme design brief** (not just colors). Output goes into `theme_packs.pages` with full JSX for each section. Premium themes (5 of 6) priced at ₹500-₹1500 with realistic preview screenshots.

### Theme preview that actually previews
`/themes/preview/:id` already exists — extend it to render the **full theme** (not a swatch), with mock products, so customers see exactly what they'll get.

---

## Database additions (one migration)

```text
-- Provisioning queue
provision_requests(id, store_id, status, mega_prompt, project_url, project_subdomain,
                   queued_at, started_at, completed_at, error)

-- Dynamic storefront content (banners, hero, USPs, testimonials)
store_content(id, store_id, section_key, content jsonb, updated_at)
UNIQUE(store_id, section_key)

-- AI credits
ai_credits(store_id PK, balance int, last_topup_at)
ai_credit_transactions(id, store_id, type, amount, reason, ref_id, created_at)

-- Add-ons
addon_purchases(id, store_id, addon_type, amount, razorpay_payment_id,
                metadata jsonb, created_at)

-- Mega prompt templates (one per theme)
prompt_templates(id, theme_id UNIQUE, prompt_body text, version, updated_at)
```

All RLS-scoped by store_id + admin override.

---

## Edge functions to add
- `get-storefront-bundle` — single call returning `{store, products, content, theme}` cached 60s, used by every storefront on first load
- `provision-storefront` — creates the `provision_request` row + generates Mega Prompt
- `consume-ai-credit` — atomic decrement guard for all AI calls
- `purchase-ai-credits` — Razorpay order + webhook
- `notify-admin-new-signup` — Telegram/email ping when a new provision request is queued

---

## Execution order (proposed sprint)

**Day 1-2 — Indilipi live**
1. Wipe test data, keep only your admin account
2. Manually remix + launch `storefront-indilipi` on `indilipi.shop`
3. Customer starts using cockpit immediately

**Day 3-5 — Foundations**
4. Add `provision_requests`, `store_content`, `prompt_templates` tables
5. Build `/admin/provisioning` queue page with Copy-Prompt + Open-Remix flow
6. Build `get-storefront-bundle` edge function
7. Add "My Storefront" page in cockpit with iframe preview + banner editor

**Day 6-10 — Themes**
8. Refactor theme system to per-theme folders
9. Build the 6 distinct themes (one per day with AI)
10. Rebuild `/themes/preview/:id` to render full theme

**Day 11-14 — Customer portal & credits**
11. Add `ai_credits`, `addon_purchases` tables + edge functions
12. Deploy `account.pictocart.in` on Cloudflare Pages
13. Wire AI credit consumption into all AI edge functions

**Week 3+ — Automation**
14. Ship Chrome extension provisioner
15. Onboard 5 paying clients

---

## Why this wins

- **Indilipi is live in 48h** — manual but working, unblocking the customer immediately.
- **Provisioning Agent** turns Lovable's chat into your private API. No ToS violation, no fragile reverse-engineering.
- **Cloudflare Pages portal** keeps the cockpit lean and gives sellers a fast billing/credits view.
- **Themes that genuinely differ** — sellers will pay ₹1500 for Atelier or Bazaar because the layout itself is the value.
- **Shared Supabase + Lovable's native domain pipeline** = zero Cloudflare-for-SaaS pain.

Approve and I'll start with **Day 1-2** immediately: wipe test data (keeping `antarikshdwivedi@gmail.com` as the only admin), then prepare the Indilipi remix playbook + the Mega Prompt for `storefront-indilipi`.
