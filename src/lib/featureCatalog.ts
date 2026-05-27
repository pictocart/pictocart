/* Single source of truth for marketing-side feature copy.
   Used by the Features mega-menu, the "Every Solution" grid and the
   /features/:slug detail page. Screenshots will be progressively replaced
   with real merchant-portal captures under src/assets/features/. */
import {
  Camera, Tag, Layers, Package, Download, Globe, Database, Wallet,
  Palette, MousePointer2, Image, Type, Link2, Smartphone, MessageCircle,
  QrCode, BookOpen, Mail, CreditCard, Truck, FileText, Ticket, Star,
  Sparkles, BarChart3, AlarmClock, CalendarCheck2, Bot, type LucideIcon,
} from 'lucide-react';

export type FeaturePillar =
  | 'Sell' | 'Source' | 'Design' | 'Channels' | 'Operate' | 'Grow';

export interface FeatureItem {
  slug: string;
  name: string;
  pillar: FeaturePillar;
  icon: LucideIcon;
  short: string;        // mega-menu / grid line
  tagline: string;      // detail-page hero subline
  bullets: string[];    // what-it-does list (3-6)
  cta?: string;
  ctaHref?: string;
}

export const featureCatalog: FeatureItem[] = [
  // ──────── SELL
  { slug: 'snap-to-product', name: 'Snap-to-Product AI', pillar: 'Sell', icon: Camera,
    short: 'Photo → title, description, price, SEO in 5s',
    tagline: 'Snap a product photo. Walk away with a complete listing.',
    bullets: [
      'Take up to 6 photos per product from gallery or live camera',
      'AI writes title, long description, short summary and SEO tags',
      'Suggests price based on category benchmarks',
      'You can keep, tweak or replace anything with one tap',
    ],
  },
  { slug: 'variants', name: 'Product Variants', pillar: 'Sell', icon: Layers,
    short: 'Sizes, colours, packs — auto matrix',
    tagline: 'Real-world variants without the spreadsheet nightmare.',
    bullets: [
      'Pre-built matrices for fashion (size/colour), food (pack/weight), beauty (shade)',
      'Per-variant pricing, inventory and SKU',
      'Buyer sees a clean swatch + dropdown picker on the storefront',
    ],
  },
  { slug: 'categories', name: 'Categories & Collections', pillar: 'Sell', icon: Tag,
    short: 'Custom taxonomies & nested sub-categories',
    tagline: 'Organise your catalog the way your customers shop.',
    bullets: [
      'Create your own categories — Lehengas, Crackers, Reels, anything',
      'Two-level nesting (Category → Sub-category)',
      'Drag to reorder, drop products in bulk',
    ],
  },
  { slug: 'inventory', name: 'Inventory & Low-Stock', pillar: 'Sell', icon: Package,
    short: 'Auto-deduct on order, alert before zero',
    tagline: 'Never sell what you don\'t have. Never miss a restock.',
    bullets: [
      'Stock auto-decrements on every paid order',
      'Configurable low-stock threshold + dashboard alert',
      'Inventory movements ledger (sale / purchase / manual)',
    ],
  },
  { slug: 'digital-products', name: 'Digital Products', pillar: 'Sell', icon: Download,
    short: 'PDFs, courses, templates — secure delivery',
    tagline: 'Sell digital goods alongside physical inventory.',
    bullets: [
      'Upload PDFs, ZIPs, templates, downloadable bundles',
      'Secure tokenised download links emailed after purchase',
      'Skip Shiprocket / COD for purely digital orders',
    ],
  },

  // ──────── SOURCE
  { slug: 'source-india', name: 'Source India', pillar: 'Source', icon: Globe,
    short: 'Find verified manufacturers & wholesale catalogs',
    tagline: 'Now what to sell — we\'ve got a sourcing network for that too.',
    bullets: [
      'Browse verified Indian manufacturers across 40+ product categories',
      'Filter by MOQ, city, GST status and lead time',
      'Request quotes inside Pic to Cart — no spreadsheets, no WhatsApp chaos',
      'Pull supplier catalogs straight into your product list',
    ],
  },
  { slug: 'bulk-import', name: 'Bulk CSV Import', pillar: 'Source', icon: Database,
    short: 'Bring 100s of products from Shopify, Excel, etc.',
    tagline: 'Migrating? Bring your whole catalog in one upload.',
    bullets: [
      'Drop a CSV — we map columns and import images from URLs',
      'AI fills missing fields (descriptions, SEO, tags) on import',
      'Rollback any import in one click',
    ],
  },
  { slug: 'supplier-khata', name: 'Supplier Khata', pillar: 'Source', icon: Wallet,
    short: 'Track supplier dues like a paper ledger',
    tagline: 'A digital "udhaar bahi" for your suppliers.',
    bullets: [
      'Record purchase bills with bill number, GST and HSN',
      'Running balance per supplier, payable & receivable',
      'Settles into your P&L automatically',
    ],
  },

  // ──────── DESIGN
  { slug: 'theme-marketplace', name: 'Theme Marketplace', pillar: 'Design', icon: Palette,
    short: '50+ AI-crafted, 5-page premium themes',
    tagline: 'A theme store as good as ThemeForest — but every theme is plug-and-play.',
    bullets: [
      '50+ themes across fashion, food, electronics, beauty, services, B2B',
      'Each theme is a full 5-page design (Home / Category / Product / Cart / Checkout)',
      'Free + premium tiers (premium ₹500, 14-day free trial)',
      'Browse, live-preview, apply in one click',
    ],
    cta: 'Open Marketplace', ctaHref: '/marketplace',
  },
  { slug: 'builder', name: 'Drag-and-Drop Builder', pillar: 'Design', icon: MousePointer2,
    short: 'Rearrange sections, swap banners, no code',
    tagline: 'Build your homepage like a Lego set.',
    bullets: [
      'dnd-kit powered drag-to-reorder for every homepage section',
      'Banner slider with full-image-no-crop uploads',
      'Live preview alongside the editor',
    ],
  },
  { slug: 'logo-banner', name: 'Logo & Banner Upload', pillar: 'Design', icon: Image,
    short: '1:1 cropper, original filename preserved',
    tagline: 'Brand your store in 30 seconds.',
    bullets: [
      'Built-in 1:1 react-easy-crop for square logos',
      'Multi-banner slider for the homepage',
      'Original filename retained — clean URLs for SEO',
    ],
  },
  { slug: 'google-fonts', name: 'Google Fonts', pillar: 'Design', icon: Type,
    short: 'Pick from 1,000+ fonts, applied site-wide',
    tagline: 'Typography that matches your brand.',
    bullets: [
      'Searchable Google Fonts picker',
      'Separate heading and body font choices',
      'Loaded dynamically — only the fonts you use',
    ],
  },
  { slug: 'custom-domain', name: 'Custom Domain + SSL', pillar: 'Design', icon: Link2,
    short: 'yourbrand.in with auto-issued SSL',
    tagline: 'Your brand, your URL, our infrastructure.',
    bullets: [
      'Point an A or CNAME record at 185.158.133.1',
      'DNS verification + SSL provisioned automatically',
      'Multi-domain support on Growth plan',
    ],
  },

  // ──────── CHANNELS
  { slug: 'pwa', name: 'Storefront PWA', pillar: 'Channels', icon: Smartphone,
    short: 'Customers install your store as an app',
    tagline: 'Native-app feel, web-app effort.',
    bullets: [
      '"Add to Home Screen" prompt on Android & iOS',
      'Sticky bottom navigation, iOS-safe padding',
      'Offline-friendly caching of the storefront shell',
    ],
  },
  { slug: 'whatsapp-share', name: 'WhatsApp & Instagram Share', pillar: 'Channels', icon: MessageCircle,
    short: 'One-tap share cards with OG previews',
    tagline: 'Sell where your customers already are.',
    bullets: [
      'Per-product share buttons (WhatsApp, IG, FB, Twitter, copy-link)',
      'Rich OG / Twitter cards baked in — 1200×630 hero images',
      'Order receipts go to customers on WhatsApp',
    ],
  },
  { slug: 'qr-codes', name: 'QR Codes', pillar: 'Channels', icon: QrCode,
    short: 'Print-ready QR for store, product, table',
    tagline: 'From shop counter to phone screen in one scan.',
    bullets: [
      'Generate QR for store, individual product, dine-in table',
      'Trackable short links — see scans in analytics',
      'High-res PDF download for print',
    ],
  },
  { slug: 'blog-seo', name: 'Blog & SEO', pillar: 'Channels', icon: BookOpen,
    short: 'AI-assisted posts, sitemap, structured data',
    tagline: 'Get found on Google without hiring an agency.',
    bullets: [
      'AI-assisted post drafting',
      'Per-page SEO title + meta + canonical',
      'Auto sitemap + JSON-LD for products and posts',
    ],
  },
  { slug: 'newsletter', name: 'Email Newsletter', pillar: 'Channels', icon: Mail,
    short: 'Capture subscribers, send branded broadcasts',
    tagline: 'Turn one-time buyers into a list you own.',
    bullets: [
      'Newsletter signup section on storefront',
      'Subscriber dashboard with export',
      'Branded HTML emails via Resend',
    ],
  },

  // ──────── OPERATE
  { slug: 'payments', name: 'Razorpay / UPI / COD', pillar: 'Operate', icon: CreditCard,
    short: 'All payment modes, direct payouts',
    tagline: 'Money lands in your bank — we don\'t hold it.',
    bullets: [
      'Razorpay with your own keys',
      'UPI Intent + Cash on Delivery toggles',
      'COD blocklist by pincode or phone',
      'HMAC-SHA256 verified webhooks',
    ],
  },
  { slug: 'shipping', name: 'Shiprocket Shipping', pillar: 'Operate', icon: Truck,
    short: '29,000+ pincodes, 17+ couriers',
    tagline: 'Print labels and track shipments without leaving Pic to Cart.',
    bullets: [
      'Single Shiprocket connector — bring your API-User credentials',
      'Auto-fetch courier rates by weight + pincode',
      'AWB number written back to the order',
    ],
  },
  { slug: 'gst-invoices', name: 'GST-Ready Invoices', pillar: 'Operate', icon: FileText,
    short: 'Auto HSN, bulk export for your CA',
    tagline: 'Compliance done — no spreadsheets, no surprises.',
    bullets: [
      'Per-order PDF invoice with GSTIN, HSN and tax breakup',
      'Auto invoice numbering per fiscal year',
      'Bulk month-end export for accountants',
    ],
  },
  { slug: 'coupons', name: 'Coupons & Discounts', pillar: 'Operate', icon: Ticket,
    short: 'Usage caps, min-order, expiry rules',
    tagline: 'Run promos without breaking your margins.',
    bullets: [
      'Percent or flat discount',
      'Per-coupon usage limit, min order value, expiry',
      'Server-validated via secure RPC — no client tampering',
    ],
  },
  { slug: 'reviews', name: 'Reviews & Ratings', pillar: 'Operate', icon: Star,
    short: '1-5 stars, photo reviews, verified badges',
    tagline: 'Social proof that converts visitors into buyers.',
    bullets: [
      'Star rating + free-text + optional images',
      '"Verified Purchase" badge for paid-order reviewers',
      'Moderation queue in the dashboard',
    ],
  },

  // ──────── GROW
  { slug: 'ai-engagement', name: 'AI Engagement Report', pillar: 'Grow', icon: Sparkles,
    short: '0-100 store score + improvement roadmap',
    tagline: 'A weekly health check, written by AI, for your store.',
    bullets: [
      'Scores SEO, content, theme, pricing, inventory and trust',
      'Returns a prioritised roadmap of fixes',
      'Refresh as often as you like — credits-metered',
    ],
  },
  { slug: 'analytics', name: 'Analytics Dashboard', pillar: 'Grow', icon: BarChart3,
    short: 'Orders, revenue, visitors, funnels',
    tagline: 'Know your numbers without staring at GA4.',
    bullets: [
      'Daily / weekly / monthly revenue + order trends',
      'Conversion funnel: visitor → cart → checkout → paid',
      'Top products, abandoned carts and traffic sources',
    ],
  },
  { slug: 'abandoned-cart', name: 'Abandoned Cart Recovery', pillar: 'Grow', icon: AlarmClock,
    short: 'Auto-nudge visitors who left at checkout',
    tagline: 'Win back the 60% who almost bought.',
    bullets: [
      'Banner in the dashboard listing abandoned carts',
      'One-click recovery email with auto-coupon',
    ],
  },
  { slug: 'weekly-digest', name: 'Weekly Digest', pillar: 'Grow', icon: CalendarCheck2,
    short: 'A summary email every Monday morning',
    tagline: 'Your store\'s week in one glance.',
    bullets: [
      'Revenue, orders, top product and one AI tip',
      'Sent to the owner email on Monday 9am IST',
    ],
  },
  { slug: 'pica2', name: 'Pica2 AI Assistant', pillar: 'Grow', icon: Bot,
    short: 'In-dashboard helper for any question',
    tagline: 'The 24/7 co-founder you didn\'t hire.',
    bullets: [
      'Ask anything about your store, orders, products or settings',
      'Suggests the right page and pre-fills forms',
      'Powered by Gemini 2.5 Flash — fast and cheap',
    ],
  },
];

export const PILLARS: { id: FeaturePillar; label: string; copy: string }[] = [
  { id: 'Sell',     label: 'Sell',     copy: 'List products & take orders' },
  { id: 'Source',   label: 'Source',   copy: 'Find what to sell' },
  { id: 'Design',   label: 'Design',   copy: 'Make it your brand' },
  { id: 'Channels', label: 'Channels', copy: 'Reach customers everywhere' },
  { id: 'Operate',  label: 'Operate',  copy: 'Payments, shipping, taxes' },
  { id: 'Grow',     label: 'Grow',     copy: 'Analytics & AI insights' },
];

export const byPillar = (p: FeaturePillar) => featureCatalog.filter((f) => f.pillar === p);
export const findFeature = (slug: string) => featureCatalog.find((f) => f.slug === slug);
