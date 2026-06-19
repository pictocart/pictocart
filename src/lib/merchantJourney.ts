/* Shared content for the merchant journey + FAQ — used by LandingPage and /how-it-works.
   The journey mirrors the actual onboarding flow: sign-up + 4 mandatory wizard steps. */
import {
  Palette, Rocket, Store, Tag, Users, type LucideIcon,
} from 'lucide-react';
import flow01 from '@/assets/flow/01-signup.jpg';
import flow02 from '@/assets/flow/02-onboarding.jpg';
import flow04 from '@/assets/flow/04-theme.jpg';
import flow06 from '@/assets/flow/06-golive.jpg';
import flow03 from '@/assets/flow/03-products.jpg';

export interface JourneyStep {
  step: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  long?: string;
  bullets?: string[];
  image: string;
  accent: string;
  bg: string;
  iconText: string;
}

export const merchantJourney: JourneyStep[] = [
  {
    step: '01', icon: Users, title: 'Sign Up Free',
    desc: 'Create your account in 30 seconds with email or Google. No credit card required.',
    long: 'You land on Pic to Cart, hit "Start Free", and sign up with Google or your email. We auto-create a workspace tied to your account — no team setup, no forms.',
    bullets: ['Email or Google sign-in', 'No credit card', 'Workspace created instantly'],
    image: flow01, accent: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', iconText: 'text-emerald-600',
  },
  {
    step: '02', icon: Store, title: 'Tell Us About Your Store',
    desc: 'Pick a name and a free .pictocart.in URL. That\'s it — one minute, one screen.',
    long: 'Type your store name, we check the slug live, and reserve a free `yourstore.pictocart.in` URL. You can attach a custom domain anytime later.',
    bullets: ['Live slug availability', 'Free subdomain reserved', 'Custom domain ready to plug in'],
    image: flow02, accent: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', iconText: 'text-orange-600',
  },
  {
    step: '03', icon: Tag, title: 'Choose Your Category',
    desc: 'Fashion, food, electronics, beauty, services… pick what you sell. We tune themes, taxes & layouts for you.',
    long: 'Tap your category (and optional subcategory). We pre-pick fonts, colour palette, GST defaults and product fields that fit your trade — so every later step is shorter.',
    bullets: ['15+ categories with subcategories', 'GST & HSN defaults applied', 'Industry-tuned theme picks'],
    image: flow03, accent: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', iconText: 'text-rose-600',
  },
  {
    step: '04', icon: Palette, title: 'Pick a Beautiful Theme',
    desc: 'A theme is auto-suggested for your category from 50+ AI-crafted designs. Keep it or swap in one tap.',
    long: 'We pre-select the best-rated theme for your category from our marketplace of 50+ AI-generated 5-page designs. Browse trending or latest, live-preview any, and apply with one click.',
    bullets: ['Auto-suggested for your category', '50+ premium themes', 'Live preview before you commit'],
    image: flow04, accent: 'from-violet-500 to-indigo-500', bg: 'bg-violet-50', iconText: 'text-violet-600',
  },
  {
    step: '05', icon: Rocket, title: 'Your Store Goes Live',
    desc: 'One tap publishes the store. Share to WhatsApp, Instagram or Facebook with rich preview cards already attached.',
    long: 'Hit "Go Live" — we provision the storefront, generate share cards, enable COD by default, and drop you on the dashboard with a ready-to-share link.',
    bullets: ['One-click publish', 'COD enabled by default', 'WhatsApp / Instagram / Facebook share cards'],
    image: flow06, accent: 'from-fuchsia-500 to-purple-500', bg: 'bg-fuchsia-50', iconText: 'text-fuchsia-600',
  },
];

export interface FAQ { q: string; a: string }

/* Top 5 questions Indian merchants ask before signing up — shown on the landing page. */
export const topMerchantFAQs: FAQ[] = [
  {
    q: 'Is it really free? What\'s the catch?',
    a: 'Yes. The Free plan lets you sell unlimited products, take orders, and use COD/UPI forever. We charge a small 3% convenience fee on Free, which drops to 2% on Starter (₹499) and 1% on Growth (₹1499). Premium themes, custom domains and advanced analytics are paid features — but you never need a credit card to start.',
  },
  {
    q: 'How long does setup actually take?',
    a: 'Most merchants are live in 5 minutes flat: 30 seconds to sign up, 1 minute to name your store, 30 seconds to pick a category, 1 minute to choose a theme (or accept the auto-suggested one) and one tap to go live. You can add products, payments and your custom domain right after — but you\'re selling from minute five.',
  },
  {
    q: 'How does payment work? Where does the money go?',
    a: 'You connect your own Razorpay account, so customer payments land directly in your bank — we never hold your money. We also support COD and UPI Intent. The convenience fee is invoiced separately, never deducted from customer payments.',
  },
  {
    q: 'What about GST and invoices?',
    a: 'Every order generates a GST-ready PDF invoice with your business details, GSTIN and HSN codes. You can download all invoices in bulk for your CA at month-end.',
  },
  {
    q: 'Can I use my own domain like mybrand.in?',
    a: 'Yes — on Starter (₹499) and above. You point an A or CNAME record at our servers, and we issue an SSL certificate automatically. Multi-domain support comes on the Growth plan.',
  },
];

/* Full FAQ set — shown on /how-it-works. Includes the top 5 plus deeper questions. */
export const merchantFAQs: FAQ[] = [
  ...topMerchantFAQs,
  {
    q: 'Do I need a developer or designer?',
    a: 'No. Everything — themes, sections, products, payments, domain, SEO — is point-and-click. Our 50+ AI-generated themes are professionally designed, and the section editor is drag-and-drop.',
  },
  {
    q: 'Can I sell physical products and digital products?',
    a: 'Yes to both. Physical products integrate with Shiprocket (17+ couriers, 29,000+ pincodes) for shipping label generation and tracking. Digital products (PDFs, courses, templates) can be delivered via secure download links after purchase.',
  },
  {
    q: 'Can I migrate from Shopify / WooCommerce / Instagram?',
    a: 'Yes. You can bulk-import products via CSV, or just photograph them and let our AI rewrite the listings. Most sellers coming from Instagram/WhatsApp simply re-snap their best 10 products and go live the same day.',
  },
  {
    q: 'What happens if I outgrow the platform?',
    a: 'Scale plan (₹4999) unlocks unlimited everything with 0% commission. You also get early access to new features and a dedicated success manager. You can export your full product + order data anytime.',
  },
  {
    q: 'Is my store mobile-friendly?',
    a: 'Every theme is mobile-first. We also ship a Progressive Web App so customers can install your store as an app on their phone with one tap.',
  },
  {
    q: 'Does Pic to Cart support Hindi and regional Indian languages?',
    a: 'Yes. Our in-dashboard AI assistant speaks 10+ Indian languages (Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia) using Sarvam AI for voice and text. Your storefront can also display product titles, descriptions and checkout in your preferred language.',
  },
  {
    q: 'Can I take orders on WhatsApp and send order updates there?',
    a: 'Yes. Every order auto-generates a WhatsApp share link with the invoice, and shipping updates are sent over WhatsApp + email so your customers always know where their parcel is — exactly how Indian buyers expect to be notified.',
  },
  {
    q: 'I am not good with writing — can AI create my product listings?',
    a: 'Just snap up to 6 photos per product and our AI writes the title, description, category tags and SEO meta for you in seconds. You can edit anything before publishing, or use the voice assistant in your language to dictate corrections.',
  },
  {
    q: 'Can I run sales, coupons and festive offers like Diwali or Holi?',
    a: 'Yes. Create % or flat coupons with usage limits and minimum-order rules, schedule site-wide festive discounts (Diwali, Holi, Republic Day) in advance, and bundle products into combo offers — all from the dashboard, no coding needed.',
  },
  {
    q: 'How does shipping work? Do I need my own courier tie-up?',
    a: 'No tie-up needed. We are integrated with Shiprocket out of the box — 17+ courier partners covering 29,000+ Indian pincodes. Print labels, schedule pickups and track every shipment from inside Pic to Cart.',
  },
  {
    q: 'What if I get stuck? Is there support in my language?',
    a: 'Yes. Free plan gets email + chatbot support, paid plans get priority WhatsApp support during business hours, and Scale plan customers get a dedicated success manager. Our AI assistant inside the dashboard can also walk you through any feature in your regional language.',
  },
];

