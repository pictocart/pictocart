import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Shirt, Star, Zap, Eye, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Sub-layout definitions ────────────────────────────────────────── */
const LAYOUT_META: Record<string, {
  name: string;
  badge: string;
  gradient: string;
  description: string;
  subLayouts: SubLayout[];
}> = {
  'layout-1': {
    name: 'Layout 1',
    badge: 'Fashion & Apparel',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    description:
      'Two distinct sub-layouts built exclusively for clothing brands — from high-fashion editorials to street-style collections.',
    subLayouts: [
      {
        id: '1.1',
        slug: 'layout-1-1',
        name: 'Layout 1.1',
        headline: 'Runway Editorial',
        tagline: 'Luxury fashion with full-bleed imagery & editorial storytelling',
        gradient: 'from-zinc-900 via-neutral-800 to-stone-900',
        accentColor: '#c9a96e',
        previewPalette: ['#0a0a0a', '#1a1a1a', '#c9a96e', '#f5f0eb'],
        themes: [
          { id: 'noir-atelier', name: 'Noir Atelier', accent: '#c9a96e', bg: '#0d0d0d', preview: 'dark' },
          { id: 'ivory-luxe', name: 'Ivory Luxe', accent: '#8b6914', bg: '#faf8f4', preview: 'light' },
        ],
        features: [
          { label: 'Full-bleed hero video banner', active: true },
          { label: 'Editorial lookbook grid', active: true },
          { label: 'Size guide modal', active: true },
          { label: 'Variant color swatches', active: true },
          { label: 'Sticky add-to-cart bar', active: true },
          { label: 'Product zoom gallery', active: true },
          { label: 'Wishlist & save for later', active: true },
          { label: 'Customer reviews & ratings', active: true },
          { label: 'Related products carousel', active: true },
          { label: 'Coupon & promo codes', active: true },
          { label: 'COD + Razorpay checkout', active: true },
          { label: 'Order tracking timeline', active: true },
          { label: 'AR try-on (virtual fit)', active: false },
          { label: 'AI outfit suggestions', active: false },
          { label: 'Live shopping stream', active: false },
        ],
        stats: { themes: 2, features: 12, comingSoon: 3 },
      },
      {
        id: '1.2',
        slug: 'layout-1-2',
        name: 'Layout 1.2',
        headline: 'Street Style Hub',
        tagline: 'Bold, youthful & trend-driven layout for fast-fashion & streetwear',
        gradient: 'from-rose-500 via-pink-600 to-fuchsia-700',
        accentColor: '#ff3d6b',
        previewPalette: ['#ff3d6b', '#1a1a2e', '#f8fafc', '#ffd6e0'],
        themes: [
          { id: 'neon-drip', name: 'Neon Drip', accent: '#ff3d6b', bg: '#0f0f1a', preview: 'dark' },
          { id: 'blush-street', name: 'Blush Street', accent: '#e91e8c', bg: '#fff5f8', preview: 'light' },
        ],
        features: [
          { label: 'Masonry product grid', active: true },
          { label: 'Instagram-style story rings', active: true },
          { label: 'Quick-add from listing', active: true },
          { label: 'Variant color swatches', active: true },
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
        stats: { themes: 2, features: 12, comingSoon: 3 },
      },
    ],
  },
};

interface Theme {
  id: string;
  name: string;
  accent: string;
  bg: string;
  preview: 'dark' | 'light';
}

interface Feature {
  label: string;
  active: boolean;
}

interface SubLayout {
  id: string;
  slug: string;
  name: string;
  headline: string;
  tagline: string;
  gradient: string;
  accentColor: string;
  previewPalette: string[];
  themes: Theme[];
  features: Feature[];
  stats: { themes: number; features: number; comingSoon: number };
}

/* ─── Sub-layout card ───────────────────────────────────────────────── */
const SubLayoutCard = ({ sub, layoutId }: { sub: SubLayout; layoutId: string }) => {
  const navigate = useNavigate();
  // Navigate to the sub-layout page (not directly to a theme)
  const subLayoutPath = `/admin/layouts/${layoutId}/${sub.slug}`;
  const activeFeatures = sub.features.filter((f) => f.active);
  const comingFeatures = sub.features.filter((f) => !f.active);

  return (
    <div className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Hero gradient */}
      <div className={cn('relative h-52 bg-gradient-to-br overflow-hidden flex flex-col justify-between p-6', sub.gradient)}>
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-black/20 blur-2xl" />

        {/* Top row */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-1">
              Sub-layout
            </p>
            <h2 className="text-3xl font-black text-white">{sub.name}</h2>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1.5 text-[10px] font-bold text-white border border-white/20">
            <Star className="h-3 w-3 fill-white" />
            {sub.stats.themes} Themes
          </div>
        </div>

        {/* Bottom — headline */}
        <div className="relative z-10">
          <h3 className="text-lg font-bold text-white leading-tight">{sub.headline}</h3>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">{sub.tagline}</p>
        </div>

        {/* Colour palette pills */}
        <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
          {sub.previewPalette.map((color, i) => (
            <span
              key={i}
              className="h-4 w-4 rounded-full border border-white/30 shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Themes preview strip */}
      <div className="px-5 pt-5 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Included Themes
        </p>
        <div className="grid grid-cols-2 gap-2">
          {sub.themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => navigate(subLayoutPath)}
              className="group/theme relative overflow-hidden rounded-xl border border-border text-left transition-all hover:border-primary/50 hover:shadow-md"
              style={{ backgroundColor: theme.bg }}
            >
              {/* Fake storefront preview */}
              <div className="h-20 relative overflow-hidden p-3" style={{ backgroundColor: theme.bg }}>
                {/* Simulated navbar */}
                <div className="flex items-center justify-between mb-2">
                  <div className="h-1.5 w-10 rounded-full opacity-60" style={{ backgroundColor: theme.accent }} />
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-1 w-5 rounded-full opacity-30" style={{ backgroundColor: theme.preview === 'dark' ? '#fff' : '#333' }} />
                    ))}
                  </div>
                </div>
                {/* Simulated product cards */}
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-md overflow-hidden" style={{ backgroundColor: theme.preview === 'dark' ? '#ffffff18' : '#00000010' }}>
                      <div className="h-7 w-full" style={{ backgroundColor: theme.accent + '30' }} />
                      <div className="p-1 space-y-0.5">
                        <div className="h-0.5 w-full rounded" style={{ backgroundColor: theme.preview === 'dark' ? '#ffffff30' : '#33333330' }} />
                        <div className="h-0.5 w-2/3 rounded" style={{ backgroundColor: theme.accent + '60' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Theme name */}
              <div className="px-3 py-2 border-t" style={{ borderColor: theme.preview === 'dark' ? '#ffffff15' : '#00000010', backgroundColor: theme.preview === 'dark' ? theme.bg : '#ffffff' }}>
                <p className="text-[11px] font-bold truncate" style={{ color: theme.preview === 'dark' ? '#fff' : '#111' }}>
                  {theme.name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                  <p className="text-[9px] capitalize" style={{ color: theme.preview === 'dark' ? '#ffffff50' : '#66666690' }}>
                    {theme.preview} theme
                  </p>
                </div>
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/theme:opacity-100 transition-opacity bg-black/40 rounded-xl">
                <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black shadow-lg">
                  <Eye className="h-3 w-3" /> View Theme
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Features summary */}
      <div className="px-5 pt-4 pb-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Feature Highlights</p>
          <div className="grid grid-cols-1 gap-1">
            {activeFeatures.slice(0, 5).map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-xs text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                {f.label}
              </div>
            ))}
            {comingFeatures.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60 shrink-0" />
                +{comingFeatures.length} coming soon features
              </div>
            )}
          </div>
        </div>

        {/* Stats + CTA */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-sm font-bold">{sub.stats.features}</p>
              <p className="text-[9px] text-muted-foreground">Active</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-amber-500">{sub.stats.comingSoon}</p>
              <p className="text-[9px] text-muted-foreground">Soon</p>
            </div>
          </div>
          <button
            onClick={() => navigate(subLayoutPath)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${sub.accentColor}, ${sub.accentColor}cc)` }}
          >
            Explore <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Page component ────────────────────────────────────────────────── */
const AdminLayoutDetail = () => {
  const { layoutId = 'layout-1' } = useParams<{ layoutId: string }>();
  const meta = LAYOUT_META[layoutId];

  if (!meta) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Shirt className="h-10 w-10 opacity-30" />
        <p className="text-sm">Layout not found.</p>
        <Link to="/admin/layouts" className="text-xs text-primary underline">Back to Layouts</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/admin/layouts" className="hover:text-foreground transition-colors">Layout Studio</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{meta.name}</span>
      </div>

      {/* Page hero */}
      <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-8 md:p-10', meta.gradient)}>
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-black/20 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-full bg-white/20 backdrop-blur px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
              {meta.badge}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/80 px-2.5 py-1 text-[10px] font-semibold text-white">
              <Zap className="h-2.5 w-2.5 fill-white" /> 2 Sub-layouts
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{meta.name}</h1>
          <p className="text-sm text-white/75 max-w-xl leading-relaxed">{meta.description}</p>
        </div>
      </div>

      {/* Sub-layout grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold">Choose a Sub-layout</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each sub-layout has its own visual identity and theme pair.
            </p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {meta.subLayouts.map((sub) => (
            <SubLayoutCard key={sub.id} sub={sub} layoutId={layoutId} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminLayoutDetail;
