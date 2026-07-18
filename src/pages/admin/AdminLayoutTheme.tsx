import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight, CheckCircle2, Clock, ShoppingCart, Heart, Star,
  Search, Truck, CreditCard, RotateCcw, Tag, Zap, Shield, Package,
  MessageCircle, Smartphone, Globe, BarChart2, Share2, ImageIcon,
  Layers, Eye, ChevronDown, Sparkles, Users, Bell, Percent, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

/* ── image helpers ───────────────────────────────────────────────────── */
const IMG = 'https://wuqznkpaldtvpfpdtllp.supabase.co/storage/v1/object/public/theme-previews/layout-themes';
const heroUrl = (id: string) => `${IMG}/hero/${id}.svg`;
const prodUrl = (id: string, n: number) => `${IMG}/products/${id}-${n}.svg`;

const PRODS = [
  { name: 'Silk Midi Dress',   price: '2,499', badge: 'NEW',  stars: 5 },
  { name: 'Linen Blazer',      price: '3,899', badge: 'SALE', stars: 4 },
  { name: 'Wide Leg Trousers', price: '1,799', badge: '',     stars: 5 },
  { name: 'Knit Cardigan',     price: '2,199', badge: 'HOT',  stars: 4 },
];

/* ── Theme metadata ──────────────────────────────────────────────────── */
interface ThemeMeta {
  id: string; name: string;
  subLayoutName: string; subLayoutSlug: string;
  layoutId: string; layoutName: string;
  accent: string; bg: string; surface: string;
  textPrimary: string; textMuted: string; border: string;
  preview: 'dark' | 'light';
  tagline: string; description: string; gradient: string; tags: string[];
}

const THEME_DB: Record<string, ThemeMeta> = {
  'noir-atelier': {
    id: 'noir-atelier', name: 'Noir Atelier',
    subLayoutName: 'Layout 1.1 — Classic Boutique', subLayoutSlug: 'layout-1-1',
    layoutId: 'layout-1', layoutName: 'Layout 1',
    accent: '#c9a96e', bg: '#0d0d0d', surface: '#1a1a1a',
    textPrimary: '#f5f0eb', textMuted: '#888', border: '#2a2a2a',
    preview: 'dark',
    tagline: 'Deep black & champagne gold — timeless, minimal, powerfully sophisticated.',
    description: 'Noir Atelier runs on the Classic Boutique skeleton: left sidebar with filters, centered serif brand in the navbar, 4-column uniform product grid, and a multi-column footer. Only the palette differs from Ivory Luxe.',
    gradient: 'from-zinc-900 via-neutral-800 to-stone-900',
    tags: ['Dark', 'Luxury', 'Serif', 'Gold'],
  },
  'ivory-luxe': {
    id: 'ivory-luxe', name: 'Ivory Luxe',
    subLayoutName: 'Layout 1.1 — Classic Boutique', subLayoutSlug: 'layout-1-1',
    layoutId: 'layout-1', layoutName: 'Layout 1',
    accent: '#8b6914', bg: '#faf8f4', surface: '#f0ece4',
    textPrimary: '#1a1612', textMuted: '#8a7f72', border: '#e8e0d4',
    preview: 'light',
    tagline: 'Warm ivory & burnished gold — refined, airy, irresistibly chic.',
    description: 'Ivory Luxe shares the Classic Boutique skeleton with Noir Atelier — same sidebar, same navbar placement, same 4-col grid — but rendered in warm cream and deep gold. Same layout, opposite mood.',
    gradient: 'from-amber-50 via-stone-100 to-yellow-50',
    tags: ['Light', 'Ivory', 'Warm', 'Airy'],
  },
  'neon-drip': {
    id: 'neon-drip', name: 'Neon Drip',
    subLayoutName: 'Layout 1.2 — Street Style Hub', subLayoutSlug: 'layout-1-2',
    layoutId: 'layout-1', layoutName: 'Layout 1',
    accent: '#ff3d6b', bg: '#0f0f1a', surface: '#1a1a2e',
    textPrimary: '#f8fafc', textMuted: '#94a3b8', border: '#1e1e35',
    preview: 'dark',
    tagline: 'Neon-lit nights, bold drops & relentless street energy.',
    description: 'Neon Drip uses the Street Style Hub skeleton: no sidebar, hamburger left + visible search bar in navbar, 50/50 split hero, Pinterest masonry grid, sticky cart bottom bar. Electric neon on midnight navy.',
    gradient: 'from-rose-600 via-fuchsia-700 to-indigo-900',
    tags: ['Dark', 'Neon', 'Street', 'Bold'],
  },
  'blush-street': {
    id: 'blush-street', name: 'Blush Street',
    subLayoutName: 'Layout 1.2 — Street Style Hub', subLayoutSlug: 'layout-1-2',
    layoutId: 'layout-1', layoutName: 'Layout 1',
    accent: '#e91e8c', bg: '#fff5f8', surface: '#ffeef4',
    textPrimary: '#1a0a12', textMuted: '#9b6e80', border: '#fad4e4',
    preview: 'light',
    tagline: 'Soft blush & hot pink — street attitude meets feminine edge.',
    description: 'Blush Street runs the same Street Style Hub skeleton as Neon Drip — hamburger nav, inline search, masonry grid, sticky cart — but in rose and hot-pink tones. Same structure, completely opposite palette.',
    gradient: 'from-pink-100 via-rose-50 to-fuchsia-50',
    tags: ['Light', 'Blush', 'Pink', 'Street'],
  },
};

/* ════════════════════════════════════════════════════════════
   LAYOUT 1.1 — CLASSIC BOUTIQUE SKELETON
   Structure: announcement bar | logo-left navbar+center-links+icons-right
   LEFT SIDEBAR (categories, price, size, colour filters)
   RIGHT: hero banner | 4-col uniform grid | newsletter | multi-col footer
════════════════════════════════════════════════════════════ */
const Layout11Preview = ({ t }: { t: ThemeMeta }) => {
  const dk = t.preview === 'dark';
  const cats = ['All','Dresses','Blazers','Trousers','Knitwear','Accessories'];
  const bdgColor = (b: string) => b === 'SALE' ? '#ef4444' : b === 'HOT' ? '#f97316' : t.accent;

  return (
    <div className="w-full overflow-hidden rounded-2xl border shadow-2xl" style={{ backgroundColor: t.bg, borderColor: t.border }}>

      {/* browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b" style={{ backgroundColor: t.surface, borderColor: t.border }}>
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <div className="mx-3 flex-1 h-4 rounded px-2 text-[9px] flex items-center"
          style={{ backgroundColor: dk ? '#ffffff10' : '#00000008', color: t.textMuted }}>
          yourbrand.com
        </div>
      </div>

      {/* announcement bar */}
      <div className="py-1.5 text-center text-[8px] font-semibold tracking-widest uppercase"
        style={{ backgroundColor: t.accent, color: '#fff' }}>
        Free Shipping on orders above ₹999 &nbsp;|&nbsp; New Summer Collection Now Live
      </div>

      {/* navbar: LOGO LEFT · links CENTER · icons RIGHT */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ backgroundColor: t.surface, borderColor: t.border }}>
        <span className="text-base font-black tracking-[0.25em] uppercase" style={{ color: t.textPrimary, fontFamily: 'Georgia,serif' }}>MAISON</span>
        <div className="flex gap-6">
          {['New In', 'Women', 'Men', 'Sale'].map((l, i) => (
            <span key={l} className="text-[10px] font-medium tracking-wider uppercase relative" style={{ color: i === 0 ? t.accent : t.textMuted }}>
              {l}
              {i === 0 && <span className="absolute -bottom-3 left-0 right-0 h-0.5 rounded" style={{ backgroundColor: t.accent }} />}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Search className="h-3.5 w-3.5" style={{ color: t.textMuted }} />
          <div className="relative">
            <Heart className="h-3.5 w-3.5" style={{ color: t.textMuted }} />
            <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full text-[7px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: t.accent }}>3</span>
          </div>
          <div className="relative">
            <ShoppingBag className="h-3.5 w-3.5" style={{ color: t.textPrimary }} />
            <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full text-[7px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: t.accent }}>2</span>
          </div>
          <div className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold border" style={{ borderColor: t.border, color: t.textMuted }}>A</div>
        </div>
      </div>

      {/* body: SIDEBAR + CONTENT */}
      <div className="flex">

        {/* LEFT SIDEBAR */}
        <div className="w-36 shrink-0 border-r py-4 px-3 space-y-5" style={{ borderColor: t.border, backgroundColor: t.surface, minHeight: 460 }}>
          <div className="space-y-1">
            <p className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>Categories</p>
            {cats.map((c, i) => (
              <div key={c} className="flex items-center justify-between px-2 py-1.5 rounded-lg text-[9px] font-medium"
                style={{ backgroundColor: i === 0 ? t.accent + '18' : 'transparent', color: i === 0 ? t.accent : t.textMuted }}>
                <span>{c}</span>
                {i === 0 && <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.accent, color: '#fff' }}>12</span>}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>Price</p>
            {['Under ₹999', '₹999–₹2499', '₹2499–₹4999', 'Above ₹4999'].map((p, i) => (
              <div key={p} className="flex items-center gap-2 text-[8px]" style={{ color: t.textMuted }}>
                <span className="h-2.5 w-2.5 rounded border flex-shrink-0 flex items-center justify-center"
                  style={{ borderColor: i === 1 ? t.accent : t.border, backgroundColor: i === 1 ? t.accent : 'transparent' }}>
                  {i === 1 && <span className="text-white text-[6px]">✓</span>}
                </span>
                {p}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>Size</p>
            <div className="grid grid-cols-3 gap-1">
              {['XS','S','M','L','XL','XXL'].map((s, i) => (
                <span key={s} className="h-6 flex items-center justify-center text-[8px] font-semibold rounded border"
                  style={{ borderColor: i === 1 || i === 2 ? t.accent : t.border, color: i === 1 || i === 2 ? t.accent : t.textMuted, backgroundColor: i === 1 || i === 2 ? t.accent + '15' : 'transparent' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color: t.textMuted }}>Colour</p>
            <div className="flex gap-1.5 flex-wrap">
              {['#1a1a1a','#ffffff','#c9a96e','#8b6914','#e8d5b7','#6b7280'].map((c, i) => (
                <span key={c} className="h-4 w-4 rounded-full border-2" style={{ backgroundColor: c, borderColor: i === 0 ? t.accent : dk ? '#444' : '#ddd' }} />
              ))}
            </div>
          </div>
          <button className="w-full py-2 text-[8px] font-bold tracking-widest uppercase rounded" style={{ backgroundColor: t.accent, color: '#fff' }}>Apply Filters</button>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 overflow-hidden">
          {/* hero */}
          <div className="relative overflow-hidden" style={{ height: 160 }}>
            <img src={heroUrl(t.id)} alt="hero" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0" style={{ background: dk ? 'linear-gradient(to right,rgba(13,13,13,.88) 30%,transparent 70%)' : 'linear-gradient(to right,rgba(250,248,244,.92) 30%,transparent 70%)' }} />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 space-y-2">
              <p className="text-[7px] tracking-[0.3em] uppercase font-semibold" style={{ color: t.accent }}>Summer 2025</p>
              <p className="text-xl font-black leading-tight" style={{ color: t.textPrimary, fontFamily: 'Georgia,serif' }}>The New<br/>Classics.</p>
              <button className="px-4 py-1.5 text-[8px] font-bold tracking-wider uppercase" style={{ backgroundColor: t.accent, color: '#fff', borderRadius: 2 }}>Shop Now</button>
            </div>
          </div>

          {/* sort bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-t" style={{ borderColor: t.border }}>
            <p className="text-[8px] font-medium" style={{ color: t.textMuted }}>24 Products</p>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-medium" style={{ color: t.textMuted }}>Sort:</span>
              <div className="flex items-center gap-1 px-2 py-1 border rounded text-[8px]" style={{ borderColor: t.border, color: t.textPrimary }}>
                Newest <ChevronDown className="h-2.5 w-2.5" />
              </div>
            </div>
          </div>

          {/* 4-col UNIFORM product grid */}
          <div className="grid grid-cols-4 gap-2 p-3">
            {PRODS.map((p, i) => (
              <div key={i} className="group/c relative overflow-hidden rounded-lg" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
                <div className="relative overflow-hidden" style={{ height: 100 }}>
                  <img src={prodUrl(t.id, i + 1)} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/c:scale-105" loading="lazy" />
                  {p.badge && <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[7px] font-black text-white" style={{ backgroundColor: bdgColor(p.badge), borderRadius: 2 }}>{p.badge}</span>}
                  <button className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center opacity-0 group-hover/c:opacity-100 transition-opacity" style={{ backgroundColor: t.surface + 'ee' }}>
                    <Heart className="h-2.5 w-2.5" style={{ color: t.accent }} />
                  </button>
                  <button className="absolute bottom-0 inset-x-0 py-1.5 text-[7px] font-bold uppercase text-white opacity-0 group-hover/c:opacity-100 transition-opacity" style={{ backgroundColor: t.accent }}>Add to Bag</button>
                </div>
                <div className="p-2 space-y-0.5">
                  <p className="text-[8px] font-semibold truncate" style={{ color: t.textPrimary, fontFamily: 'Georgia,serif' }}>{p.name}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-bold" style={{ color: t.accent }}>₹{p.price}</p>
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className="h-1.5 w-1.5" style={{ fill: s <= p.stars ? '#f59e0b' : 'transparent', color: '#f59e0b' }} />)}</div>
                  </div>
                  <div className="flex gap-0.5 pt-0.5">
                    {['S','M','L'].map((sz, si) => (
                      <span key={sz} className="h-3 w-4 flex items-center justify-center text-[6px] border" style={{ borderColor: si===1 ? t.accent : t.border, color: si===1 ? t.accent : t.textMuted, borderRadius: 1 }}>{sz}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* newsletter strip */}
          <div className="flex items-center gap-3 px-4 py-3 border-t" style={{ borderColor: t.border, backgroundColor: t.accent + '10' }}>
            <div className="flex-1">
              <p className="text-[9px] font-bold" style={{ color: t.textPrimary }}>Get 10% off your first order</p>
              <p className="text-[7px]" style={{ color: t.textMuted }}>Subscribe to our newsletter</p>
            </div>
            <div className="flex">
              <input className="h-6 px-2 text-[8px] border-y border-l rounded-l outline-none" placeholder="your@email.com"
                style={{ borderColor: t.border, backgroundColor: t.surface, color: t.textPrimary, width: 110 }} />
              <button className="h-6 px-2 text-[7px] font-bold rounded-r" style={{ backgroundColor: t.accent, color: '#fff' }}>Subscribe</button>
            </div>
          </div>
        </div>
      </div>

      {/* multi-col FOOTER */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-t" style={{ borderColor: t.border, backgroundColor: t.surface }}>
        {[{ title: 'MAISON', items: ['Our Story','Sustainability','Press'] },
          { title: 'Help', items: ['Track Order','Returns','Sizing Guide'] },
          { title: 'Shop', items: ['New Arrivals','Sale','Gift Cards'] },
          { title: 'Follow', items: ['Instagram','Pinterest','YouTube'] }].map(col => (
          <div key={col.title} className="space-y-1.5">
            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: t.textPrimary }}>{col.title}</p>
            {col.items.map(item => <p key={item} className="text-[7px]" style={{ color: t.textMuted }}>{item}</p>)}
          </div>
        ))}
      </div>
      <div className="px-6 py-2 border-t flex items-center justify-between" style={{ borderColor: t.border }}>
        <p className="text-[7px]" style={{ color: t.textMuted }}>© 2025 Maison. All rights reserved.</p>
        <div className="flex gap-2">
          {['Visa','Mastercard','UPI','Razorpay'].map(p => (
            <span key={p} className="text-[6px] px-1.5 py-0.5 border rounded" style={{ borderColor: t.border, color: t.textMuted }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   LAYOUT 1.2 — STREET STYLE HUB SKELETON
   Structure: hamburger-left + VISIBLE SEARCH BAR + brand-right + cart-pill
   NO SIDEBAR — horizontal category pills scroll
   HERO: 50/50 split (text-left | image-right) with countdown timer
   MASONRY 2-col unequal heights (Pinterest-style)
   STICKY CART bottom bar | minimal single-row footer
════════════════════════════════════════════════════════════ */
const Layout12Preview = ({ t }: { t: ThemeMeta }) => {
  const dk = t.preview === 'dark';
  const cats = ['All Drops','Oversized','Cargo','Hoodies','Sneakers','Caps'];
  const bdgColor = (b: string) => b === 'SALE' ? '#ef4444' : b === 'HOT' ? '#f97316' : t.accent;

  return (
    <div className="w-full overflow-hidden rounded-2xl border shadow-2xl" style={{ backgroundColor: t.bg, borderColor: t.border }}>

      {/* browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b" style={{ backgroundColor: t.surface, borderColor: t.border }}>
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <div className="mx-3 flex-1 h-4 rounded px-2 text-[9px] flex items-center" style={{ backgroundColor: dk ? '#ffffff10' : '#00000008', color: t.textMuted }}>
          yourbrand.com
        </div>
      </div>

      {/* NAVBAR: hamburger LEFT · search bar CENTER · brand RIGHT · cart-pill FAR RIGHT */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: t.border, backgroundColor: t.bg }}>
        {/* hamburger */}
        <button className="flex flex-col gap-0.5 shrink-0">
          <span className="block h-0.5 w-4 rounded" style={{ backgroundColor: t.textPrimary }} />
          <span className="block h-0.5 w-3 rounded" style={{ backgroundColor: t.textPrimary }} />
          <span className="block h-0.5 w-4 rounded" style={{ backgroundColor: t.textPrimary }} />
        </button>
        {/* visible search bar */}
        <div className="flex-1 flex items-center gap-2 px-3 h-7 rounded-full border" style={{ borderColor: t.border, backgroundColor: dk ? '#ffffff0a' : '#00000008' }}>
          <Search className="h-3 w-3 shrink-0" style={{ color: t.textMuted }} />
          <span className="text-[9px]" style={{ color: t.textMuted }}>Search drops, brands, styles…</span>
        </div>
        {/* brand name right of search */}
        <span className="text-sm font-black tracking-tight uppercase shrink-0" style={{ color: t.textPrimary }}>
          DRIP<span style={{ color: t.accent }}>.</span>
        </span>
        {/* cart pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold shrink-0" style={{ backgroundColor: t.accent, color: '#fff' }}>
          <ShoppingCart className="h-3 w-3" /> 3
        </div>
      </div>

      {/* category pills — HORIZONTAL SCROLL, NO SIDEBAR */}
      <div className="flex gap-2 px-4 py-2.5 border-b overflow-x-auto" style={{ borderColor: t.border }}>
        {cats.map((c, i) => (
          <span key={c} className="shrink-0 px-3 py-1.5 rounded-full text-[8px] font-bold whitespace-nowrap border"
            style={{ backgroundColor: i === 0 ? t.accent : 'transparent', color: i === 0 ? '#fff' : t.textMuted, borderColor: i === 0 ? t.accent : t.border }}>
            {c}
          </span>
        ))}
      </div>

      {/* HERO: 50/50 split */}
      <div className="grid grid-cols-2" style={{ height: 160 }}>
        {/* left: text + countdown */}
        <div className="flex flex-col justify-center px-6 gap-2" style={{ backgroundColor: dk ? t.surface : t.accent + '0c' }}>
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full w-fit" style={{ backgroundColor: t.accent + '20', border: `1px solid ${t.accent}40` }}>
            <span className="text-[7px] font-black uppercase tracking-wider" style={{ color: t.accent }}>Limited Drop</span>
          </div>
          <p className="text-xl font-black leading-tight" style={{ color: t.textPrimary }}>
            Street<br/><span style={{ color: t.accent }}>Essentials</span>
          </p>
          <div className="flex gap-1">
            {[['02','HR'],['34','MIN'],['11','SEC']].map(([v, l]) => (
              <div key={l} className="flex flex-col items-center px-1.5 py-1 rounded" style={{ backgroundColor: t.accent, minWidth: 24 }}>
                <span className="text-[10px] font-black text-white leading-none">{v}</span>
                <span className="text-[5px] text-white/70 uppercase">{l}</span>
              </div>
            ))}
          </div>
        </div>
        {/* right: full image */}
        <div className="relative overflow-hidden">
          <img src={heroUrl(t.id)} alt="hero" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to left,transparent 60%,${t.bg}30)` }} />
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[8px] font-black text-white rotate-12" style={{ backgroundColor: '#ef4444' }}>SALE</div>
        </div>
      </div>

      {/* sort bar */}
      <div className="flex items-center justify-between px-4 py-2 border-y" style={{ borderColor: t.border }}>
        <p className="text-[8px] font-semibold" style={{ color: t.textMuted }}>48 results</p>
        <div className="flex items-center gap-2">
          {['Latest','Popular','Price'].map((f, i) => (
            <span key={f} className="text-[7px] font-bold px-2 py-1 rounded-full border"
              style={{ backgroundColor: i === 0 ? t.accent : 'transparent', color: i === 0 ? '#fff' : t.textMuted, borderColor: i === 0 ? t.accent : t.border }}>
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* MASONRY 2-col unequal heights */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {/* left col: tall then short */}
        <div className="space-y-2">
          {[{ n: 1, h: 138, p: PRODS[0] }, { n: 3, h: 100, p: PRODS[2] }].map(({ n, h, p }) => (
            <div key={n} className="group/c relative overflow-hidden rounded-xl" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
              <div className="relative overflow-hidden" style={{ height: h }}>
                <img src={prodUrl(t.id, n)} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/c:scale-110" loading="lazy" />
                {p.badge && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[7px] font-black text-white" style={{ backgroundColor: bdgColor(p.badge) }}>{p.badge}</span>}
                <button className="absolute bottom-0 inset-x-0 py-1.5 text-[8px] font-black uppercase text-white flex items-center justify-center gap-1 translate-y-full group-hover/c:translate-y-0 transition-transform" style={{ backgroundColor: t.accent }}>
                  <ShoppingCart className="h-2.5 w-2.5" /> Quick Add
                </button>
              </div>
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-[9px] font-bold leading-tight" style={{ color: t.textPrimary }}>{p.name}</p>
                  <Heart className="h-3 w-3 shrink-0" style={{ color: t.textMuted }} />
                </div>
                <p className="text-[10px] font-black mt-0.5" style={{ color: t.accent }}>₹{p.price}</p>
                <div className="flex gap-1 mt-1">
                  {['#1a1a1a','#f5f0eb','#c9a96e'].map(c => <span key={c} className="h-3 w-3 rounded-full border" style={{ backgroundColor: c, borderColor: dk ? '#444' : '#ddd' }} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* right col: short then tall */}
        <div className="space-y-2">
          {[{ n: 2, h: 100, p: PRODS[1] }, { n: 4, h: 138, p: PRODS[3] }].map(({ n, h, p }) => (
            <div key={n} className="group/c relative overflow-hidden rounded-xl" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
              <div className="relative overflow-hidden" style={{ height: h }}>
                <img src={prodUrl(t.id, n)} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/c:scale-110" loading="lazy" />
                {p.badge && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[7px] font-black text-white" style={{ backgroundColor: bdgColor(p.badge) }}>{p.badge}</span>}
                <button className="absolute bottom-0 inset-x-0 py-1.5 text-[8px] font-black uppercase text-white flex items-center justify-center gap-1 translate-y-full group-hover/c:translate-y-0 transition-transform" style={{ backgroundColor: t.accent }}>
                  <ShoppingCart className="h-2.5 w-2.5" /> Quick Add
                </button>
              </div>
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-[9px] font-bold leading-tight" style={{ color: t.textPrimary }}>{p.name}</p>
                  <Heart className="h-3 w-3 shrink-0" style={{ color: t.textMuted }} />
                </div>
                <p className="text-[10px] font-black mt-0.5" style={{ color: t.accent }}>₹{p.price}</p>
                <div className="flex gap-1 mt-1">
                  {['#0f0f1a','#ff3d6b','#e91e8c'].map(c => <span key={c} className="h-3 w-3 rounded-full border" style={{ backgroundColor: c, borderColor: dk ? '#444' : '#ddd' }} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STICKY CART BOTTOM BAR — unique to Layout 1.2 */}
      <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: t.border, background: dk ? `linear-gradient(to right,${t.surface},${t.bg})` : `linear-gradient(to right,${t.accent}10,${t.surface})` }}>
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-4 w-4" style={{ color: t.accent }} />
          <div>
            <p className="text-[9px] font-black" style={{ color: t.textPrimary }}>3 items in cart</p>
            <p className="text-[8px]" style={{ color: t.textMuted }}>₹6,897 total</p>
          </div>
        </div>
        <button className="px-5 py-2 rounded-xl text-[9px] font-black uppercase text-white" style={{ background: `linear-gradient(135deg,${t.accent},${t.accent}cc)` }}>
          Checkout →
        </button>
      </div>

      {/* MINIMAL SINGLE-ROW FOOTER */}
      <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: t.border, backgroundColor: t.surface }}>
        <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: t.textPrimary }}>
          DRIP<span style={{ color: t.accent }}>.</span>
        </span>
        <div className="flex gap-4">
          {['About','Privacy','Returns','Contact'].map(l => <span key={l} className="text-[7px]" style={{ color: t.textMuted }}>{l}</span>)}
        </div>
        <div className="flex gap-2">
          {['IG','YT','TW'].map(s => (
            <span key={s} className="h-5 w-5 rounded-full flex items-center justify-center text-[7px] font-black" style={{ backgroundColor: t.accent + '20', color: t.accent }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* route to correct preview based on which layout the theme belongs to */
const StorefrontPreview = ({ theme }: { theme: ThemeMeta }) =>
  theme.subLayoutSlug === 'layout-1-1'
    ? <Layout11Preview t={theme} />
    : <Layout12Preview t={theme} />;

/* ── Feature accordion ───────────────────────────────────────────────── */
type FeatureStatus = 'active' | 'coming_soon';
interface Feature { label: string; desc: string; icon: any; status: FeatureStatus; }
interface FeatureGroup { group: string; icon: any; items: Feature[]; }

const FEATURES: FeatureGroup[] = [
  { group: 'Product Discovery', icon: Search, items: [
    { label: 'Full-text product search', desc: 'Live search overlay across title & category', icon: Search, status: 'active' },
    { label: 'Category & price filters', desc: 'Sidebar or pill-based filters by category, price, size, colour', icon: Layers, status: 'active' },
    { label: 'Product image gallery', desc: 'Multi-image carousel with zoom and video support', icon: ImageIcon, status: 'active' },
    { label: 'Variant selector (colour, size)', desc: 'Swatch-based picker with per-variant images', icon: Eye, status: 'active' },
    { label: 'Ratings & reviews', desc: 'Star ratings, review form, verified purchase badge', icon: Star, status: 'active' },
    { label: 'Related products carousel', desc: 'Smart cross-sell on product detail page', icon: Layers, status: 'active' },
    { label: 'AI size recommender', desc: 'Recommends sizes based on measurements & order history', icon: Sparkles, status: 'coming_soon' },
    { label: 'AR virtual try-on', desc: 'Try clothes using phone camera before purchasing', icon: Smartphone, status: 'coming_soon' },
  ]},
  { group: 'Cart & Checkout', icon: ShoppingCart, items: [
    { label: 'Persistent cart', desc: 'Cart saved in localStorage across refreshes', icon: ShoppingCart, status: 'active' },
    { label: 'Coupon & promo codes', desc: 'Manual entry + auto-apply best coupon', icon: Percent, status: 'active' },
    { label: 'Cash on Delivery', desc: 'COD with min/max order and pincode rules', icon: Package, status: 'active' },
    { label: 'Razorpay (UPI, Cards, Net Banking)', desc: 'Secure online payment via Razorpay modal', icon: CreditCard, status: 'active' },
    { label: 'Pincode serviceability', desc: 'Real-time delivery availability via Shiprocket', icon: Truck, status: 'active' },
    { label: 'Saved delivery addresses', desc: 'Customer saves multiple addresses with labels', icon: Globe, status: 'active' },
    { label: 'Buy Now express checkout', desc: 'Skip cart — one-click direct to checkout', icon: Zap, status: 'coming_soon' },
    { label: 'Wallet / store credits', desc: 'Earn and spend loyalty points at checkout', icon: Tag, status: 'coming_soon' },
  ]},
  { group: 'Post-Purchase', icon: Package, items: [
    { label: 'Order confirmation screen', desc: 'Instant confirmation with order number', icon: CheckCircle2, status: 'active' },
    { label: 'Order tracking timeline', desc: 'Step-by-step order status from pending to delivered', icon: Truck, status: 'active' },
    { label: 'AWB / courier tracking', desc: 'Tracking number with courier details', icon: Package, status: 'active' },
    { label: 'Return & exchange requests', desc: 'Customer-initiated returns with status updates', icon: RotateCcw, status: 'active' },
    { label: 'Order email notifications', desc: 'Confirmation & shipping update emails', icon: Bell, status: 'active' },
    { label: 'Invoice download', desc: 'PDF invoice for every delivered order', icon: CreditCard, status: 'active' },
    { label: 'Live shipment map', desc: 'Real-time map showing courier location', icon: Globe, status: 'coming_soon' },
    { label: 'WhatsApp order updates', desc: 'Automated messages via WhatsApp Business API', icon: MessageCircle, status: 'coming_soon' },
  ]},
  { group: 'Customer Account', icon: Users, items: [
    { label: 'Sign-up & login', desc: 'Email/password, Google OAuth and phone OTP', icon: Shield, status: 'active' },
    { label: 'Order history', desc: 'Full list of past orders with filter & search', icon: Package, status: 'active' },
    { label: 'Wishlist', desc: 'Save favourite products, accessible across devices', icon: Heart, status: 'active' },
    { label: 'Support tickets', desc: 'Create and track support requests per order', icon: MessageCircle, status: 'active' },
    { label: 'Profile & address management', desc: 'Edit name, phone, manage multiple addresses', icon: Users, status: 'active' },
    { label: 'Loyalty rewards dashboard', desc: 'View earned points, redeem on future orders', icon: Star, status: 'coming_soon' },
  ]},
  { group: 'Marketing & SEO', icon: Tag, items: [
    { label: 'Promotional ticker', desc: 'Scrolling announcement bar at top of store', icon: Bell, status: 'active' },
    { label: 'Flash sale countdown', desc: 'Timer-based urgency widget on product pages', icon: Clock, status: 'active' },
    { label: 'Share on WhatsApp & social', desc: 'One-tap share buttons on every product page', icon: Share2, status: 'active' },
    { label: 'Blog / content pages', desc: 'SEO-friendly blog and custom landing pages', icon: Globe, status: 'active' },
    { label: 'Product schema markup', desc: 'Auto JSON-LD for Google rich results', icon: BarChart2, status: 'active' },
    { label: 'Custom domain support', desc: 'Store runs at yourbrand.com', icon: Globe, status: 'active' },
    { label: 'AI outfit recommendations', desc: 'AI suggests complete looks based on browsed items', icon: Sparkles, status: 'coming_soon' },
    { label: 'PWA / installable store', desc: 'Add-to-homescreen with offline support', icon: Smartphone, status: 'coming_soon' },
  ]},
];

const FeatureGroupPanel = ({ group }: { group: FeatureGroup }) => {
  const [open, setOpen] = useState(true);
  const active = group.items.filter(f => f.status === 'active').length;
  const soon = group.items.filter(f => f.status === 'coming_soon').length;
  const GIcon = group.icon;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between px-5 py-4 bg-card hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <GIcon className="h-4 w-4 text-primary" />
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
          {group.items.map(feature => {
            const FIcon = feature.icon;
            const isActive = feature.status === 'active';
            return (
              <div key={feature.label} className={cn('flex items-start gap-4 px-5 py-4', isActive ? 'bg-card' : 'bg-muted/20')}>
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5', isActive ? 'bg-emerald-500/10' : 'bg-amber-400/10')}>
                  <FIcon className={cn('h-4 w-4', isActive ? 'text-emerald-500' : 'text-amber-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn('text-sm font-medium', !isActive && 'text-muted-foreground')}>{feature.label}</p>
                    {isActive
                      ? <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-bold text-emerald-600 uppercase tracking-wide"><CheckCircle2 className="h-2.5 w-2.5" /> Active</span>
                      : <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold text-amber-600 uppercase tracking-wide"><Clock className="h-2.5 w-2.5" /> Coming Soon</span>
                    }
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

/* ── Main page ───────────────────────────────────────────────────────── */
const AdminLayoutTheme = () => {
  const { layoutId, subLayoutSlug, themeId } = useParams<{ layoutId: string; subLayoutSlug: string; themeId: string }>();
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

  const totalActive = FEATURES.flatMap(g => g.items).filter(f => f.status === 'active').length;
  const totalSoon   = FEATURES.flatMap(g => g.items).filter(f => f.status === 'coming_soon').length;

  return (
    <div className="space-y-8 pb-24 md:pb-0">

      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link to="/admin/layouts" className="hover:text-foreground transition-colors">Layout Studio</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link to={`/admin/layouts/${theme.layoutId}`} className="hover:text-foreground transition-colors">{theme.layoutName}</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link to={`/admin/layouts/${theme.layoutId}/${theme.subLayoutSlug}`} className="hover:text-foreground transition-colors">{theme.subLayoutName}</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-foreground font-medium">{theme.name}</span>
      </nav>

      {/* hero */}
      <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-8 md:p-10', theme.gradient)}>
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 -left-8 h-36 w-36 rounded-full bg-black/20 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {theme.tags.map(tag => (
                <span key={tag} className="rounded-full bg-white/20 backdrop-blur px-3 py-1 text-[10px] font-bold text-white border border-white/20 uppercase tracking-wider">{tag}</span>
              ))}
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ color: theme.preview === 'dark' ? theme.textPrimary : '#1a1612' }}>{theme.name}</h1>
            <p className="text-sm font-medium max-w-lg leading-relaxed" style={{ color: theme.preview === 'dark' ? '#ffffff90' : '#1a161280' }}>{theme.tagline}</p>
          </div>
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

      {/* description */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground leading-relaxed">{theme.description}</p>
      </div>

      {/* tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        {(['preview', 'features'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize', tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'preview' ? 'Preview' : 'Features'}
          </button>
        ))}
      </div>

      {/* preview tab */}
      {tab === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold">Storefront Preview</h2>
            <span className="text-xs text-muted-foreground">— {theme.subLayoutName} skeleton</span>
          </div>
          <StorefrontPreview theme={theme} />
          <p className="text-xs text-center text-muted-foreground">Representative preview — actual storefront renders with your real products and content.</p>
        </div>
      )}

      {/* features tab */}
      {tab === 'features' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Active</span>
              — Live in this theme
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-amber-600"><Clock className="h-3 w-3" /> Coming Soon</span>
              — In development
            </div>
          </div>
          <div className="space-y-3">
            {FEATURES.map(group => <FeatureGroupPanel key={group.group} group={group} />)}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminLayoutTheme;
