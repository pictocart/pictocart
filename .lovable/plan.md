# Pro Themes & Customise — Premium Tier Plan

_Status: planned, not built. Reserved as a paid upgrade. (This doc replaces the previous sidebar-fix plan, which has shipped.)_

> Intended filename: `.lovable/Pro themes and Customise.md`. Plan mode only allows writes to `plan.md`, so this content lives here for now — please rename/move on build mode if needed.

## Positioning

Bundle the upcoming **Theme Brief Generator** (multi-page AI theme from a free-text brand idea) and **Advanced Customise** (rename pages/nav, add/remove pages, per-page section editor) as a **premium add-on** — not part of the free tier.

- **Pack name:** Pro Themes & Customise Pro
- **Entry price:** ₹1,499 / store / one-time unlock (or bundled inside higher SaaS tiers)
- **Target merchants:** restaurants, cafés, doctors, lawyers, salons, boutiques — anyone whose storefront vocabulary doesn't match the default e-commerce "Shop / Journal / About".

## What the merchant gets at ₹1,499

1. **Theme Brief Generator**
   - Large free-text brief box ("Describe your brand — e.g. *A South Indian vegetarian restaurant in Bengaluru, heritage feel, banana-leaf greens + temple gold, menu / chef's story / locations / reservations…*").
   - One-shot generation of a **complete multi-page theme** (Home + Menu/Shop + About + Contact + optional Blog / Gallery / Locations / Reservations).
   - Vertical-aware section blocks (`MenuSection` for restaurants, `DoctorSchedule` for clinics, `CaseStudies` for lawyers).
   - 3 regenerations included; further regenerations billed from the wallet.

2. **Customise Pro**
   - **Pages tab** — list every page from `dna.pages`, reorder, toggle visible/hidden, rename page title and nav label independently (*Shop → Menu / Store*, *Journal → Blog*, *About Us → Who We Are*).
   - **Per-page section editor** — drop new sections into any page, not just Home.
   - **Vocabulary presets** — one click swaps *Shop → Menu / Services / Catalogue / Collection* sitewide.
   - **Custom page builder** — add brand-new pages (*Franchise*, *Press*, *Careers*) that appear in nav + sitemap.

3. **Premium-only goodies**
   - 5 paid theme presets (Restaurant, Clinic, Law Firm, Salon, Atelier).
   - Higher-quality image model on generation (Gemini 3 Pro Image vs 2.5 Flash Image).
   - Priority queue on the generation pipeline.

## What stays free

- Existing 8 starter themes.
- Today's `HomepageBuilder`, `HeaderEditor`, `FooterEditor`.
- Renaming the 3 default nav labels in the Header editor (already shipped).

## Pros

- Clear monetisation hook for the most asked-for feature (full brand match).
- Differentiates serious merchants (restaurants, clinics) from hobbyists without alienating either.
- Justifies ongoing AI cost — ~80 credits / generation in tokens + images; ₹1,499 covers many regenerations with margin.
- Drives upgrades into Pro SaaS tiers; the unlock can be bundled free with ₹2,499/mo to push subscriptions.
- Gives sales/marketing a vertical-first story beyond "e-commerce store builder".

## Cons / risks

- Free-tier merchants in service verticals see a paywall on Day 1 — must be framed as *"upgrade to unlock your industry"*, not *"you can't rename Shop"*.
- Generation quality varies with brief quality; refund policy must be explicit ("regenerations included, no cash refunds").
- Token + image cost is real — enforce per-store generation caps server-side to prevent abuse.
- Extra surface area in Customise raises support load; needs in-product help + Pica 2 prompt updates.

## Packaging options

| SKU | Price | What's included |
|---|---|---|
| **Pro Themes & Customise (one-time)** | ₹1,499 / store | Brief generator (3 generations) + Customise Pro forever |
| **Pro Themes & Customise (monthly)** | ₹199 / mo | Unlimited regenerations, all 5 premium presets |
| **Bundled in SaaS** | included in ₹2,499/mo plan | Same as monthly add-on, plus priority queue |

## Gating implementation notes (for later)

- New flag: `stores.settings.entitlements.themes_pro = true` (set on successful payment).
- Customise checks `entitlements.themes_pro` before showing Pages tab, Brief generator, and rename-everywhere actions; otherwise shows upsell card with "Unlock for ₹1,499" CTA → Razorpay → webhook flips the flag.
- `generate-and-ship-theme` edge function reads the flag + a `generations_remaining` counter; rejects with 402 when exhausted.
- Admin override at `/admin/stores/:id` to grant/revoke for support cases.
- Reuse the existing `Billing` page to surface the add-on, and the wallet for overage regenerations.

## Build order (when greenlit)

1. **Phase 1** — Theme Brief textarea + multi-page DNA in `generate-and-ship-theme` (behind a feature flag).
2. **Phase 2** — `Pages` tab in Customise + storefront wiring of renamable nav.
3. **Phase 3** — Entitlements + paywall + Razorpay unlock + admin grant.
4. **Phase 4** — Vertical presets (Restaurant, Clinic, Law Firm, Salon) and the `MenuSection` / `DoctorSchedule` blocks.

## Out of scope for this doc

Actual implementation. This file only locks positioning and price (₹1,499 entry) so the engineering plan can be picked up later as a paid feature, not a free one.
