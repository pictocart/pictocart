---
name: Theme Generation Cost Optimization
description: Two-tier AI prompting, blueprint library, image pool reuse, and remix feature to cut theme generation cost from ₹18 to ₹1-3
type: feature
---

## Architecture: Template + Tweak

### Two-Tier AI Prompting
- **Tier 1**: Lightweight AI call (Gemini Flash) returns only Design DNA — name, colors, fonts, section order, image prompts (~800 tokens)
- **Tier 2**: Deterministic assembly from `theme_section_blueprints` table — zero AI cost

### Blueprint Library (`theme_section_blueprints` table)
- Pre-built section JSON configs for all 15 section types
- Auto-seeded from generated themes (capped at 5 variants per type)
- Looked up by `section_type` + `category_tags`
- Fallback blueprints hardcoded in edge function

### Image Pool (`theme_image_pool` table)
- AI-generated images cached by `category + section_type`
- If 3+ pool images exist for a section, pool is reused instead of regenerating
- New images auto-saved to pool after generation

### Parallel Image Generation
- Images generated via `Promise.all` in batches of 3 (was sequential)

### Remix Feature (`remix-theme` edge function)
- Clones existing theme structure + images
- Only generates new colors/fonts/name via Gemini Flash Lite (~300 tokens)
- Cost: ₹0.10-0.30 per remix

## Cost Projections
| Scenario | Cost |
|----------|------|
| Fresh category | ₹8-10 |
| Category with pool | ₹0.50-1.50 |
| Remix | ₹0.10-0.30 |
