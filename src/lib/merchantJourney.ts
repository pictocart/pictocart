/* Shared content for the merchant journey + FAQ — used by LandingPage and /how-it-works */
import {
  Camera, Palette, Rocket, Store, Globe, Users, TrendingUp, type LucideIcon,
} from 'lucide-react';
import flow01 from '@/assets/flow/01-signup.jpg';
import flow02 from '@/assets/flow/02-onboarding.jpg';
import flow03 from '@/assets/flow/03-products.jpg';
import flow04 from '@/assets/flow/04-theme.jpg';
import flow05 from '@/assets/flow/05-domain-payments.jpg';
import flow06 from '@/assets/flow/06-golive.jpg';
import flow07 from '@/assets/flow/07-grow.jpg';

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
    desc: 'Pick a name, category and language. Our wizard guides you through 7 quick steps — no jargon.',
    long: 'A short onboarding wizard collects your store name, category (fashion, food, electronics, etc.), language, currency and target market. We use this to pre-pick fonts, colors and themes that match your audience.',
    bullets: ['7-step guided wizard', 'Auto language & currency detection', 'India-first defaults (₹, GST-ready)'],
    image: flow02, accent: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', iconText: 'text-orange-600',
  },
  {
    step: '03', icon: Camera, title: 'Snap & Add Products',
    desc: 'Take a photo. AI generates the title, description, pricing and SEO tags. Edit if you want — or just publish.',
    long: 'Open the product uploader on your phone, take photos (or pick from gallery), and our AI writes the product title, description, suggested price, category and SEO tags. You can keep, tweak or replace anything in one tap.',
    bullets: ['6 photos per product', 'AI-written titles + descriptions', 'Smart pricing suggestions', 'Auto SEO tags'],
    image: flow03, accent: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', iconText: 'text-rose-600',
  },
  {
    step: '04', icon: Palette, title: 'Pick a Beautiful Theme',
    desc: 'Choose from 50+ AI-crafted themes built for Indian shoppers. Customize colors, fonts, layout in clicks.',
    long: 'Browse our theme marketplace — 50+ AI-generated themes, each a complete 5-page design. Apply with one click, then change colors, fonts, hero images or whole sections without writing code.',
    bullets: ['50+ premium themes', 'Drag-and-drop section editor', 'Live preview on mobile + desktop'],
    image: flow04, accent: 'from-violet-500 to-indigo-500', bg: 'bg-violet-50', iconText: 'text-violet-600',
  },
  {
    step: '05', icon: Globe, title: 'Connect Domain & Payments',
    desc: 'Bring your own domain (or use a free one), wire up Razorpay, UPI & COD. Verified in minutes.',
    long: 'Use your free `yourstore.pictocart.in` URL or connect your own .com / .in domain via DNS. Plug in Razorpay (with your own keys, so payouts go straight to your bank) and enable COD or UPI in one toggle.',
    bullets: ['Free subdomain or your own domain', 'Razorpay, UPI, COD supported', 'Direct payouts to your bank', 'Auto SSL certificates'],
    image: flow05, accent: 'from-sky-500 to-blue-500', bg: 'bg-sky-50', iconText: 'text-sky-600',
  },
  {
    step: '06', icon: Rocket, title: 'Go Live',
    desc: 'Hit publish. Share your store link on WhatsApp, Instagram, Facebook — with one tap.',
    long: 'One "Publish" button takes your store live. Share buttons generate WhatsApp, Instagram, Facebook and short links — with rich preview cards already attached.',
    bullets: ['One-click publish', 'Pre-built share cards (OG / Twitter)', 'WhatsApp & Instagram CTAs'],
    image: flow06, accent: 'from-fuchsia-500 to-purple-500', bg: 'bg-fuchsia-50', iconText: 'text-fuchsia-600',
  },
  {
    step: '07', icon: TrendingUp, title: 'Grow With Insights',
    desc: 'Track orders, revenue and visitors. AI suggests coupons, abandoned-cart wins and theme upgrades weekly.',
    long: 'Your dashboard shows orders, revenue, top products and visitor funnels. We email a weekly digest, flag abandoned carts and suggest coupons, blog posts and theme tweaks based on your traffic.',
    bullets: ['Real-time analytics', 'Weekly AI insights email', 'Abandoned-cart recovery', 'Coupon + blog recommendations'],
    image: flow07, accent: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-50', iconText: 'text-indigo-600',
  },
];

export interface FAQ { q: string; a: string }

export const merchantFAQs: FAQ[] = [
  {
    q: 'Is it really free? What\'s the catch?',
    a: 'Yes. The Free plan lets you sell unlimited products, take orders, and use COD/UPI forever. We charge a small 3% platform commission on Free, which drops to 2% on Starter (₹499) and 1% on Growth (₹1499). Premium themes, custom domains and advanced analytics are paid features — but you never need a credit card to start.',
  },
  {
    q: 'How long does setup actually take?',
    a: 'Most merchants are live in 5–15 minutes: 30 seconds to sign up, 2 minutes for onboarding, 5 minutes to add 3–5 products with AI, 1 minute to pick a theme, and 2 minutes to connect payments. Custom domains take an extra 5–60 minutes to verify DNS.',
  },
  {
    q: 'Do I need a developer or designer?',
    a: 'No. Everything — themes, sections, products, payments, domain, SEO — is point-and-click. Our 50+ AI-generated themes are professionally designed, and the section editor is drag-and-drop.',
  },
  {
    q: 'Can I use my own domain like mybrand.in?',
    a: 'Yes — on Starter (₹499) and above. You point an A or CNAME record at our servers, and we issue an SSL certificate automatically. Multi-domain support comes on the Growth plan.',
  },
  {
    q: 'How does payment work? Where does the money go?',
    a: 'You connect your own Razorpay account, so customer payments land directly in your bank — we never hold your money. We also support COD and UPI Intent. The platform commission is invoiced separately, never deducted from customer payments.',
  },
  {
    q: 'Can I sell physical products and digital products?',
    a: 'Yes to both. Physical products integrate with Shiprocket (17+ couriers, 29,000+ pincodes) for shipping label generation and tracking. Digital products (PDFs, courses, templates) can be delivered via secure download links after purchase.',
  },
  {
    q: 'What about GST and invoices?',
    a: 'Every order generates a GST-ready PDF invoice with your business details, GSTIN and HSN codes. You can download all invoices in bulk for your CA at month-end.',
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
];
