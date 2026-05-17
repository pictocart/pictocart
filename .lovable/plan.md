# Fresh start: Themes, Customiser, Provisioning — done right

We stop patching. We define one contract that Pictocart (control plane) and every merchant Lovable project (render plane) both obey, then rebuild Indilipi against it.

## 0. Clean slate (one-time)

- Delete seller `contact.indilipi@gmail.com` and the `indilipi-shop` Lovable project (you do this manually).
- In Pictocart DB: delete all rows from `theme_master_versions`, `theme_master_projects`, `provision_requests`, `provision_job_logs`, and clear `stores.theme` / `stores.settings.theme_overrides` for any test stores.
- Keep `themes/bazaar` legacy folder untouched — it's a safety net, never shown to merchants.

## 1. The contract (single source of truth)

```text
Pictocart DB
└── theme_master_versions.files_manifest   ← THE theme (layout + defaults)
       │   { dna, pages: { home, shop, product, cart, checkout,
       │                   journal, about, contact, auth, account },
       │     sections: [...], i18n, assets[] }
       │
stores.theme.manifest_ref ──► points to a theme_id
stores.settings.theme_overrides ──► merchant edits (copy, images, colors, order)
```

Rules:

- Theme code lives **only** in the manifest. No per-theme React files.
- Merchant edits live **only** in `theme_overrides`. Never mutate the manifest.
- Same manifest → many merchants. Each merchant's overrides are independent.
- If a merchant needs custom code beyond the customiser, we **fork the manifest** for them (new `theme_id` derived from base), not edit code. (IN THEIR INDIVIDUAL PROJECT)

## 2. Theme spec (every new theme MUST produce all of these)

A theme is "marketplace-ready" only if its manifest contains every page below, fully wired:


| Page             | Sections (minimum)                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`           | signup, signin, forgot-password, reset-password                                                                                           |
| `home`           | header, LOGO AND SHOP NAME, hero, USP strip, featured categories, featured products, story/about-strip, journal strip, newsletter, footer |
| `shop`           | header, filters sidebar, product grid, pagination, footer                                                                                 |
| `product`        | header, gallery, info, variants, add-to-cart, accordion, reviews, related, footer                                                         |
| `cart`           | header, line items, summary, checkout CTA, footer                                                                                         |
| `checkout`       | address, shipping, payment, review                                                                                                        |
| `journal` (blog) | header, post grid, post detail, footer                                                                                                    |
| `about`          | header, story, team/values, footer                                                                                                        |
| `contact`        | header, form, map/info, footer                                                                                                            |
| `account`        | orders, addresses, wishlist, profile                                                                                                      |


Every section declares: `id`, `type`, `props` (editable defaults), `editable: [field names exposed to customiser]`, `required: bool`, `removable: bool`.

The AI theme-generation pipeline (`generate-theme-master` edge fn) is updated so it **refuses to publish** a manifest missing any required page/section. This is the gate.

## 3. MasterThemeRenderer (the only renderer)

One component renders any manifest page:

- `<MasterThemeRenderer manifest overrides products store page route />`
- Has a `<SectionRegistry>` mapping `section.type → React component` (Hero, ProductGrid, Story, JournalStrip, AuthForm, CheckoutStepper, etc.).
- New themes never need new code as long as they reuse registered types. New section types = one PR to the registry, instantly available to all themes.
- Renders header nav from `manifest.navigation` → real routes (`/shop`, `/journal`, `/about`, `/contact`, `/account`).

Storefront.tsx becomes ~40 lines: fetch bundle → pick page from URL → render `<MasterThemeRenderer>`. No legacy `homepage_sections` path. No "loading old site first then new site" — that flash is gone because there is only one renderer.

## 4. Customiser (Shopify-grade UX)

Rebuild `/customise` as a 3-pane editor driven entirely by the manifest:

```text
┌────────────┬─────────────────────────┬────────────┐
│  Pages     │   Live Preview (iframe) │  Inspector │
│  ▸ Home    │   /store/<slug>?preview │  Section   │
│  ▸ Shop    │                         │  fields:   │
│  ▸ Product │                         │  - text    │
│  ▸ Journal │                         │  - image   │
│  ▸ About   │                         │  - color   │
│  ▸ Contact │                         │  - toggle  │
│  ▸ Account │                         │  - reorder │
└────────────┴─────────────────────────┴────────────┘
```

- Left pane: page list + sections of selected page (drag to reorder if `removable`).
- Middle: live iframe of the storefront with `?preview=overrides-draft` so edits show instantly without saving.
- Right: auto-generated form from the section's `editable` schema. Every field has "Reset to theme default".
- Global tab: brand name, logo, palette overrides, font overrides, favicon, social links.
- Save → writes `stores.settings.theme_overrides` (debounced). Publish → bumps `theme_overrides.version`.
- "Request custom change" button → opens a ticket (admin sees in `/admin/theme-requests`); admin can fork manifest for that merchant.

## 5. Provisioning — the one-shot prompt

Goal: paste **one prompt** into a new Lovable project and the merchant site is live, auto-synced, forever.

`provision-storefront` edge fn returns a prebuilt prompt blob containing:

1. Supabase URL + anon key (already public) + the merchant's `store_id` and `slug`.
2. The exact file list to create: `src/App.tsx`, `Storefront.tsx`, `MasterThemeRenderer.tsx`, `SectionRegistry/*`, `useStorefrontBundle.ts`, `useThemeManifest.ts`, supporting hooks/components.
3. The router config with all routes (`/`, `/shop`, `/product/:id`, `/cart`, `/checkout`, `/journal`, `/journal/:slug`, `/about`, `/contact`, `/account/*`, `/auth/*`).
4. `index.html` SEO + manifest + favicon wiring.
5. Instruction to call `get-storefront-bundle` on load — no hardcoded theme, no hardcoded copy.
6. Publish + custom-domain instructions.

The merchant project becomes a **dumb shell**. Every theme change, every Customiser edit, every product update flows through Supabase → bundle → renderer with zero re-provisioning.

Admin UI: `/admin/provisioning/:storeId` shows a "Copy prompt" button → copies the full prompt to clipboard, ready to paste into a fresh Lovable project.

## 6. Theme rename & branding per merchant

On `applyMasterTheme(storeId, themeId)`:

- Seed `theme_overrides.brand_name = store.name`.
- Seed `theme_overrides.logo_url = store.logo_url`.
- Seed `theme_overrides.palette` with theme defaults but mark editable.
- Renderer always reads brand/logo from overrides first → same theme, different brand per merchant automatically.

## 7. Indilipi test plan (after the above ships)

1. Generate one new theme via admin (category: ethnic/handloom) → verify manifest passes the page/section gate.
2. Create fresh seller account for Indilipi.
3. Apply theme → check `/customise` lets you edit every page.
4. Click "Copy provisioning prompt" → paste into a new Lovable project → publish → point `indilipi.shop` DNS.
5. Verify: edit hero text in Pictocart Customiser → refresh indilipi.shop → change is live, no redeploy.
6. Only after Indilipi is perfect do we generate themes for other categories.

## What we build, in order

1. **DB cleanup** (delete themes/versions/provision rows).
2. **Manifest schema v2** + validator in `generate-theme-master` (reject incomplete themes).
3. **SectionRegistry** + expanded `MasterThemeRenderer` covering all page types.
4. **Storefront.tsx** rewrite (thin shell, all routes manifest-driven).
5. **Customiser v2** (3-pane, live preview, per-section forms, reset-to-default).
6. **Provisioning prompt generator** + admin "Copy prompt" UI.
7. **applyMasterTheme** seeding brand/logo/palette into overrides.
8. **One new Heritage theme** generated end-to-end for Indilipi as the acceptance test.

## Open questions before we start coding

- Do you want the merchant's Lovable project to be **fully auto-created** by us via the Lovable API, or stay manual ("copy prompt → paste in new project")? Manual is simpler and matches what you described.
- For "request custom change" tickets, should the admin fork at the manifest level (new theme_id) or at the overrides level (free-form JSON patch)? Manifest fork is cleaner long-term.
- Journal = blog (existing `blog_posts` table) — confirm we reuse it rather than introduce a new content type.

Answer those three and I'll start with step 1.