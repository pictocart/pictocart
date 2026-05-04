## Issues found

1. **"Grant permission to Instant Store AI"** on the Google sign-in screen — this name is **not in the codebase**. It comes from the Google Cloud OAuth consent screen tied to the `lovable.dev` auth client. We can't change it from code; you have to rename the OAuth app to "Pic to Cart" in the Google Cloud Console (or in the Lovable Cloud auth provider settings).
2. **Onboarding "Choose a theme"** uses the hardcoded `THEME_TEMPLATES` list (Minimal Light, Dark Luxe…) and marks 4 of them as **Premium ₹500**. This is the ₹500 paywall you saw.
3. **In-app `/themes`** reads `theme_master_projects` (currently only **Bazaar — Ethnic Luxury** and **Marketplace**, both `lovable_project_url=NULL` and `preview_image=NULL`).
4. **"Install" → "Edge Function returned a non-2xx"** — `provision-storefront` enqueues a `provision_requests` row that `provision-runner` then tries to remix via `remix_url`. Both rows have no `remix_url`, so the runner errors silently and the install never completes. Worse, the validator in `provision-storefront` requires `primary` + `accent` placeholders that aren't always in `store.theme`, so the call returns 422.
5. **Indilipi vs Fashion Street**: `fashion-street` has `theme = {theme_id:"bazaar"}` and renders via the existing `Storefront.tsx` route with the bazaar palette/fonts. `indilipi` has the legacy `minimal-light` blob and never gets the bazaar look. There is real bazaar theme React code in `src/themes/bazaar/`, but `Storefront.tsx` never calls `ThemeRenderer` — so even Fashion Street is *not* actually using the bazaar theme components, just its colors.

## Plan

### A. Stop confusing the merchant during signup
- Document a one-time action in the launch checklist: rename the Google OAuth client from "Instant Store AI" → "Pic to Cart" in Google Cloud Console (Lovable Cloud → Auth → Google provider). Add a checklist item in `AdminLaunchChecklist.tsx` so it isn't forgotten.
- In `StepTheme.tsx` (onboarding), remove the ₹500 premium lock entirely. All themes shown during onboarding become free and selectable. The premium tier (if we keep it later) moves to the dashboard `/themes` page only.

### B. Make `/themes` show our real theme catalog (free, working)
- Migration: insert/update `theme_master_projects` rows for every theme we actually ship — `bazaar`, `marketplace`, plus the existing `THEME_TEMPLATES` IDs (`minimal-light`, `fresh-green`, `dark-luxe`, `neon-pop`, `pastel-dream`, `classic-serif`). Fill `preview_image` (generated thumbnails) and a usable `description`. Mark `bazaar` as `is_default=true` for Fashion category.
- Rewrite `src/pages/Themes.tsx` to:
  - Drop the "Install" → provision-runner path. **Installing a theme = updating `stores.theme = { theme_id, name }`** directly. No paid gating. No edge function call.
  - Show Live Preview by opening `/store/{slug}?preview_theme={theme_id}` in a new tab so the merchant sees it on their own data.
  - Show a clear "Active" badge for the theme currently set on the store.
- Hide the broken provision-runner workflow from the merchant UI. Keep it intact under `/admin/provisioning` for the multi-project remix flow we'll revisit later.

### C. Render the real bazaar/marketplace theme code on storefronts
- Add a `src/themes/marketplace/` folder mirroring `src/themes/bazaar/` (Hero, ProductCard, USPStrip, tokens, index) so both registered themes render.
- In `src/pages/Storefront.tsx`, when `store.theme.theme_id` matches a key in `THEMES` (`bazaar`, `marketplace`), render via `ThemeRenderer` using the existing `useStorefrontBundle` hook. Fall back to the current generic renderer for legacy theme IDs (`minimal-light`, `fresh-green`, …) so we don't break existing live stores.
- Honor `?preview_theme=…` in `Storefront.tsx` so the Themes page preview link works without committing the change.

### D. Make Indilipi look like the bazaar theme
- One-off migration: `UPDATE stores SET theme = '{"theme_id":"bazaar","name":"bazaar"}'::jsonb WHERE slug = 'indilipi';` Once C is shipped, `pictocart.in/store/indilipi` will render through the bazaar theme components automatically — same as `fashion-street` will after the upgrade.
- Add a "Reset to default theme" button on `/themes` so any merchant can do this themselves later.

### E. QA
- Manually verify on the preview: onboarding shows no ₹500 lock; `/themes` lists 8 themes, "Install" updates the store with no toast error; `/store/fashion-street` and `/store/indilipi` render with the bazaar layout; preview link opens a non-persisted preview.

### Technical notes
- Files to edit: `src/components/onboarding/StepTheme.tsx`, `src/pages/Themes.tsx`, `src/pages/Storefront.tsx`, `src/pages/admin/AdminLaunchChecklist.tsx`.
- Files to add: `src/themes/marketplace/{index.tsx,Hero.tsx,ProductCard.tsx,tokens.ts}`, plus 8 generated thumbnail JPGs in `src/assets/theme-thumbs/`.
- Migrations: upsert 8 `theme_master_projects` rows; update `indilipi` store's `theme` JSONB.
- No changes needed to `provision-storefront` / `provision-runner` (left for the future automated multi-project flow).

### Out of scope (flagging)
- Renaming the OAuth consent screen — must be done by you in Google Cloud Console.
- Building actually distinct visual designs for all 8 themes (this plan ships bazaar + marketplace as full theme components; the other 6 keep using the current generic Storefront renderer with their color/font tokens).
