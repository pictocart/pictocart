import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Sparkles, Search, Eye, ArrowRight, Flame, Filter, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SEOHead from '@/components/storefront/SEOHead';
import PicToCartLogo from '@/components/PicToCartLogo';

interface ThemeMaster {
  id: string;
  theme_id: string;
  name: string;
  description: string | null;
  category: string | null;
  preview_image: string | null;
  is_default: boolean | null;
  is_premium: boolean | null;
  price: number | null;
  created_at: string;
}

const CATEGORIES = ['All', 'Fashion', 'Food', 'Electronics', 'Beauty', 'Handcraft', 'Services', 'Books', 'Jewelry', 'Home', 'Other'];
const PRICE_FILTERS = ['All', 'Free', 'Premium'] as const;
const SORTS = ['Trending', 'Newest', 'Price ↑', 'Price ↓'] as const;

const ThemeMarketplace = () => {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [price, setPrice] = useState<typeof PRICE_FILTERS[number]>('All');
  const [sort, setSort] = useState<typeof SORTS[number]>('Trending');

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['marketplace-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_master_projects')
        .select('id, theme_id, name, description, category, preview_image, is_default, is_premium, price, created_at')
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as ThemeMaster[];
    },
  });

  const filtered = useMemo(() => {
    let out = [...themes];
    if (search) {
      const s = search.toLowerCase();
      out = out.filter((t) => t.name.toLowerCase().includes(s) || (t.description || '').toLowerCase().includes(s));
    }
    if (cat !== 'All') {
      out = out.filter((t) => (t.category || '').toLowerCase() === cat.toLowerCase());
    }
    if (price === 'Free') out = out.filter((t) => !t.is_premium);
    if (price === 'Premium') out = out.filter((t) => t.is_premium);

    switch (sort) {
      case 'Newest':
        out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        break;
      case 'Price ↑':
        out.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'Price ↓':
        out.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        out.sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));
    }
    return out;
  }, [themes, search, cat, price, sort]);

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Theme Marketplace — Pic to Cart"
        description="Browse 50+ AI-crafted premium themes built for Indian sellers. Apply with one click and go live in minutes."
        url="https://pictocart.in/marketplace"
      />

      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <PicToCartLogo size={36} />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className="text-slate-600 hover:text-indigo-600 font-medium">Home</Link>
            <Link to="/marketplace" className="text-indigo-600 font-semibold">Marketplace</Link>
            <Link to="/features/source-india" className="text-slate-600 hover:text-indigo-600 font-medium">Features</Link>
          </div>
          <Link to="/auth">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Start Free</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-white py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.4),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.3),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-5">
              <Sparkles className="h-3 w-3" /> Theme Marketplace
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-4">
              Beautiful storefront themes,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">built for Indian sellers.</span>
            </h1>
            <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
              {themes.length}+ AI-crafted 5-page themes across fashion, food, electronics, beauty, services and more. Apply with one tap — go live in minutes.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search themes (e.g., minimal, luxury, restaurant)…"
                className="pl-12 h-14 rounded-2xl bg-white text-slate-900 border-0 shadow-2xl shadow-indigo-900/40"
              />
            </div>

            {/* Quick filter pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {CATEGORIES.slice(0, 9).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    cat === c
                      ? 'bg-white text-indigo-700 border-white'
                      : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sub-filter bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            <span className="font-semibold">{filtered.length}</span>
            <span>{filtered.length === 1 ? 'theme' : 'themes'}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {PRICE_FILTERS.map((p) => (
              <button
                key={p}
                onClick={() => setPrice(p)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  price === p ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
            <span className="h-4 w-px bg-slate-200 mx-2" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof SORTS[number])}
              className="text-xs font-semibold bg-slate-100 border-0 rounded-full px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SORTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400">Loading themes…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="font-semibold">No themes match those filters.</p>
            <button onClick={() => { setSearch(''); setCat('All'); setPrice('All'); }} className="text-indigo-600 hover:underline text-sm mt-2">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filtered.map((t) => (
              <ThemeCard key={t.id} theme={t} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="bg-white border-t border-slate-100 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
            Like one? Sign up and we'll auto-apply it.
          </h2>
          <p className="text-slate-500 mb-6">
            Click any theme above, then "Use This Theme" — onboarding pre-selects it and you go from sign-up to live store in 4 taps.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-base font-bold shadow-lg shadow-emerald-500/30">
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

const ThemeCard = ({ theme }: { theme: ThemeMaster }) => {
  return (
    <Link
      to={`/marketplace/${theme.theme_id}`}
      className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200 hover:shadow-2xl hover:shadow-slate-900/10 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
        {theme.preview_image ? (
          <img
            src={theme.preview_image}
            alt={`${theme.name} theme preview`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-indigo-300" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {theme.is_default && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase">
              <Flame className="h-3 w-3" /> Trending
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          {theme.is_premium ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold shadow">
              <Crown className="h-3 w-3" /> ₹{theme.price}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/95 text-white text-[10px] font-bold">FREE</span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 leading-tight">{theme.name}</h3>
          <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-xs font-semibold text-slate-700">4.8</span>
          </div>
        </div>
        {theme.category && (
          <p className="text-[11px] uppercase tracking-wider text-slate-400 mt-1">{theme.category}</p>
        )}
        {theme.description && (
          <p className="text-sm text-slate-500 mt-2 line-clamp-2">{theme.description}</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <span className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg py-2 group-hover:bg-slate-200 transition">
            <Eye className="h-3.5 w-3.5" /> Preview
          </span>
          <span className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold text-white bg-indigo-600 rounded-lg py-2 group-hover:bg-indigo-700 transition">
            Use this <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ThemeMarketplace;
