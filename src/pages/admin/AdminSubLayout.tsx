import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight, CheckCircle2, Clock, ArrowRight, Sparkles,
  Eye, ExternalLink, Star, Zap, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Supabase Storage base URL ────────────────────────────────────── */
const STORAGE = 'https://wuqznkpaldtvpfpdtllp.supabase.co/storage/v1/object/public/theme-previews/layout-themes';

/* ─── Data ──────────────────────────────────────────────────────────── */
interface Theme {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  bg: string;
  textPrimary: string;
  textMuted: string;
  preview: 'dark' | 'light';
  imageUrl: string;
  tags: string[];
}

interface SubLayoutData {
  id: string;
  name: string;
  headline: string;
  tagline: string;
  description: string;
  gradient: string;
  accentColor: string;
  palette: string[];
  themes: Theme[];
  features: { label: string; active: boolean }[];
}

interface LayoutData {
  name: string;
  badge: string;
  gradient: string;
  subLayouts: Record<string, SubLayoutData>;
}

const LAYOUTS: Record<string, LayoutData> = {
  'layout-1': {
    name: 'Layout 1',
    badge: 'Fashion & Apparel',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    subLayouts: {
      'layout-1-1': {
        id: 'layout-1-1',
        name: 'Layout 1.1',
        headline: 'Runway Editorial',
        tagline: 'Luxury fashion with full-bleed imagery & editorial storytelling',
        description:
          'Layout 1.1 is built for premium clothing labels that lead with atmosphere. Full-bleed hero visuals, editorial typography and refined whitespace create a shopping experience that rivals flagship luxury boutiques. Two exquisite themes — a deep noir and a warm ivory — let the brand choose its signature mood.',
        gradient: 'from-zinc-900 via-neutral-800 to-stone-900',
        accentColor: '#c9a96e',
        palette: ['#0d0d0d', '#1a1a1a', '#c9a96e', '#f5f0eb', '#faf8f4'],
        themes: [
          {
            id: 'noir-atelier',
            name: 'Noir Atelier',
            tagline: 'Deep blacks & champagne gold — timeless, minimal, powerfully sophisticated.',
            accent: '#c9a96e',
            bg: '#0d0d0d',
            textPrimary: '#f5f0eb',
            textMuted: '#888',
            preview: 'dark',
            imageUrl: `${STORAGE}/noir-atelier.svg`,
            tags: ['Dark', 'Gold', 'Luxury', 'Minimal'],
          },
          {
            id: 'ivory-luxe',
            name: 'Ivory Luxe',
            tagline: 'Warm ivory & burnished gold — refined, airy and irresistibly chic.',
            accent: '#8b6914',
            bg: '#faf8f4',
            textPrimary: '#1a1612',
            textMuted: '#8a7f72',
            preview: 'light',
            imageUrl: `${STORAGE}/ivory-luxe.svg`,
            tags: ['Light', 'Ivory', 'Warm', 'Airy'],
          },
        ],
        features: [
          { label: 'Full-bleed hero video banner', active: true },
          { label: 'Editorial lookbook grid', active: true },
          { label: 'Size guide modal', active: true },
          { label: 'Variant colour swatches', active: true },
          { label: 'Sticky add-to-cart bar', active: true },
          { label: 'Product zoom gallery', active: true },
          { label: 'Wishlist & save for later', active: true },
          { label: 'Customer reviews & ratings', active: true },
          { label: 'Related products carousel', active: true },
          { label: 'Coupon & promo codes', active: true },
          { label: 'COD + Razorpay checkout', active: true },
          { label: 'Order tracking timeline', active: true },
          { label: 'AR virtual try-on', active: false },
          { label: 'AI outfit suggestions', active: false },
          { label: 'Live shopping stream', active: false },
        ],
      },
      'layout-1-2': {
        id: 'layout-1-2',
        name: 'Layout 1.2',
        headline: 'Street Style Hub',
        tagline: 'Bold, youthful & trend-driven for fast-fashion & streetwear',
        description:
          'Layout 1.2 captures the kinetic energy of urban fashion culture. Masonry grids, story-style category rings and flash-sale urgency widgets make every drop feel like an event. Two high-contrast themes — electric neon and rebellious blush — keep the brand bold and conversion-focused.',
        gradient: 'from-rose-500 via-pink-600 to-fuchsia-700',
        accentColor: '#ff3d6b',
        palette: ['#0f0f1a', '#1a1a2e', '#ff3d6b', '#fff5f8', '#ffd6e0'],
        themes: [
          {
            id: 'neon-drip',
            name: 'Neon Drip',
            tagline: 'Electric red-pink on midnight navy — pure streetwear DNA.',
            accent: '#ff3d6b',
            bg: '#0f0f1a',
            textPrimary: '#f8fafc',
            textMuted: '#94a3b8',
            preview: 'dark',
            imageUrl: `${STORAGE}/neon-drip.svg`,
            tags: ['Dark', 'Neon', 'Bold', 'Street'],
          },
          {
            id: 'blush-street',
            name: 'Blush Street',
            tagline: 'Rose tones & hot pink — soft aesthetic meets rebellious edge.',
            accent: '#e91e8c',
            bg: '#fff5f8',
            textPrimary: '#1a0a12',
            textMuted: '#9b6e80',
            preview: 'light',
            imageUrl: `${STORAGE}/blush-street.svg`,
            tags: ['Light', 'Blush', 'Pink', 'Feminine'],
          },
        ],
        features: [
          { label: 'Masonry product grid', active: true },
          { label: 'Instagram-style story rings', active: true },
          { label: 'Quick-add from listing', active: true },
          { label: 'Variant colour swatches', active: true },
          { label: 'Flash sale countdown timer', active: true },
          { label: 'Sticky bottom add-to-cart', active: true },
          { label: 'Wishlist & save for later', active: true },
          { label: 'Customer reviews & ratings', active: true },
          { label: 'Share product on WhatsApp', active: true },
          { label: 'Coupon & promo codes', active: true },
          { label: 'COD + Razorpay checkout', active: true },
          { label: 'Order tracking timeline', active: true },
          { label: 'AI size recommender', active: false },
          { label: 'Influencer collab pages', active: false },
          { label: 'Drop / waitlist alerts', active: false },
        ],
      },
    },
  },
};

/* ─── Theme card ────────────────────────────────────────────────────── */
const ThemeCard = ({
  theme,
  layoutId,
  subLayoutSlug,
  accentColor,
}: {
  theme: Theme;
  layoutId: string;
  subLayoutSlug: string;
  accentColor: string;
}) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm
                 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/admin/layouts/${layoutId}/${subLayoutSlug}/${theme.id}`)}
    >
      {/* ── Preview image ── */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: theme.bg, aspectRatio: '16/10' }}
      >
        {/* Loading skeleton */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: theme.bg }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                   style={{ borderColor: theme.accent }} />
            </div>
          </div>
        )}

        {/* Real image from Supabase */}
        {!imgError ? (
          <img
            src={theme.imageUrl}
            alt={`${theme.name} preview`}
            className={cn(
              'w-full h-full object-cover transition-all duration-700',
              imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105',
              'group-hover:scale-105',
            )}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          /* Fallback if image fails to load */
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${theme.bg}, ${theme.accent}22)` }}
          >
            <div className="text-center space-y-2 opacity-60">
              <div className="h-10 w-10 rounded-xl mx-auto flex items-center justify-center"
                   style={{ backgroundColor: theme.accent + '30' }}>
                <Eye className="h-5 w-5" style={{ color: theme.accent }} />
              </div>
              <p className="text-xs font-medium" style={{ color: theme.textMuted }}>{theme.name}</p>
            </div>
          </div>
        )}

        {/* Hover overlay with CTA */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100
                        transition-opacity duration-200 bg-black/50 backdrop-blur-sm">
          <button
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white
                       shadow-xl transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: theme.accent }}
          >
            <Eye className="h-4 w-4" /> View Theme
          </button>
        </div>

        {/* Dark/Light badge */}
        <div className="absolute top-3 left-3">
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider
                       backdrop-blur-md border"
            style={{
              backgroundColor: theme.preview === 'dark' ? '#000000aa' : '#ffffffaa',
              color: theme.preview === 'dark' ? '#fff' : '#111',
              borderColor: theme.preview === 'dark' ? '#ffffff20' : '#00000015',
            }}
          >
            {theme.preview === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </span>
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Name + accent dot */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: theme.accent }} />
              <h3 className="text-base font-bold leading-tight">{theme.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{theme.tagline}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {theme.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: theme.accent + '18', color: theme.accent }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA row */}
        <div className="flex items-center justify-between pt-1 border-t border-border mt-auto">
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-medium text-muted-foreground">Clothing · Fashion</span>
          </div>
          <button
            className="flex items-center gap-1 text-xs font-bold transition-all
                       group-hover:gap-2"
            style={{ color: theme.accent }}
          >
            Explore <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main page ─────────────────────────────────────────────────────── */
const AdminSubLayout = () => {
  const { layoutId = 'layout-1', subLayoutSlug = 'layout-1-1' } = useParams<{
    layoutId: string;
    subLayoutSlug: string;
  }>();

  const layout = LAYOUTS[layoutId];
  const sub = layout?.subLayouts[subLayoutSlug];

  if (!layout || !sub) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <p className="text-sm">Sub-layout not found.</p>
        <Link to="/admin/layouts" className="text-xs text-primary underline">Back to Layouts</Link>
      </div>
    );
  }

  const activeFeatures = sub.features.filter((f) => f.active);
  const comingFeatures = sub.features.filter((f) => !f.active);

  return (
    <div className="space-y-10 pb-24 md:pb-0">

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link to="/admin/layouts" className="hover:text-foreground transition-colors">Layout Studio</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link to={`/admin/layouts/${layoutId}`} className="hover:text-foreground transition-colors">
          {layout.name}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-foreground font-semibold">{sub.name} — {sub.headline}</span>
      </nav>

      {/* ── Hero / Preview section ── */}
      <div className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br',
        sub.gradient,
      )}>
        {/* Decorative blobs */}
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-black/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-2 gap-0">
          {/* Left — text */}
          <div className="p-8 md:p-10 flex flex-col justify-between gap-8">
            <div className="space-y-4">
              {/* Badge row */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/20 backdrop-blur-sm border border-white/25
                                 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                  {layout.badge}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm
                                 border border-white/25 px-3 py-1 text-[10px] font-bold text-white">
                  <Zap className="h-2.5 w-2.5 fill-white" />
                  {sub.themes.length} Themes
                </span>
              </div>

              {/* Title */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60 mb-1">
                  {sub.name}
                </p>
                <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
                  {sub.headline}
                </h1>
                <p className="text-sm text-white/75 leading-relaxed max-w-md">
                  {sub.description}
                </p>
              </div>

              {/* Colour palette */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Palette
                </p>
                <div className="flex gap-2">
                  {sub.palette.map((color, i) => (
                    <div key={i} className="group/swatch relative">
                      <span
                        className="block h-7 w-7 rounded-full border-2 border-white/30 shadow-md
                                   cursor-default transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              {[
                { value: activeFeatures.length, label: 'Active features', color: 'text-emerald-300' },
                { value: comingFeatures.length, label: 'Coming soon', color: 'text-amber-300' },
                { value: sub.themes.length, label: 'Themes', color: 'text-white' },
              ].map((s) => (
                <div key={s.label}
                     className="rounded-xl bg-white/12 backdrop-blur-sm border border-white/20 px-4 py-3 text-center">
                  <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                  <p className="text-[9px] text-white/60 uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — feature highlights */}
          <div className="hidden lg:flex flex-col justify-center px-8 py-10 gap-2
                          border-l border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3">
              Feature Highlights
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {activeFeatures.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 text-sm text-white/90">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  {f.label}
                </div>
              ))}
              {comingFeatures.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 text-sm text-white/40">
                  <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  {f.label}
                  <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5
                                   text-[9px] font-bold text-amber-300 uppercase tracking-wide">
                    Soon
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Themes section ── */}
      <div className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold">Choose a Theme</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Both themes share the same layout — only the visual identity changes.
            </p>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {sub.themes.length} themes available
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {sub.themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              layoutId={layoutId}
              subLayoutSlug={subLayoutSlug}
              accentColor={sub.accentColor}
            />
          ))}
        </div>
      </div>

      {/* ── Mobile feature list (shown below on small screens) ── */}
      <div className="lg:hidden space-y-3">
        <h3 className="text-base font-bold">Features in this Layout</h3>
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {sub.features.map((f) => (
            <div key={f.label} className="flex items-center gap-3 px-4 py-3">
              {f.active ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <span className={cn('text-sm', !f.active && 'text-muted-foreground')}>{f.label}</span>
              {!f.active && (
                <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5
                                 text-[9px] font-bold text-amber-600 uppercase tracking-wide">
                  Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminSubLayout;
