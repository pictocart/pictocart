import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronRight, Shirt, Star, Zap, Eye, ArrowRight, Play, CheckCircle, Clock3, Flame, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE = 'https://wuqznkpaldtvpfpdtllp.supabase.co/storage/v1/object/public/theme-previews/layout-themes';
const heroImg = (id: string) => `${STORAGE}/hero/${id}.svg`;
const prodImg = (id: string, n: number) => `${STORAGE}/products/${id}-${n}.svg`;

/* ─── Data ─────────────────────────────────────────────────────────── */
interface Theme { id: string; name: string; accent: string; bg: string; preview: 'dark' | 'light'; }
interface Feature { label: string; active: boolean; }
interface SubLayout {
  id: string; slug: string; name: string; headline: string; tagline: string;
  accentColor: string; previewPalette: string[];
  themes: Theme[]; features: Feature[];
  stats: { themes: number; features: number; comingSoon: number };
}

const LAYOUT_META: Record<string, {
  name: string; badge: string; gradient: string; description: string; subLayouts: SubLayout[];
}> = {
  'layout-1': {
    name: 'Layout 1',
    badge: 'Fashion & Apparel',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    description: 'Two visually distinct sub-layouts built exclusively for clothing brands — from high-fashion editorials to street-style collections.',
    subLayouts: [
      {
        id: '1.1', slug: 'layout-1-1', name: 'Layout 1.1',
        headline: 'Runway Editorial',
        tagline: 'Luxury fashion with full-bleed imagery & editorial storytelling',
        accentColor: '#c9a96e',
        previewPalette: ['#0d0d0d', '#1a1a1a', '#c9a96e', '#f5f0eb'],
        themes: [
          { id: 'noir-atelier', name: 'Noir Atelier', accent: '#c9a96e', bg: '#0d0d0d', preview: 'dark' },
          { id: 'ivory-luxe',   name: 'Ivory Luxe',   accent: '#8b6914', bg: '#faf8f4', preview: 'light' },
        ],
        features: [
          { label: 'Full-bleed hero video banner',  active: true  },
          { label: 'Editorial lookbook grid',        active: true  },
          { label: 'Size guide modal',               active: true  },
          { label: 'Variant colour swatches',        active: true  },
          { label: 'Sticky add-to-cart bar',         active: true  },
          { label: 'Product zoom gallery',           active: true  },
          { label: 'Wishlist & save for later',      active: true  },
          { label: 'Customer reviews & ratings',     active: true  },
          { label: 'Related products carousel',      active: true  },
          { label: 'Coupon & promo codes',           active: true  },
          { label: 'COD + Razorpay checkout',        active: true  },
          { label: 'Order tracking timeline',        active: true  },
          { label: 'AR try-on (virtual fit)',        active: false },
          { label: 'AI outfit suggestions',          active: false },
          { label: 'Live shopping stream',           active: false },
        ],
        stats: { themes: 2, features: 12, comingSoon: 3 },
      },
      {
        id: '1.2', slug: 'layout-1-2', name: 'Layout 1.2',
        headline: 'Street Style Hub',
        tagline: 'Bold, youthful & trend-driven for fast-fashion & streetwear',
        accentColor: '#ff3d6b',
        previewPalette: ['#0f0f1a', '#1a1a2e', '#ff3d6b', '#fff5f8'],
        themes: [
          { id: 'neon-drip',    name: 'Neon Drip',    accent: '#ff3d6b', bg: '#0f0f1a', preview: 'dark'  },
          { id: 'blush-street', name: 'Blush Street',  accent: '#e91e8c', bg: '#fff5f8', preview: 'light' },
        ],
        features: [
          { label: 'Masonry product grid',            active: true  },
          { label: 'Instagram-style story rings',     active: true  },
          { label: 'Quick-add from listing',          active: true  },
          { label: 'Variant colour swatches',         active: true  },
          { label: 'Flash sale countdown timer',      active: true  },
          { label: 'Sticky bottom add-to-cart',       active: true  },
          { label: 'Wishlist & save for later',       active: true  },
          { label: 'Customer reviews & ratings',      active: true  },
          { label: 'Share product on WhatsApp',       active: true  },
          { label: 'Coupon & promo codes',            active: true  },
          { label: 'COD + Razorpay checkout',         active: true  },
          { label: 'Order tracking timeline',         active: true  },
          { label: 'AI size recommender',             active: false },
          { label: 'Influencer collab pages',         active: false },
          { label: 'Drop / waitlist alerts',          active: false },
        ],
        stats: { themes: 2, features: 12, comingSoon: 3 },
      },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   CARD 1.1 — HORIZONTAL CINEMATIC (Dark editorial, magazine-style)
   Left: full hero image panel | Right: name, tagline, features, themes
═══════════════════════════════════════════════════════════════════════ */
const Card11 = ({ sub, layoutId }: { sub: SubLayout; layoutId: string }) => {
  const navigate = useNavigate();
  const path = `/admin/layouts/${layoutId}/${sub.slug}`;
  const active = sub.features.filter(f => f.active).slice(0, 6);
  const coming = sub.features.filter(f => !f.active);

  return (
    <div
      onClick={() => navigate(path)}
      className="group relative overflow-hidden rounded-3xl cursor-pointer
                 border border-zinc-800 bg-zinc-950 shadow-2xl
                 hover:shadow-[0_0_60px_rgba(201,169,110,0.15)]
                 hover:-translate-y-1 transition-all duration-500"
      style={{ minHeight: 360 }}
    >
      <div className="flex h-full">
        {/* ── Left: hero image panel ── */}
        <div className="relative w-[42%] shrink-0 overflow-hidden">
          <img
            src={heroImg('noir-atelier')}
            alt="Editorial Preview"
            className="absolute inset-0 w-full h-full object-cover object-left-top
                       transition-transform duration-700 group-hover:scale-105"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-950/30 to-zinc-950/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />

          {/* Number badge */}
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <span className="text-4xl font-black text-white/10 leading-none select-none">1.1</span>
          </div>

          {/* Bottom-left palette */}
          <div className="absolute bottom-5 left-5 flex gap-1.5">
            {sub.previewPalette.map((c, i) => (
              <span key={i} className="h-4 w-4 rounded-full border border-white/20 shadow"
                    style={{ backgroundColor: c }} />
            ))}
          </div>

          {/* Play button hint */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="h-14 w-14 rounded-full bg-white/15 backdrop-blur-sm border border-white/30
                            flex items-center justify-center">
              <Play className="h-6 w-6 fill-white text-white ml-1" />
            </div>
          </div>
        </div>

        {/* ── Right: content ── */}
        <div className="flex-1 flex flex-col justify-between p-7 gap-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                Sub-layout
              </span>
              <span className="h-px flex-1 bg-zinc-800" />
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30
                               px-2.5 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Editorial
              </span>
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">
              {sub.headline}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">{sub.tagline}</p>
          </div>

          {/* Theme pills */}
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Themes</p>
            <div className="flex gap-2">
              {sub.themes.map(t => (
                <div key={t.id}
                     className="flex items-center gap-2 rounded-xl px-3 py-2 border transition-all
                                hover:border-amber-500/50 cursor-default"
                     style={{ backgroundColor: t.bg, borderColor: t.accent + '40' }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.accent }} />
                  <span className="text-[11px] font-semibold"
                        style={{ color: t.preview === 'dark' ? '#f5f0eb' : '#1a1612' }}>
                    {t.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-1.5">
            {active.map(f => (
              <div key={f.label} className="flex items-center gap-2 text-xs text-zinc-300">
                <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                {f.label}
              </div>
            ))}
            {coming.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <Clock3 className="h-3 w-3 text-amber-500/60 shrink-0" />
                +{coming.length} features coming soon
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-lg font-black text-white">{sub.stats.features}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Active</p>
              </div>
              <div>
                <p className="text-lg font-black text-amber-400">{sub.stats.comingSoon}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Soon</p>
              </div>
            </div>
            <button
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-zinc-900
                         transition-all group-hover:gap-3 group-hover:shadow-lg group-hover:shadow-amber-500/30"
              style={{ backgroundColor: sub.accentColor }}
            >
              Explore <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   CARD 1.2 — MOSAIC / ASYMMETRIC (Bold street, product-first)
   Top: 3-column product image mosaic | Bottom: split dark/accent info
═══════════════════════════════════════════════════════════════════════ */
const Card12 = ({ sub, layoutId }: { sub: SubLayout; layoutId: string }) => {
  const navigate = useNavigate();
  const path = `/admin/layouts/${layoutId}/${sub.slug}`;
  const active = sub.features.filter(f => f.active).slice(0, 6);
  const coming = sub.features.filter(f => !f.active);

  return (
    <div
      onClick={() => navigate(path)}
      className="group relative overflow-hidden rounded-3xl cursor-pointer
                 bg-[#0f0f1a] border border-[#1e1e35]
                 shadow-2xl hover:shadow-[0_0_60px_rgba(255,61,107,0.18)]
                 hover:-translate-y-1 transition-all duration-500"
      style={{ minHeight: 360 }}
    >
      {/* ── Top: Mosaic of product images ── */}
      <div className="grid grid-cols-3 gap-0.5 h-48 overflow-hidden relative">
        {/* Big left cell */}
        <div className="row-span-1 relative overflow-hidden col-span-1">
          <img src={prodImg('neon-drip', 1)} alt=""
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f1a]/60" />
        </div>
        <div className="relative overflow-hidden">
          <img src={prodImg('neon-drip', 2)} alt=""
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f1a]/60" />
        </div>
        <div className="relative overflow-hidden">
          <img src={prodImg('neon-drip', 3)} alt=""
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          {/* Flash sale badge */}
          <div className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-black text-white uppercase"
               style={{ backgroundColor: '#ff3d6b' }}>
            🔥 Drop
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f1a]/60" />
        </div>

        {/* Floating number */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-8xl font-black text-white/5 leading-none select-none">1.2</span>
        </div>

        {/* Neon accent line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5"
             style={{ background: 'linear-gradient(90deg, transparent, #ff3d6b, #e91e8c, transparent)' }} />
      </div>

      {/* ── Bottom: info split ── */}
      <div className="flex gap-0 h-[calc(100%-12rem)]">
        {/* Left — dark info panel */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
                Sub-layout
              </span>
              <span className="h-px flex-1 bg-[#1e1e35]" />
              <Flame className="h-3.5 w-3.5 text-[#ff3d6b]" />
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">{sub.headline}</h2>
            <p className="text-xs text-[#94a3b8] leading-relaxed">{sub.tagline}</p>
          </div>

          {/* Active features */}
          <div className="space-y-1.5 mt-4">
            {active.map(f => (
              <div key={f.label} className="flex items-center gap-2 text-xs text-[#94a3b8]">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: '#ff3d6b' }} />
                {f.label}
              </div>
            ))}
            {coming.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#94a3b8]/40">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500/40 shrink-0" />
                +{coming.length} coming soon
              </div>
            )}
          </div>
        </div>

        {/* Right — accent sidebar */}
        <div className="w-[140px] shrink-0 flex flex-col justify-between p-5"
             style={{ background: 'linear-gradient(160deg, #ff3d6b18, #e91e8c0a)', borderLeft: '1px solid #ff3d6b20' }}>
          {/* Theme pills */}
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]/60 mb-3">Themes</p>
            {sub.themes.map(t => (
              <div key={t.id} className="flex items-center gap-2 py-2 px-2.5 rounded-xl"
                   style={{ backgroundColor: t.bg, border: `1px solid ${t.accent}30` }}>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.accent }} />
                <span className="text-[10px] font-semibold truncate"
                      style={{ color: t.preview === 'dark' ? '#f8fafc' : '#1a0a12' }}>
                  {t.name}
                </span>
              </div>
            ))}
          </div>

          {/* Stats + CTA */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg py-2" style={{ backgroundColor: '#ffffff08' }}>
                <p className="text-base font-black text-white">{sub.stats.features}</p>
                <p className="text-[8px] text-[#94a3b8] uppercase">Active</p>
              </div>
              <div className="rounded-lg py-2" style={{ backgroundColor: '#ffffff08' }}>
                <p className="text-base font-black text-amber-400">{sub.stats.comingSoon}</p>
                <p className="text-[8px] text-[#94a3b8] uppercase">Soon</p>
              </div>
            </div>
            <button
              className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5
                         text-xs font-black text-white transition-all
                         hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #ff3d6b, #e91e8c)' }}
            >
              Explore <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Page ──────────────────────────────────────────────────────────── */
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

  const [sub11, sub12] = meta.subLayouts;

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

      {/* Section header */}
      <div>
        <h2 className="text-lg font-bold">Choose a Sub-layout</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Each sub-layout has a completely different visual structure — pick one that fits your brand.
        </p>
      </div>

      {/* Cards — side by side in a 2-col grid */}
      <div className="grid grid-cols-2 gap-5">
        {sub11 && <Card11 sub={sub11} layoutId={layoutId} />}
        {sub12 && <Card12 sub={sub12} layoutId={layoutId} />}
      </div>
    </div>
  );
};

export default AdminLayoutDetail;
