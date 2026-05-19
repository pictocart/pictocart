## Why this matters

Today the AI picks `hero_style` / `category_style` / `product_style` from short enum lists with no instructions, so every generated theme collapses into the same "hero image + 4-up grid + testimonials" shape. Merchants get recolors, not real layout variety. We need:

1. A **first-class Layout Archetype** the merchant picks (or AI suggests) before generation.
2. **Per-layout prompt instructions** the generator MUST obey — structure, density, sections allowed, image ratios, motion language, "do / don't" rules.
3. A **Customize panel that adapts to the chosen layout** so every layout stays editable without one-off code.

---

## Phase A — Layout Archetype Library (12 layouts)

Built from research on Awwwards / Shopify / Squarespace / editorial commerce patterns, mapped to what Indian SMB catalogues actually look like.


| #   | Archetype              | Best for                                  | Hero                                    | Grid                                    | Signature move                     |
| --- | ---------------------- | ----------------------------------------- | --------------------------------------- | --------------------------------------- | ---------------------------------- |
| 1   | **Editorial Magazine** | Books, art, slow fashion, lifestyle       | Big serif headline + single image right | 2-col asymmetric feature + 3-up         | Pull-quotes, drop caps             |
| 2   | **Bazaar Mosaic**      | Ethnic wear, jewellery, handicraft        | Split hero with motif border            | 2×3 mosaic with one tall tile           | Devanagari accent type             |
| 3   | **Catalog Dense**      | Multi-category general store, marketplace | Compact banner + category strip         | 5-up dense grid, sticky filters         | Price-led cards, badges            |
| 4   | **Boutique Minimal**   | Premium beauty, perfume, candles          | Centered hero, lots of whitespace       | 3-up cards, generous gaps               | Hover reveal, slow fades           |
| 5   | **Storyteller Scroll** | Founder-led / D2C / wellness              | Fullscreen image + scroll cue           | Alternating text-image rows             | Pinned section transitions         |
| 6   | **Lookbook Gallery**   | Fashion, eyewear, sneakers                | Fullscreen lookbook slider              | Masonry / staggered grid                | Image-first, minimal copy          |
| 7   | **Bold Pop**           | Streetwear, gadgets, Gen-Z                | Marquee + oversized type                | Tilted/floating cards                   | Sticker badges, marquee strip      |
| 8   | **Tech Spec**          | Electronics, appliances, B2B              | Split hero with feature bullets         | Comparison table + spec cards           | Tabbed specs, trust badges         |
| 9   | **Single Hero Focus**  | Single-SKU brands, launches               | One fullscreen product, sticky buy      | One-product page, FAQ + reviews stack   | Sticky add-to-cart rail            |
| 10  | **Farmers Market**     | Food, organic, agri, dairy                | Warm hero with USP chips                | Circle categories + price-per-unit grid | Pincode + delivery slot widget     |
| 11  | **Atelier Showcase**   | Bespoke, services-adjacent, made-to-order | Editorial fullscreen with kicker        | Case-study cards + process strip        | "Commission" CTA, no price         |
| 12  | **Festive India**      | Diwali / wedding / seasonal shops         | Festive banner + countdown              | Themed collections row + gift grid      | Countdown timer, gift-finder strip |


Each archetype gets a row in a new `theme_layout_archetypes` table:

```
id, slug, name, description, best_for[],
hero_style, category_style, product_style, header_style, density, radius_hint,
section_order[],            -- required ordered list
allowed_extra_sections[],   -- optional extras
forbidden_sections[],
image_ratios jsonb,         -- { hero: '21:9', category: '1:1', product: '4:5' }
motion_language text,       -- "slow fade, no parallax" / "tilt cards, marquee"
prompt_instructions text,   -- the long do/don't paragraph the LLM follows
preview_image,
is_active, sort_order
```

`prompt_instructions` is the heart of the system — 200-400 words per layout telling the model exactly what to build and what to avoid (e.g. *"Editorial Magazine: hero is one large serif headline left-aligned, single 4:5 portrait image right, no buttons in hero — CTA lives in a kicker line. Category section is one big feature tile + three 1:1 thumbnails. Never use circular category chips. Never stack four equal product cards in the trending row — use one wide + two small."*).

---

## Phase B — Generator wiring

`generate-and-ship-theme` and `generate-theme-pack` changes:

1. Accept `brief.layout_slug` (required for merchant flow, optional for admin random).
2. Load the archetype row before calling the LLM.
3. Prepend a **LAYOUT CONTRACT** block to the system prompt with `prompt_instructions`, the locked `section_order`, `image_ratios`, motion language, and an explicit "you MUST follow this layout, do not invent another structure" line.
4. Lock `dna.layout.*` to the archetype values after parsing (defensive override) so a hallucinating model can't break the contract.
5. Use archetype `image_ratios` when calling `genImage` so hero/category/product images are sized correctly per layout.
6. Persist `layout_slug` on the theme record and on `stores.theme.layout_slug` so the storefront renderer knows which layout it's serving.

---

## Phase C — Merchant UX: pick a layout

New step **before** the existing AI Generate step in onboarding, and a new tab in `Store Design → Theme Packs`:

- Card grid of all 12 archetypes with the preview image, name, "Best for: …", and a 1-line vibe.
- "Not sure? Let AI choose" option → backend picks the highest-priority archetype matching the category brief's `section_priority`.
- Selecting a layout sets `brief.layout_slug` for generation and for any future remix on this store.

Files touched: `StepTheme.tsx` (or a new `StepLayout.tsx` ahead of `StepAIGenerate.tsx`), `ThemeMasterPipeline.tsx` admin picker, `ThemeMarketplace.tsx` filter chip "Filter by layout".

---

## Phase D — Customize works for every layout (the critical constraint)

Today `StoreDesign → Customize` only edits global colors + fonts. We extend it so layout-specific knobs always render, regardless of which archetype the merchant uses.

Approach: **Layout-aware editor schema** (no per-layout React forks).

1. Each archetype declares a small JSON `editor_schema` (stored on the archetype row) listing the knobs that make sense for it. Examples:
  - Magazine → `drop_cap`, `pull_quote_position`, `headline_serif_size`
  - Bazaar → `motif_border`, `devanagari_accent`, `mosaic_orientation`
  - Catalog → `cards_per_row` (4/5/6), `show_filters_sidebar`
  - Bold Pop → `marquee_text`, `tilt_intensity`, `sticker_color`
  - Festive → `countdown_target_date`, `festive_motif`
2. A single generic `<LayoutCustomizer schema={archetype.editor_schema} value={overrides} onChange={…} />` component renders the right inputs (color, select, text, slider, toggle, date) from the schema. No new component per layout.
3. Universal knobs always available across all 12 layouts: palette, fonts, radius, density, header style, section visibility, section reordering (within the archetype's `allowed_extra_sections`).
4. Overrides are merged into the existing `stores.theme` JSON under `theme.layout_overrides`, and each themed section component reads them via a `useLayoutOverrides()` hook. So one customizer file + one hook = every layout stays fully editable forever, including layouts we add later.
5. `MasterThemeRenderer` / `src/themes/*` sections accept layout overrides as props so a Bazaar mosaic can flip orientation, a Catalog grid can switch 4↔5↔6 columns, etc., without a new component.

---

## Phase E — Backfill & migration

- Migration creates `theme_layout_archetypes` and seeds all 12 rows with full `prompt_instructions` and `editor_schema`.
- Existing themes get `layout_slug = 'catalog-dense'` (closest to current default) so nothing breaks.
- Admin tool to re-tag legacy themes with the right archetype.

---

## Technical details

- New table `theme_layout_archetypes` (RLS: public read, admin write).
- Add column `themes.layout_slug text` and `stores.theme.layout_slug` (jsonb, no schema change needed).
- Edge function changes: `generate-and-ship-theme`, `generate-theme-pack`, `remix-theme` (remix preserves `layout_slug` unless explicitly changed).
- Frontend: new `StepLayout.tsx`, `LayoutPicker.tsx`, `LayoutCustomizer.tsx`, `useLayoutOverrides.ts`. Updates to `StoreDesign.tsx` Customize tab, `ThemeMasterPipeline.tsx`, `ThemeMarketplace.tsx`.
- Image generation: pass `aspect_ratio` from `archetype.image_ratios` per asset.
- Validation: post-LLM step asserts `dna.layout.section_order` is a permutation of the archetype's required order ± allowed extras; if not, force-overwrite.

---

## Rollout order

1. Migration + seed 12 archetypes (instructions text is the bulk of the work).
2. Generator contract wiring + `layout_slug` plumbing.
3. Merchant `StepLayout` picker + admin picker.
4. `LayoutCustomizer` + `useLayoutOverrides` + section components reading overrides.
5. Backfill legacy themes, ship.

After this lands, Phase 2 (Services) reuses the same archetype + customizer infra — service layouts (Clinic, Lawyer, Author, Tutor, Studio) become 5 more rows in the same table.

---

## Open questions before I build

1. Should the merchant be allowed to **switch layout after generation** (regenerates structure, keeps content) or is layout locked once chosen?  
Answer: Merchant can use the different theme all togather instead of regenration. 
2. For "Not sure? Let AI choose" — should the AI pick from **all 12** based on category, or only from a **shortlist of 3** we show the merchant to confirm?  
 Answer: AI pick from **all 12** based on category
3. For Customize, do you want a **"reset to layout default"** button per knob, or only a global reset?  
Answer: button per knob  
  
We have not included the effects and animation we can provide this in customise so that every blick and text can use effects and animated as required. Also during theme layout add effects and animations, it makes websites alive. 