import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight, CheckCircle2, Clock, ShoppingCart, Heart, Star, Search,
  Truck, CreditCard, RotateCcw, Tag, Zap, Shield, Package, MessageCircle,
  Smartphone, Globe, BarChart2, Share2, ImageIcon, Layers, Eye, Lock,
  ChevronLeft, ChevronDown, Sparkles, Users, Bell, Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

/* ─── Data ──────────────────────────────────────────────────────────── */
type FeatureStatus = 'active' | 'coming_soon';
interface Feature { label: string; desc: string; icon: any; status: FeatureStatus; }
interface FeatureGroup { group: string; icon: any; items: Feature[]; }

const COMMON_FEATURES: FeatureGroup[] = [
  {
    group: 'Product Discovery',
    icon: Search,
    items: [
      { label: 'Full-text product search', desc: 'Live search overlay with instant results across title & category', icon: Search, status: 'active' },
      { label: 'Category filters', desc: 'Browse & filter products by category, price range and tags', icon: Layers, status: 'active' },
      { label: 'Product image gallery', desc: 'Multi-image carousel with zoom and video support', icon: ImageIcon, status: 'active' },
      { label: 'Variant selector (color, size)', desc: 'Swatch-based variant picker with per-variant images', icon: Eye, status: 'active' },
      { label: 'Product ratings & reviews', desc: 'Star ratings, review forms, verified purchase badge', icon: Star, status: 'active' },
      { label: 'Related products', desc: 'Smart cross-sell carousel on product detail page', icon: Layers, status: 'active' },
      { label: 'AI-powered size recommender', desc: 'Recommends sizes based on body measurements & past orders', icon: Sparkles, status: 'coming_soon' },
      { label: 'AR virtual try-on', desc: 'Try clothes on using phone camera before purchasing', icon: Smartphone, status: 'coming_soon' },
    ],
  },
  {
    group: 'Cart & Checkout',
    icon: ShoppingCart,
    items: [
      { label: 'Persistent cart', desc: 'Cart saved in localStorage, survives page refresh', icon: ShoppingCart, status: 'active' },
      { label: 'Coupon & promo codes', desc: 'Manual entry + auto-apply best available coupon', icon: Percent, status: 'active' },
      { label: 'Cash on Delivery', desc: 'COD with configurable rules — min/max order, pincode blocks', icon: Package, status: 'active' },
      { label: 'Razorpay (UPI, Cards, Net Banking)', desc: 'Secure online payment via Razorpay checkout modal', icon: CreditCard, status: 'active' },
      { label: 'Pincode serviceability check', desc: 'Real-time delivery availability & ETA via Shiprocket', icon: Truck, status: 'active' },
      { label: 'Saved delivery addresses', desc: 'Customer can save multiple addresses with labels', icon: Globe, status: 'active' },
      { label: 'Buy Now (express checkout)', desc: 'Skip cart — direct single-click to checkout', icon: Zap, status: 'coming_soon' },
      { label: 'Wallet / store credits', desc: 'Customers earn and spend loyalty points at checkout', icon: Tag, status: 'coming_soon' },
    ],
  },
  {
    group: 'Post-Purchase',
    icon: Package,
    items: [
      { label: 'Order confirmation screen', desc: 'Instant confirmation with order number after payment', icon: CheckCircle2, status: 'active' },
      { label: 'Order tracking timeline', desc: 'Visual step-by-step order status (pending → delivered)', icon: Truck, status: 'active' },
      { label: 'AWB / courier tracking', desc: 'Shipment tracking number with courier details', icon: Package, status: 'active' },
      { label: 'Return & exchange requests', desc: 'Customer-initiated returns with status updates', icon: RotateCcw, status: 'active' },
      { label: 'Order email notifications', desc: 'Confirmation & shipping update emails to customer', icon: Bell, status: 'active' },
      { label: 'Invoice download', desc: 'PDF invoice generation for every delivered order', icon: CreditCard, status: 'active' },
      { label: 'Live shipment map', desc: 'Real-time map showing courier location', icon: Globe, status: 'coming_soon' },
      { label: 'WhatsApp order updates', desc: 'Automated order status messages via WhatsApp Business API', icon: MessageCircle, status: 'coming_soon' },
    ],
  },
  {
    group: 'Customer Account',
    icon: Users,
    items: [
      { label: 'Customer sign-up & login', desc: 'Email/password, Google OAuth and phone OTP', icon: Shield, status: 'active' },
      { label: 'Order history', desc: 'Full list of past orders with filter & search', icon: Package, status: 'active' },
      { label: 'Wishlist', desc: 'Save favourite products, accessible across devices', icon: Heart, status: 'active' },
      { label: 'Support tickets', desc: 'Create and track support requests per order', icon: MessageCircle, status: 'active' },
      { label: 'Profile & address management', desc: 'Edit name, phone and manage multiple delivery addresses', icon: Users, status: 'active' },
      { label: 'Loyalty rewards dashboard', desc: 'View earned points, redeem on future orders', icon: Star, status: 'coming_soon' },
    ],
  },
  {
    group: 'Marketing & Promotions',
    icon: Tag,
    items: [
      { label: 'Promotional ticker', desc: 'Configurable scrolling announcement bar at top of store', icon: Bell, status: 'active' },
      { label: 'Site-wide offer banner', desc: 'Full-width festive / sale banner with custom CTA', icon: Percent, status: 'active' },
      { label: 'Flash sale countdown', desc: 'Timer-based urgency widget on product & collection pages', icon: Clock, status: 'active' },
      { label: 'Share product (WhatsApp / social)', desc: 'One-tap share buttons on every product page', icon: Share2, status: 'active' },
      { label: 'Blog / content pages', desc: 'SEO-friendly blog and custom landing pages', icon: Globe, status: 'active' },
      { label: 'AI outfit recommendations', desc: 'AI suggests complete looks based on browsed items', icon: Sparkles, status: 'coming_soon' },
      { label: 'Influencer collab pages', desc: 'Dedicated pages for influencer-curated collections', icon: Users, status: 'coming_soon' },
      { label: 'Drop / waitlist alerts', desc: 'Email/SMS alerts when out-of-stock items come back', icon: Bell, status: 'coming_soon' },
    ],
  },
  {
    group: 'Store Settings & SEO',
    icon: BarChart2,
    items: [
      { label: 'Custom domain support', desc: 'Point your own domain — store runs at yourbrand.com', icon: Globe, status: 'active' },
      { label: 'SEO meta (title, description, OG)', desc: 'Per-page SEO and social-share preview customisation', icon: BarChart2, status: 'active' },
      { label: 'Product schema markup', desc: 'Auto-generated JSON-LD for Google rich results', icon: Search, status: 'active' },
      { label: 'Analytics & conversion tracking', desc: 'Product views, add-to-cart, purchase event pipeline', icon: BarChart2, status: 'active' },
      { label: 'Storefront AI assistant (Pica²)', desc: 'Chat-based shopping assistant for store visitors', icon: Sparkles, status: 'active' },
      { label: 'PWA / installable store', desc: 'Add-to-homescreen with offline support', icon: Smartphone, status: 'coming_soon' },
      { label: 'Multi-language storefront', desc: 'Serve customers in their preferred language', icon: Globe, status: 'coming_soon' },
    ],
  },
];

interface ThemeMeta {
  id: string;
  name: string;
  subLayoutName: string;
  subLayoutSlug: string;
  layoutId: string;
  layoutName: string;
  accent: string;
  bg: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  border: string;
  preview: 'dark' | 'light';
  tagline: string;
  description: string;
  gradient: string;
  tags: string[];
}

const THEME_DB: Record<string, ThemeMeta> = {
  'noir-atelier': {
    id: 'noir-atelier', name: 'Noir Atelier',
    subLayoutName: 'Layout 1.1 — Runway Editorial', subLayoutSlug: 'layout-1-1',
    layoutId: 'layout-1', layoutName: 'Layout 1',
    accent: '#c9a96e', bg: '#0d0d0d', surface: '#1a1a1a',
    textPrimary: '#f5f0eb', textMuted: '#888', border: '#2a2a2a',
    preview: 'dark',
    tagline: 'Luxury dark editorial — timeless, minimal & powerfully sophisticated.',
    description: 'Noir Atelier is built for premium fashion labels that lead with atmosphere. Deep blacks, warm champagne gold accents and editorial typography create a shopping experience that rivals flagship luxury boutiques.',
    gradient: 'from-zinc-900 via-neutral-800 to-stone-900',
    tags: ['Dark', 'Luxury', 'Editorial', 'Gold accents'],
  },
  'ivory-luxe': {
    id: 'ivory-luxe', name: 'Ivory Luxe',
    subLayoutName: 'Layout 1.1 — Runway Editorial', subLayoutSlug: 'layout-1-1',
    layoutId: 'layout-1', layoutName: 'Layout 1',
    accent: '#8b6914', bg: '#faf8f4', surface: '#f0ece4',
    textPrimary: '#1a1612', textMuted: '#8a7f72', border: '#e8e0d4',
    preview: 'light',
    tagline: 'Warm ivory & burnished gold — refined, airy and irresistibly chic.',
    description: 'Ivory Luxe transforms the shopping canvas into a sun-drenched boutique. Creamy ivories, parchment whites and deep golden tones let product photography breathe while projecting effortless sophistication.',
    gradient: 'from-amber-50 via-stone-100 to-yellow-50',
    tags: ['Light', 'Ivory', 'Gold', 'Airy'],
  },
  'neon-drip': {
    id: 'neon-drip', name: 'Neon Drip',
    subLayoutName: 'Layout 1.2 — Street Style Hub', subLayoutSlug: 'layout-1-2',
    layoutId: 'layout-1', layoutName: 'Layout 1',
    accent: '#ff3d6b', bg: '#0f0f1a', surface: '#1a1a2e',
    textPrimary: '#f8fafc', textMuted: '#94a3b8', border: '#1e1e35',
    preview: 'dark',
    tagline: 'Neon-lit nights, bold drops & relentless energy — pure streetwear DNA.',
    description: 'Neon Drip captures the kinetic pulse of urban fashion culture. Electric red-pink accents slash across deep midnight navy, creating a visual tension that makes every product pop like a gallery installation.',
    gradient: 'from-rose-600 via-fuchsia-700 to-indigo-900',
    tags: ['Dark', 'Neon', 'Streetwear', 'Bold'],
  },
  'blush-street': {
    id: 'blush-street', name: 'Blush Street',
    subLayoutName: 'Layout 1.2 — Street Style Hub', subLayoutSlug: 'layout-1-2',
    layoutId: 'layout-1', layoutName: 'Layout 1',
    accent: '#e91e8c', bg: '#fff5f8', surface: '#ffeef4',
    textPrimary: '#1a0a12', textMuted: '#9b6e80', border: '#fad4e4',
    preview: 'light',
    tagline: 'Soft blush, hot pink & rebellious charm — street style meets feminine edge.',
    description: 'Blush Street is for the brand that lives at the intersection of softness and attitude. Rose-tinted backgrounds amplify hot-pink CTAs, while generous whitespace keeps the aesthetic clean and conversion-focused.',
    gradient: 'from-pink-100 via-rose-50 to-fuchsia-50',
    tags: ['Light', 'Blush', 'Pink', 'Street'],
  },
};

/* ─── Supabase Storage image URLs ───────────────────────────────────── */
const IMG_BASE = 'https://wuqznkpaldtvpfpdtllp.supabase.co/storage/v1/object/public/theme-previews/layout-themes';
const heroUrl  = (id: string) => `${IMG_BASE}/hero/${id}.svg`;
const prodUrl  = (id: string, n: number) => `${IMG_BASE}/products/${id}-${n}.svg`;

const PRODUCTS = [
  { name: 'Silk Midi Dress',   price: '₹2,499', badge: 'NEW'  },
  { name: 'Linen Blazer',      price: '₹3,899', badge: 'SALE' },
  { name: 'Wide Leg Trousers', price: '₹1,799', badge: ''     },
  { name: 'Knit Cardigan',     price: '₹2,199', badge: 'HOT'  },
];

/* ─── Mini storefront preview ───────────────────────────────────────── */
const StorefrontPreview = ({ theme }: { theme: ThemeMeta }) => {
  const isDark = theme.preview === 'dark';

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border shadow-2xl"
      style={{ backgroundColor: theme.bg, borderColor: theme.border, fontFamily: 'system-ui' }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b"
           style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <div className="mx-3 flex-1 h-5 rounded-md text-[9px] flex items-center px-2"
             style={{ backgroundColor: isDark ? '#ffffff10' : '#00000008', color: theme.textMuted }}>
          yourbrand.com
        </div>
      </div>

      {/* Navbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b"
           style={{ borderColor: theme.border }}>
        <span className="text-sm font-black tracking-widest uppercase" style={{ color: theme.accent }}>BRAND</span>
        <div className="hidden sm:flex gap-5">
          {['New Arrivals', 'Women', 'Men', 'Sale'].map((l) => (
            <span key={l} className="text-[10px] font-medium" style={{ color: theme.textMuted }}>{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <Search className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
          <Heart className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
          <div className="relative">
            <ShoppingCart className="h-3.5 w-3.5" style={{ color: theme.textPrimary }} />
            <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full text-[7px] font-bold
                             flex items-center justify-center text-white"
                  style={{ backgroundColor: theme.accent }}>2</span>
          </div>
        </div>
      </div>

      {/* ── Hero banner — real Supabase image ── */}
      <div className="relative overflow-hidden" style={{ height: '220px' }}>
        <img
          src={heroUrl(theme.id)}
          alt={`${theme.name} hero`}
          className="w-full h-full object-cover"
          style={{ objectPosition: 'left center' }}
          loading="lazy"
        />
        {/* Overlay to keep text readable if image is loading */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: `linear-gradient(to right, ${theme.bg}cc 0%, transparent 60%)` }} />
      </div>

      {/* ── Product grid — real Supabase product images ── */}
      <div className="p-4" style={{ backgroundColor: theme.bg }}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-3"
           style={{ color: theme.textMuted }}>Trending Now</p>
        <div className="grid grid-cols-4 gap-2">
          {PRODUCTS.map((p, i) => (
            <div key={i} className="group/card rounded-xl overflow-hidden"
                 style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
              {/* Product image from storage */}
              <div className="relative overflow-hidden" style={{ height: '110px', backgroundColor: theme.accent + '12' }}>
                <img
                  src={prodUrl(theme.id, i + 1)}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                  loading="lazy"
                />
                {p.badge && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[7px]
                                   font-black text-white z-10"
                        style={{ backgroundColor: p.badge === 'SALE' ? '#ef4444' : p.badge === 'HOT' ? '#f97316' : theme.accent }}>
                    {p.badge}
                  </span>
                )}
                <button className="absolute top-1.5 right-1.5 opacity-0 group-hover/card:opacity-100
                                   transition-opacity z-10">
                  <Heart className="h-3 w-3" style={{ color: theme.accent }} />
                </button>
              </div>
              <div className="p-2">
                <p className="text-[8px] font-semibold leading-tight truncate"
                   style={{ color: theme.textPrimary }}>{p.name}</p>
                <p className="text-[8px] font-bold mt-0.5" style={{ color: theme.accent }}>{p.price}</p>
                <div className="flex mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-2 w-2"
                          style={{ fill: s <= 4 ? '#f59e0b' : 'transparent', color: '#f59e0b' }} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust bar */}
      <div className="flex items-center justify-around px-4 py-3 border-t text-center"
           style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
        {[
          { icon: Truck,      label: 'Free Delivery' },
          { icon: RotateCcw,  label: 'Easy Returns'  },
          { icon: Shield,     label: 'Secure Pay'    },
          { icon: Star,       label: '4.8★ Rating'   },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <Icon className="h-3 w-3" style={{ color: theme.accent }} />
            <span className="text-[8px] font-medium" style={{ color: theme.textMuted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Feature group accordion ───────────────────────────────────────── */
const FeatureGroupPanel = ({ group, theme }: { group: FeatureGroup; theme: ThemeMeta }) => {
  const [open, setOpen] = useState(true);
  const active = group.items.filter((f) => f.status === 'active').length;
  const soon = group.items.filter((f) => f.status === 'coming_soon').length;
  const GroupIcon = group.icon;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 bg-card hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <GroupIcon className="h-4 w-4 text-primary" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold">{group.group}</p>
            <p className="text-[10px] text-muted-foreground">{active} active · {soon} coming soon</p>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="divide-y divide-border border-t border-border">
          {group.items.map((feature) => {
            const FIcon = feature.icon;
            const isActive = feature.status === 'active';
            return (
              <div key={feature.label} className={cn('flex items-start gap-4 px-5 py-4 transition-colors', isActive ? 'bg-card' : 'bg-muted/20')}>
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5', isActive ? 'bg-emerald-500/10' : 'bg-amber-400/10')}>
                  <FIcon className={cn('h-4 w-4', isActive ? 'text-emerald-500' : 'text-amber-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn('text-sm font-medium', !isActive && 'text-muted-foreground')}>{feature.label}</p>
                    {isActive ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-bold text-emerald-600 uppercase tracking-wide">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold text-amber-600 uppercase tracking-wide">
                        <Clock className="h-2.5 w-2.5" /> Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Main page ─────────────────────────────────────────────────────── */
const AdminLayoutTheme = () => {
  const { layoutId, subLayoutSlug, themeId } = useParams<{
    layoutId: string; subLayoutSlug: string; themeId: string;
  }>();
  const [tab, setTab] = useState<'preview' | 'features'>('preview');

  const theme = THEME_DB[themeId || ''];

  if (!theme) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Eye className="h-10 w-10 opacity-30" />
        <p className="text-sm">Theme not found.</p>
        <Link to="/admin/layouts" className="text-xs text-primary underline">Back to Layouts</Link>
      </div>
    );
  }

  const totalActive = COMMON_FEATURES.flatMap((g) => g.items).filter((f) => f.status === 'active').length;
  const totalSoon = COMMON_FEATURES.flatMap((g) => g.items).filter((f) => f.status === 'coming_soon').length;

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link to="/admin/layouts" className="hover:text-foreground transition-colors">Layout Studio</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link to={`/admin/layouts/${theme.layoutId}`} className="hover:text-foreground transition-colors">{theme.layoutName}</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link to={`/admin/layouts/${theme.layoutId}/${theme.subLayoutSlug}`} className="hover:text-foreground transition-colors">{theme.subLayoutName}</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-foreground font-medium">{theme.name}</span>
      </nav>

      {/* Hero */}
      <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-8 md:p-10', theme.gradient)}>
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 -left-8 h-36 w-36 rounded-full bg-black/20 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {theme.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/20 backdrop-blur px-3 py-1 text-[10px] font-bold text-white border border-white/20 uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ color: theme.preview === 'dark' ? theme.textPrimary : '#1a1612' }}>
              {theme.name}
            </h1>
            <p className="text-sm font-medium max-w-lg leading-relaxed" style={{ color: theme.preview === 'dark' ? '#ffffff90' : '#1a161280' }}>
              {theme.tagline}
            </p>
          </div>
          {/* Stats pills */}
          <div className="flex gap-3 shrink-0">
            <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 px-4 py-3 text-center">
              <p className="text-xl font-black text-white">{totalActive}</p>
              <p className="text-[9px] text-white/70 uppercase tracking-wider">Features Live</p>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 px-4 py-3 text-center">
              <p className="text-xl font-black text-amber-300">{totalSoon}</p>
              <p className="text-[9px] text-white/70 uppercase tracking-wider">Coming Soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground leading-relaxed">{theme.description}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        {(['preview', 'features'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize',
              tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'preview' ? '🖥 Preview' : '⚙️ Features'}
          </button>
        ))}
      </div>

      {/* Preview tab */}
      {tab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold">Live Storefront Preview</h2>
          </div>
          <StorefrontPreview theme={theme} />
          <p className="text-xs text-center text-muted-foreground">
            This is a representative preview — actual storefront renders with your real products and content.
          </p>
        </div>
      )}

      {/* Features tab */}
      {tab === 'features' && (
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Active
              </span>
              — Feature is live in this theme
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-amber-600">
                <Clock className="h-3 w-3" /> Coming Soon
              </span>
              — In development, launching soon
            </div>
          </div>
          {/* Feature groups */}
          <div className="space-y-3">
            {COMMON_FEATURES.map((group) => (
              <FeatureGroupPanel key={group.group} group={group} theme={theme} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayoutTheme;
