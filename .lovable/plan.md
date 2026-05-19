## Goal
Make the Layout Archetype system actually work end-to-end so generating a new theme produces structurally distinct layouts (not just recolors).

Two real bugs to fix:
1. `theme_layout_archetypes` table is empty — the "Auto-pick / specific archetype" dropdown is cosmetic.
2. The section assembler in `generate-and-ship-theme` uses a brittle key map (`trending` for `product_grid`) and silently drops unknown keys, so any archetype whose `section_order` uses natural names fails manifest validation.

---

## Step 1 — Seed all 12 layout archetypes (migration)

Insert 12 rows into `theme_layout_archetypes` with full content. Each row:

- `slug`, `name`, `description`, `best_for[]` (category verticals it matches)
- `hero_style`, `category_style`, `product_style`, `header_style`, `density`, `radius_hint`
- `section_order[]` — uses canonical section keys aligned with the validator (`hero, usp_strip, category_grid, product_grid, story, testimonials, newsletter`, plus archetype-specific ones like `lookbook`, `features`, `values`, `spec_table`, `journal_strip`)
- `allowed_extra_sections[]`, `forbidden_sections[]`
- `image_ratios` jsonb — `{ hero, category, product }` (e.g. Editorial Magazine = `{hero:"21:9", category:"4:5", product:"4:5"}`; Bold Pop = `{hero:"1:1", category:"1:1", product:"1:1"}`)
- `motion_language` — short string (`"slow editorial fades"`, `"snappy pop"`, `"none — static catalog"`, etc.)
- `prompt_instructions` — 250–400 words per layout describing exact composition, spacing, type scale, image treatment, color usage, micro-interactions, what to avoid
- `editor_schema` jsonb — per-layout knobs (e.g. Editorial Magazine exposes `serif_weight`, `column_count`, `drop_caps`; Bold Pop exposes `accent_intensity`, `sticker_shapes`, `noise_overlay`)
- `is_active`, `sort_order`

The 12 archetypes:

1. `editorial-magazine` — best_for: fashion, jewellery, beauty, home
2. `bazaar-mosaic` — best_for: grocery, kirana, multi-category, festive
3. `catalog-dense` — best_for: electronics, hardware, b2b, wholesale (default fallback)
4. `boutique-minimal` — best_for: handmade, artisan, premium-small-batch
5. `storyteller-scroll` — best_for: brand-led, sustainability, single-product
6. `lookbook-gallery` — best_for: apparel, photography, lifestyle
7. `bold-pop` — best_for: youth, streetwear, snacks, d2c
8. `tech-spec` — best_for: electronics, gadgets, tools, appliances
9. `single-hero` — best_for: single-product brands, launches, pre-order
10. `farmers-market` — best_for: organic, produce, dairy, local
11. `atelier-showcase` — best_for: furniture, decor, luxury, made-to-order
12. `festive-india` — best_for: ethnic-wear, pooja, sweets, festive-gifting

## Step 2 — Harden the section assembler in `generate-and-ship-theme/index.ts`

Replace the brittle `sectionMap` + `.filter(Boolean)` block with a robust assembler:

a. **Alias map** — normalize incoming keys so both `product_grid` and `trending` map to the same builder. Same for `categories`→`category_grid`, `usps`→`usp_strip`, `news`→`newsletter`, etc.

b. **Builder registry** — one function per canonical section type (`hero`, `usp_strip`, `category_grid`, `product_grid`, `story`, `testimonials`, `newsletter`, `lookbook`, `features`, `values`, `spec_table`, `journal_strip`). Each builder reads from `dna` + `layout` + `archetype` and returns a section object.

c. **Required-sections guarantee** — after assembling from `section_order`, walk `REQUIRED_PAGES.home` and inject any missing required section (`hero`, `usp_strip`, `category_grid`, `product_grid`, `story`, `journal_strip`, `newsletter`) at sensible positions. This means `validateManifest` can never fail with "Manifest incomplete" again for an archetype that simply renamed a key.

d. **Unknown keys** — log a warning instead of silently dropping; do not include them in the output.

e. **Archetype-specific extras** — if `archetype.section_order` contains layout-only sections (e.g. `lookbook` for `lookbook-gallery`, `spec_table` for `tech-spec`, `features` for `tech-spec`, `values` for `storyteller-scroll`), build them with the corresponding builder using `dna` fields already produced (no new AI call).

f. **Apply the same fix to `generate-theme-pack/index.ts`** so pack generation benefits too.

## Step 3 — Verify

After the migration is approved:
- Generate one theme per archetype from `/admin/themes` (Ad-hoc generator → Layout dropdown → each slug)
- Confirm no `Manifest incomplete` errors
- Open preview for 3–4 distinct archetypes (e.g. editorial-magazine, bold-pop, tech-spec, farmers-market) and confirm hero/category/product styles render differently

---

## Out of scope (later steps from the larger plan)

- `StepLayout` merchant onboarding picker
- `LayoutCustomizer` schema-driven UI + `useLayoutOverrides` hook
- Layout filter in `ThemeMarketplace`
- Per-archetype preview thumbnails

These come after we confirm generation produces visibly different layouts.

## Technical notes

- Migration is INSERT-only into an existing table — large but straightforward. Will be ~600–900 lines of SQL because of long `prompt_instructions` strings.
- No schema changes needed; the table already has all required columns.
- Edge function changes are local to two files; no new dependencies.
- `validateManifest` itself stays unchanged — the assembler guarantees its contract.