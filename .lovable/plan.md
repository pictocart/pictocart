# Hero Section: Full Customisation Upgrade

Today the Hero inspector only lets a merchant swap one image. The renderer already supports 6 layout variants (`centered`, `split`, `magazine`, `editorial_serif`, `fullscreen_image`, `minimal_left`, `asymmetric`) but they are not exposed in the UI. This plan turns the Hero into a Shopify/WordPress-grade block with a "Choose Style" dropdown, slider, video, overlay, height, alignment, animation, and per-slide CTAs — usable across every master theme without regenerating themes.

## What the merchant will see in the Inspector (Hero only)

A new card-style inspector with these grouped controls:

1. **Choose Style** (dropdown) — drives the layout entirely
   - `Slider / Carousel` (multi-image, autoplay, dots, arrows)
   - `Fixed Banner` (single image, classic centered hero)
   - `Half Banner` (compact, ~40vh, image right)
   - `Split` (text left, image right)
   - `Full-screen Image` (90vh w/ overlay)
   - `Video Background` (mp4/webm or YouTube/Vimeo URL)
   - `Magazine / Editorial` (oversized serif headline)
   - `Minimal Left` (text only, no image)
   - `Asymmetric` (diagonal image)
   - `Gradient` (no image, gradient bg with text)

2. **Slides** (visible only when style = Slider) — repeater
   - Image upload, headline, sub, kicker, CTA label, CTA link, text alignment, text color override
   - Drag-to-reorder, add/remove
   - Slider settings: autoplay on/off, interval (3–10s), transition (fade / slide), show arrows, show dots, loop

3. **Media** (visible for non-slider styles)
   - Image upload OR video upload (mp4/webm ≤ 20 MB)
   - Or paste YouTube/Vimeo URL
   - Mobile image override (optional)
   - Focal point picker (click on preview to set object-position)

4. **Content**
   - Kicker, Title, Sub, CTA label + link, Secondary CTA label + link
   - Text alignment: left / center / right
   - Max width slider

5. **Overlay & Effects**
   - Overlay color + opacity (0–80%)
   - Gradient overlay toggle (top→bottom / radial / none)
   - Ken Burns slow-zoom toggle
   - Parallax toggle
   - Entrance animation: fade-in / slide-up / blur-in / none

6. **Layout**
   - Height: Auto / Short (40vh) / Medium (60vh) / Tall (80vh) / Full (100vh) / Custom px
   - Content position (9-point grid: top-left … bottom-right)
   - Padding top/bottom sliders

7. **Section colors** (existing) — primary, accent, bg, text overrides
8. **Reset section** (existing)

## Data shape stored in `theme_overrides.sections[heroIdx]`

```json
{
  "style": "slider",
  "height": "tall",
  "content_align": "center-center",
  "slides": [
    { "image": "...", "image_mobile": "...", "kicker": "...", "title": "...",
      "sub": "...", "cta": "Shop now", "cta_href": "/shop",
      "cta_secondary": "", "cta_secondary_href": "", "focal": "50% 40%" }
  ],
  "slider": { "autoplay": true, "interval": 5000, "transition": "fade",
              "arrows": true, "dots": true, "loop": true },
  "video": { "src": "", "provider": "upload|youtube|vimeo", "poster": "", "muted": true, "loop": true },
  "overlay": { "color": "#000000", "opacity": 0.45, "gradient": "bottom" },
  "effects": { "ken_burns": false, "parallax": false, "entrance": "fade-in" }
}
```

Backwards-compatible: if `slides` is empty, falls back to legacy single `image/title/sub/cta` keys so existing theme-generated heroes keep working.

## Technical work

### 1. Renderer — `src/components/theme/MasterThemeRenderer.tsx`
Rewrite the `Hero({ p, dna, storeSlug })` function:
- Switch on `p.style` with new cases: `slider`, `fixed`, `half_banner`, `video`, `gradient` (plus existing 6).
- Build a lightweight `<HeroSlider>` subcomponent using Embla (already in shadcn carousel) with fade/slide, autoplay, arrows, dots.
- Build `<HeroVideo>` that detects YouTube/Vimeo IDs and renders `<iframe>`; otherwise `<video autoplay muted loop playsinline>`.
- Centralise overlay, height (map height token → tailwind class), Ken Burns (CSS class from `tech/animation-system`), parallax (`bg-fixed` on a wrapping div).
- Honour `focal` via `object-position`.

### 2. Inspector — `src/pages/CustomiserV2.tsx`
Add a `HeroInspector` branch inside `SectionInspector` (or a dedicated component) when `section.type === "hero"`:
- Style dropdown (shadcn `Select`)
- Conditional rendering of "Slides" repeater vs single Media block
- Reuse existing `ItemsEditor` pattern for slides (with image upload per row → reuse `onUploadImage` but extended to accept a slide index)
- Overlay color picker + opacity slider
- Height segmented control
- 9-point position grid (radio buttons)
- Toggles for Ken Burns / parallax / autoplay
- Live updates via existing `customiser:update` postMessage flow

### 3. Image upload helper
`onUploadImage` currently maps `(idx, file) → sectionOverrides[idx].image`. Extend signature to `(idx, file, target?)` where `target` can be `"image"`, `"image_mobile"`, `"video_poster"`, or `{ slideIndex: number, key: "image" | "image_mobile" }`. Uploads still go through the existing storage path.

### 4. Defaults & migration
- No DB migration needed — overrides live in `stores.settings.theme_overrides` JSONB.
- On first render of an existing hero with no `style`, infer from theme's default `props.style` (already present in manifest).
- Add a "Reset Hero to theme default" button that wipes the whole hero override.

### 5. Theme generator alignment (optional, low priority)
Update the AI theme-generation prompt so newly generated themes can opt into `style: "slider"` with a starter set of slides. Not required for the feature to work — merchants can convert any hero to slider from the UI immediately.

## Files to touch

```text
src/components/theme/MasterThemeRenderer.tsx   (Hero rewrite + HeroSlider + HeroVideo)
src/pages/CustomiserV2.tsx                     (HeroInspector + extended onUploadImage)
src/components/ui/carousel.tsx                 (already exists — reuse)
src/index.css                                  (ken-burns / parallax classes already exist)
```

No new dependencies — Embla, shadcn Select/Slider/Switch, and the animation classes are all in the project.

## Out of scope (call out for next iteration)
- Per-slide schedule (start/end date) — Shopify-style scheduled banners
- A/B testing of hero variants
- Lottie/3D backgrounds
- AI-suggested headline rewrites inside the inspector (could plug into existing Lovable AI later)

## Approval
Reply "go" to implement, or tell me which controls to drop / add before I start.
