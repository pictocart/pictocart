
# PicToCart 2.0 — Execution Plan (Theme-Remix Model)

## Key amendment

We are **dropping the "Mega Prompt rebuilds storefront from scratch"** approach.

Instead, every premium theme (Bazaar, Atelier, Pulse, Bloom, Forge, Garden) will be built **once** by you in the Admin Panel as a fully working storefront project (a "Theme Master Project"). For each new client we simply:

1. Remix the Theme Master Project they picked.
2. Run a small **Client Patch Prompt** that only swaps:
   - `STORE_SLUG`, store name, logo, favicon
   - Brand colors / fonts (theme tokens)
   - Custom domain
   - Any one-off section toggles
3. All products, banners, content, blog, reviews stream from the shared Supabase backend (filtered by `store_id`). No code changes per client for content.

So: **theme code = static, content = dynamic from DB.** This is faster, cheaper, fully deterministic, and avoids an LLM rebuilding 50 files for every signup.

---

## Phase 1 — Database foundations

One migration. Three new tables + minor columns.

### 1.1 `theme_master_projects`
Tracks each finished Theme Master Project that lives as its own Lovable project.
```text
theme_master_projects(
  id uuid pk,
  theme_id text unique,           -- 'bazaar', 'atelier', ...
  name text,
  lovable_project_url text,       -- the Master remix URL
  remix_url text,                 -- prebuilt ?remix=true link
  client_patch_prompt text,       -- short prompt to apply per-client tweaks
  preview_image text,
  is_active bool,
  created_at, updated_at
)
```
RLS: admins manage; authenticated read active rows.

### 1.2 `provision_requests`
```text
provision_requests(
  id uuid pk,
  store_id uuid,
  theme_master_id uuid -> theme_master_projects.id,
  status text,                    -- queued | remixing | patching | domain_pending | live | failed
  client_patch_payload jsonb,     -- {store_name, slug, logo_url, colors, domain, ...}
  rendered_patch_prompt text,     -- patch prompt with values filled in
  new_project_url text,           -- captured from Lovable after remix
  new_project_subdomain text,     -- e.g. storefront-indilipi.lovable.app
  notes text,
  queued_at, started_at, completed_at, error
)
```
RLS: admins all; store owners read own.

### 1.3 `store_content`
Per-section dynamic content edited from the cockpit (no redeploy).
```text
store_content(
  id uuid pk,
  store_id uuid,
  section_key text,               -- 'hero', 'banners', 'usp_strip', 'testimonials', 'newsletter'
  content jsonb,
  updated_at
)
UNIQUE (store_id, section_key)
```
RLS: store owners CRUD own; public SELECT when parent store `is_published`.

### 1.4 (Optional now, kept) `prompt_templates`
Repurposed as the **Client Patch Prompt library**, keyed by `theme_id`. Stores the small patch prompt + variable schema. Not the giant rebuild prompt.

---

## Phase 2 — Admin Provisioning Console (`/admin/provisioning`)

New page at `src/pages/admin/AdminProvisioning.tsx`, registered in `AdminLayout`.

### Layout
- **Queue table**: all `provision_requests` with status pills, client name, theme picked, domain.
- **Detail drawer** for a selected request:
  - Client snapshot (store name, slug, category, logo preview, color palette, domain, products count).
  - Picked theme card → shows linked Theme Master Project + its `remix_url`.
  - **"Copy Patch Prompt"** button → copies the rendered Client Patch Prompt to clipboard.
  - **"Open Remix in Lovable"** button → opens `theme_master.remix_url` in new tab with project name suggestion `storefront-{slug}`.
  - Field: paste-back `new_project_url` and `new_project_subdomain`.
  - Status updater: `queued → remixing → patching → domain_pending → live`.
  - "Mark Live" notifies the store owner (existing email infra) and writes URL into `stores.settings.storefront_project_url`.

### Client Patch Prompt template (small, deterministic)
Stored per theme. Example:
```
Patch this remixed storefront for client "{store_name}".
- Set src/config.ts:
    STORE_SLUG = "{slug}"
    STORE_ID   = "{store_id}"
- Replace logo at src/assets/logo.svg with: {logo_url}
- Update src/themes/{theme_id}/tokens.ts:
    primary  = "{primary}"
    accent   = "{accent}"
    bg       = "{background}"
    heading_font = "{heading_font}"
- Update index.html <title> and meta description to "{store_name} — {tagline}"
- Update public/manifest.json name and short_name.
- Do NOT modify any component logic, layout, or data fetching.
- Confirm and publish. Connect domain "{custom_domain}".
```
That's the entire prompt. Lovable changes ~6 files. No regeneration risk.

### Companion: `provision-storefront` edge function (used by cockpit)
- Called when a customer finishes onboarding.
- Inserts the `provision_requests` row.
- Renders the patch prompt from the picked theme + onboarding data.
- Pings admin (existing notification path).

---

## Phase 3 — `get-storefront-bundle` edge function

Single endpoint every storefront calls on first paint. Replaces 4–6 round-trips.

`supabase/functions/get-storefront-bundle/index.ts`
- Input: `{ store_slug }` or `{ host }`
- Output (JSON, cached 60s via `Cache-Control: public, max-age=60, s-maxage=60`):
```json
{
  "store":   { ...row from stores },
  "theme":   { theme_id, tokens, fonts },
  "content": { hero, banners, usp_strip, testimonials, newsletter },   // from store_content
  "products":{ featured: [...], all_count },
  "categories":[...],
  "policies":{ ... },
  "blog_recent":[...]
}
```
- Public (no JWT). Validates input with zod. Honors RLS via service role + `is_published = true` filter.
- All theme master projects use a tiny `useStorefrontBundle()` hook that calls this endpoint, eliminating per-page Supabase chatter.

---

## Phase 4 — Per-theme folders + the Bazaar theme

### 4.1 New structure
```text
src/themes/
  index.ts                  -- registry: { bazaar: () => import('./bazaar'), ... }
  _shared/                  -- primitives: Price, Rating, ImageSwiper wrappers
  bazaar/
    index.tsx               -- theme root: routes Home/PDP/Cart/etc using its own components
    tokens.ts               -- colors, fonts, radii, motion
    Header.tsx
    Footer.tsx
    Hero.tsx                -- mosaic banner + Devanagari accent
    ProductCard.tsx         -- bordered card with motif corner
    ProductDetail.tsx       -- tabbed (Story / Craft / Care)
    sections/
      USPStrip.tsx
      FeaturedGrid.tsx
      Testimonials.tsx
      Newsletter.tsx
    preview.png
```

### 4.2 Storefront entry
`src/pages/Storefront.tsx` becomes a tiny shell:
1. Resolve store via host/slug (existing `useStoreByHost`).
2. Read `store.theme.theme_id`.
3. Dynamically `import()` `src/themes/{theme_id}/index.tsx` and render it, passing the bundle from `get-storefront-bundle`.
4. Fallback to `minimal-light` if theme missing.

### 4.3 Bazaar theme content
Designed for Indilipi (Indian handcraft / calligraphy):
- **Tokens**: primary `#9A2A2A` (kumkum red), accent `#C9A227` (brass gold), bg `#FBF6EE` (handmade paper), text `#2A1A0F`. Headings: Cormorant Garamond + a Devanagari pair (Tiro Devanagari Hindi). Body: Inter. Radius 6px, soft warm shadows.
- **Hero**: 60/40 mosaic — left: handcraft photo from `theme_image_pool`; right: serif headline + small Devanagari kicker + CTA. Subtle paper-grain background.
- **USP Strip**: 4 icons — "Handmade in India", "Free shipping ₹999+", "7-day returns", "GI-tagged crafts".
- **Featured Grid**: 2-col mobile / 4-col desktop, ProductCard with hand-drawn motif corner; price in serif.
- **PDP**: sticky gallery left, content right with **Tabs**: Story · Craft · Care. Reviews-first below. Pincode checker prominent.
- **Footer**: dark warm with Indian motif divider; newsletter; policies; payment badges.
- **Motion**: gentle fade-up on scroll using existing `useAnimateOnScroll`. No flashy effects — feels editorial.

### 4.4 Master Project workflow (for Bazaar — to be done after Phase 4 ships)
1. You remix this PicToCart project as `theme-master-bazaar`.
2. Strip dashboard/admin/onboarding routes, keep storefront routes only.
3. Hardwire `theme_id = 'bazaar'`, leave everything else dynamic.
4. Connect to the same shared Supabase via env vars.
5. Save its `remix_url` into `theme_master_projects.remix_url`.
6. From now on every Bazaar customer just remixes this and runs the Client Patch Prompt.

---

## Phase 5 — Indilipi go-live (uses Phase 1–4)

1. In `/admin/provisioning`, create the `provision_request` row for Indilipi with theme = `bazaar`.
2. Click **Open Remix** → `theme-master-bazaar` opens.
3. Click **Copy Patch Prompt** → paste into the new project's chat → Lovable applies the 6-file patch.
4. Connect `indilipi.shop` + `www.indilipi.shop` (A `185.158.133.1` + `_lovable` TXT).
5. Mark Live in console → store owner notified, cockpit shows "Storefront: Live".

Estimated turnaround once the Bazaar Master exists: **under 5 minutes per new client**.

---

## Technical details (for engineers)

- New types regenerate automatically after migration; do not hand-edit `src/integrations/supabase/types.ts`.
- New edge function gets `verify_jwt = false` (public) and uses service role key + zod validation.
- `useStorefrontBundle(slug)` hook in `src/hooks/` — React Query, 60s `staleTime`, key `['bundle', slug]`.
- Theme registry uses `React.lazy` + `Suspense` so unused themes are tree-shaken in master projects.
- `store_content` writes from cockpit invalidate the bundle query and bump a `content_version` in the response so storefronts can revalidate without a hard reload.
- Admin page guarded by existing `AdminRoute`.

---

## Build order

1. Phase 1 — migration (tables + RLS).
2. Phase 3 — `get-storefront-bundle` edge function (small, unblocks themes).
3. Phase 4.1 + 4.2 — theme registry plumbing in this project.
4. Phase 4.3 — Bazaar theme components.
5. Phase 2 — `/admin/provisioning` console + `provision-storefront` function.
6. Phase 5 — manual Indilipi launch using the new console.

Approve and I will start with Phase 1 immediately.
