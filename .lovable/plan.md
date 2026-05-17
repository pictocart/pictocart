# Scope

Five connected features. To keep the change set reviewable and avoid mid-flight context loss, I'll ship in **two turns**. This plan covers both.

---

## Turn 1 — Customiser editing + policy pages (the "Google won't index us" fixes)

### 1. Footer is clickable on storefront + preview
- Audit `MasterThemeRenderer` `<Footer>` — wrap link columns in `<Link>` (storefront) / `<button onClick={onNavigate}>` (preview). Currently they render as static text.
- Verify each manifest footer link routes to `/store/:slug/{shop|about|contact|privacy|terms|returns|shipping}`.

### 2. Header section in Customiser
- Add a virtual "Header" entry at the top of the sections list (not a manifest section — a synthetic one).
- Inspector fields:
  - Logo upload (replaces brand text when present)
  - "Show store name" toggle
  - Custom brand name override
  - Nav link CRUD (label + target page)
- Stored at `overrides.header = { logo_url, show_name, brand_name, nav_links[] }`.
- `MasterThemeRenderer <Header>` reads these.

### 3. Footer section in Customiser
- Same pattern — synthetic "Footer" entry.
- Inspector fields:
  - About column text
  - Social links (IG/FB/X/YT)
  - Custom link CRUD
  - Show/hide "Powered by"
- Stored at `overrides.footer`.

### 4. Trust strip CRUD (`usp_strip`)
- Inspector for `usp_strip` shows the `items[]` array with add / remove / reorder.
- Each item: icon picker (truck, shield, refresh, headphones, lock, tag, gift, sparkles), title, sub.
- Generic `items[]` editor that the CustomiserV2 inspector renders when `items` is in the section's props (also benefits testimonials, categories later).

### 5. Policy / static pages with AI generator
- Six pages: Privacy Policy, Terms of Service, Refund Policy, Shipping Policy, About Us, Contact.
- Already partially exist as `PrivacyPolicy.tsx`, `TermsOfService.tsx`, `RefundPolicy.tsx`, `Returns.tsx` — wire them to read from `store.settings.policies.{privacy|terms|refund|shipping|about|contact}` and render rich text.
- New dashboard page `/policies` (Marketing or Settings group): edit any policy, with two modes:
  - Manual rich-text editor
  - **"Generate all with AI"** — takes inputs (company legal name, state, country, email, phone, GST, address), calls a new edge function `generate-store-policies`, fills all six fields via Lovable AI Gateway (Gemini Flash, JSON schema), saves to `store.settings.policies`.
- Footer policy links auto-show once filled.

---

## Turn 2 — Testimonials + Google Reviews premium (follow-up message)

### 6. Testimonials manager (Marketing)
- Table `store_testimonials` (name, photo_url, quote, rating, is_published, sort_order).
- `/marketing/testimonials` page with CRUD + photo upload to `store-assets`.
- Storefront `testimonials` section reads from this table (falls back to manifest defaults if empty).

### 7. Google Reviews — premium ₹1499 one-time
- Sold via existing premium-gate pattern (`PremiumGate`).
- New table `store_google_reviews_connections` (place_id, last_synced_at, cached_reviews JSONB, paid_at).
- Edge function `sync-google-reviews` fetches Google Places Details API every 24h. **Requires** `GOOGLE_PLACES_API_KEY` secret.
- Setup wizard: paste Google Maps business URL → we extract place_id → preview → "Unlock for ₹1499" → Razorpay → start syncing.
- Renders as a new section variant `google_reviews` on storefront.

---

## Technical details

- **Database migrations needed (turn 1)**: none — policies live in `stores.settings` JSONB.
- **Database migrations needed (turn 2)**: `store_testimonials`, `store_google_reviews_connections`, plus RLS.
- **Edge functions**: `generate-store-policies` (turn 1), `sync-google-reviews` (turn 2).
- **Secret needed (turn 2 only)**: `GOOGLE_PLACES_API_KEY` — I'll request it when we get there.
- **Customiser data shape change**: introduces `overrides.header` and `overrides.footer` namespaces alongside existing `overrides.pages[page].sections[idx]`. Backward compatible — existing stores keep working.
- **Provisioning**: nothing to update — these are all data + renderer changes consumed by the same shell that already exists.

---

## What I'll do right now if you approve

Just **Turn 1**. Then I'll message you to confirm before starting Turn 2 (testimonials + Google Reviews, which needs the Google API key).
