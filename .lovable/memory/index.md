# Project Memory

## Core
- **Stack**: Supabase (AP region), React, Shadcn, Tailwind. AI via Gemini 2.5 Flash in Edge Functions.
- **Vision**: E-commerce for Indian small sellers. 5-min setup, 30-sec checkout.
- **Design**: Mobile-first minimalist. Dashboard primary #F97316. Marketing uses premium indigo/violet/emerald.
- **Routing**: `/` is marketing landing page, `/dashboard` is the seller application.
- **Auth**: Customers have `is_customer: true` metadata. Never redirect them to seller onboarding.
- **Cart**: Persistent customer shopping cart is managed via `localStorage`.

## Memories
- [Onboarding Wizard](mem://features/onboarding-wizard) — 7-step mandatory flow, AI product saved only on completion
- [Product Logic](mem://features/product-logic) — Category variants, 6-image uploader (Gallery/Camera)
- [Monetization](mem://business/monetization-strategy) — Premium themes (₹500), 2% platform commission
- [Shipping & Logistics](mem://features/shipping-logistics) — Delhivery proxy, AWB generation, PincodeChecker
- [Custom Domains](mem://features/custom-domains) — DNS verification (A/TXT) pointing to 185.158.133.1
- [Super Admin](mem://features/super-admin-panel) — /admin role access, Cost Matrix, theme generation
- [Order Management](mem://features/order-management) — Timeline tracking, GST-ready PDF invoices
- [Store Design](mem://features/store-design) — ThemeTemplate overrides, dynamic Google Fonts, JSONB persistence
- [Customer Storefront](mem://features/customer-storefront) — Dynamic theme rendering, one-page checkout flow
- [Payment Gateway](mem://features/payment-gateway) — Razorpay & COD, seller keys, HMAC-SHA256 verification
- [Coupons & Discounts](mem://features/coupons-discounts) — Usage limits, minimum order rules, DB RPC validation
- [Notifications](mem://features/customer-notifications) — HTML emails for orders and shipping via Edge Functions
- [SEO & Marketing](mem://features/seo-marketing) — SEOHead, absolute URLs, 1200x630 OG dims for rich cards
- [Customer Accounts](mem://features/customer-accounts) — Store-specific auth, multi-address CRUD, order history
- [Reviews & Ratings](mem://features/reviews-and-ratings) — 1-5 stars, image uploads, Verified Purchase badges
- [Mobile PWA UX](mem://features/mobile-pwa-ux) — Sticky bottom nav, iOS-safe padding, manifest installation
- [Legal & Compliance](mem://features/legal-and-compliance) — AI-generated store policies, GST info, bank details
- [Store Builder](mem://features/advanced-store-builder) — dnd-kit drag-and-drop, banner slider, full image no-crop
- [Blog System](mem://features/blog-system) — AI-assisted posts, newsletter subscriber management
- [AI Engagement](mem://features/ai-engagement-report) — 0-100 store score and actionable improvement roadmap
- [Logo Management](mem://features/logo-management) — 1:1 react-easy-crop, original filename retention
- [Dynamic Categories](mem://features/dynamic-categories) — Seller-defined custom taxonomies and nested subcategories
- [Theme Marketplace](mem://features/enterprise-theme-marketplace) — 5-page AI generated themes, cost/revenue tracking
- [Animation System](mem://tech/animation-system) — useAnimateOnScroll hook, CSS transitions, intersection observer
- [Theme Cost Optimization](mem://tech/theme-cost-optimization) — Two-tier prompting, blueprint library, image pool, remix feature
