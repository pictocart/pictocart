

# Store on Tips — Public Marketing Website with Maximum Conversion

## Current State
- `/` route goes directly to the seller dashboard (behind ProtectedRoute → redirects to `/auth`)
- No public landing page exists — visitors never see what the platform does before being asked to log in
- Zero SEO presence for the main domain

## What We Will Build

A stunning, animated, SEO-optimized **public marketing website** at `/` that converts visitors into merchants. The seller dashboard moves to `/dashboard`. The landing page will use a modern dark-to-light gradient palette (deep indigo/violet to white) — NOT the orange admin theme — to feel premium and distinct.

### Color Scheme
- **Primary gradient**: Indigo-600 → Violet-500 (hero), transitioning to clean white sections
- **Accent**: Emerald-400 for CTAs (high contrast = high conversion)
- **Text**: Slate-900 on light, White on dark
- This is ONLY for the marketing site — the dashboard and storefronts keep their existing themes

### Page Sections (Single-Page Landing)

**1. Sticky Navigation Bar**
- Logo + "Store on Tips" wordmark
- Links: Features, How It Works, Pricing, Themes, Blog
- "Login" (ghost) + "Start Free" (filled emerald CTA)
- Transparent on hero, solid white on scroll (backdrop-blur transition)

**2. Hero Section — Full-viewport**
- Animated headline with typewriter effect cycling through merchant types: "Fashion Brands", "Home Bakers", "Artisan Jewelers", "Organic Farmers"
- Main copy: "Launch Your Online Store in 5 Minutes"
- Sub: "Just snap a photo. AI does the rest."
- Single CTA: "Create Your Free Store →"
- Floating 3D-style mockup of a phone showing a storefront (CSS transforms + parallax)
- Subtle gradient mesh background with floating particles (CSS only)
- Stats bar: "10,000+ Stores Created • 50+ Categories • ₹0 Setup Fee"

**3. Trusted By / Social Proof Bar**
- Scrolling logo marquee (CSS animation) with category icons
- "Trusted by merchants across India"

**4. How It Works — 3 Steps**
- Scroll-triggered staggered fade-in cards
- Step 1: 📸 "Snap a Photo" — Upload product image
- Step 2: 🤖 "AI Creates Everything" — Title, price, description, SEO
- Step 3: 🚀 "Go Live Instantly" — Share your store link
- Each card with a subtle hover-lift effect

**5. Feature Showcase — Bento Grid Layout**
- Large + small cards in asymmetric grid
- AI Product Generation, Theme Marketplace, Order Management, Analytics, SEO Tools, Payment Integration
- Each card with icon, title, short copy
- Intersection Observer fade-in animations

**6. Theme Showcase — Horizontal Scroll Carousel**
- Preview cards of premium themes with category badges
- "Browse 50+ AI-Generated Themes" headline
- Smooth horizontal scroll with grab cursor

**7. Category Showcase**
- "One Platform. Every Business." headline
- Animated category pills: Fashion, Food, Electronics, Beauty, Handcraft, Books, Services...
- Each pill links to `/auth` with category pre-selected

**8. Pricing Section**
- Two cards: Free Plan vs Premium
- Free: ₹0 forever, unlimited products, basic themes
- Premium: ₹499/mo, custom domain, premium themes, priority support
- Highlighted "Most Popular" badge on Premium
- CTA on both

**9. Testimonials**
- 3 rotating quote cards with merchant photos, store names, categories
- Star ratings, growth metrics ("Sales grew 300% in 2 months")
- Auto-rotate with manual navigation dots

**10. Final CTA Section**
- Large gradient banner
- "Your Store is One Click Away"
- Email input + "Get Started Free" button
- "No credit card required • Setup in 5 minutes"

**11. Footer**
- 4-column: Product, Company, Resources, Legal
- Social links, copyright
- SEO-friendly internal links

### Animations (All CSS/Intersection Observer — No Libraries)
- Hero: Typewriter text effect via CSS keyframes
- Floating phone mockup: `translateY` oscillation on `@keyframes float`
- Scroll sections: `useAnimateOnScroll` hook (already exists) for fade-in, slide-up, scale-in
- Marquee: CSS infinite horizontal scroll
- Parallax gradient: `background-attachment: fixed`
- Number counters: Animated count-up on intersection
- Bento cards: Staggered reveal with `transition-delay`

### SEO Implementation
- Update `index.html` with proper meta title, description, OG tags for the platform (not individual stores)
- SEOHead component on landing page with JSON-LD `Organization` + `SoftwareApplication` schema
- Semantic HTML: proper `<section>`, `<article>`, `<h1>`-`<h3>` hierarchy
- `robots.txt` already allows all crawlers
- Alt text on all images
- Canonical URL

### Routing Changes
| Before | After |
|--------|-------|
| `/` → Dashboard (protected) | `/` → Public Landing Page |
| N/A | `/dashboard` → Dashboard (protected) |
| `/auth` → Auth page | `/auth` → Auth page (unchanged) |

All existing protected routes (`/products`, `/orders`, etc.) stay the same. Only `/` changes.

---

## Technical Implementation (7 files)

### 1. `src/pages/LandingPage.tsx` (NEW)
The complete marketing page — all sections in one component with scroll-triggered animations using existing `useAnimateOnScroll` hook.

### 2. `src/App.tsx` (EDIT)
- Add `/` → `<LandingPage />`
- Move dashboard to `/dashboard` → `<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>`
- Update all sidebar/nav links referencing `/` to `/dashboard`

### 3. `src/components/ProtectedRoute.tsx` (EDIT)
- Redirect unauthenticated users to `/auth` (already does this, no change needed)

### 4. `src/components/DashboardLayout.tsx` (EDIT)
- Update the logo/home link from `/` to `/dashboard`

### 5. `index.html` (EDIT)
- Update meta title: "Store on Tips — Launch Your Online Store in 5 Minutes"
- Update meta description for SEO
- Update OG tags

### 6. `tailwind.config.ts` (EDIT)
- Add custom keyframes: `float`, `typewriter`, `marquee`, `count-up`
- Add corresponding animation utilities

### 7. `src/index.css` (EDIT)
- Add landing page specific utility classes for gradient mesh, glass morphism navbar

### 8. Navigation updates
- `src/components/DashboardLayout.tsx` — sidebar home link → `/dashboard`
- Any other internal links pointing to `/`

