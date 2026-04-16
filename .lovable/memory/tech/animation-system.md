---
name: Premium Animation & Effects System
description: Comprehensive animation system with 11 scroll animations, 5 card hover effects, marquee, Ken Burns, and theme section renderers
type: feature
---

## Animation Types (useAnimateOnScroll hook)
- fade-in, slide-up, slide-in-left, slide-in-right, scale-in (basic)
- parallax — background attachment fixed
- ken-burns — slow zoom on hero images (CSS keyframe)
- blur-in — blur to sharp reveal
- flip-up — 3D rotateX entrance
- bounce-in — overshoot spring
- stagger-children — children animate one-by-one with delay

## Card Hover Effects (CSS classes in index.css)
- hover-glare — glossy light sweep on hover
- hover-lift — shadow + translateY(-6px)
- hover-border-glow — animated border color pulse
- hover-zoom-image — inner .zoom-target scales on hover
- hover-tilt — 3D perspective (requires JS mousemove, CSS only provides perspective)

## Other Utilities
- animate-marquee — infinite horizontal scroll for brand strips
- typewriter-text — character-by-character text reveal
- back-to-top — opacity/transform transition
- flip-clock-digit — perspective rotate for countdown digits
- stagger-children — nth-child delays up to 12 children

## Theme Section Types (rendered in Storefront.tsx & ThemePreview.tsx)
hero, featured_products, category_grid, text_block, newsletter, banner_carousel,
testimonials, countdown_timer, trust_badges, brand_marquee, image_with_text,
video_hero, instagram_feed, collection_showcase, announcement_bar

## Hook returns { ref, style, isVisible, className }
- className includes animClassName for ken-burns and stagger-children
- AnimatedSection component applies both style and className
