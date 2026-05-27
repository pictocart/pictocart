import { Link, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Crown, ChevronLeft, Eye, ArrowRight, Check, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEOHead from '@/components/storefront/SEOHead';
import PicToCartLogo from '@/components/PicToCartLogo';

const ThemeDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: theme, isLoading } = useQuery({
    queryKey: ['marketplace-theme', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_master_projects')
        .select('*')
        .eq('theme_id', slug!)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading theme…</div>;
  }
  if (!theme) return <Navigate to="/marketplace" replace />;

  const features = [
    'Mobile-first design',
    'Full 5-page layout (Home, Category, Product, Cart, Checkout)',
    'Drag-and-drop section editor',
    'Customisable colours, fonts and banners',
    'SEO-optimised with structured data',
    'PWA-ready with offline support',
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`${theme.name} — Theme Marketplace | Pic to Cart`}
        description={theme.description || `Premium storefront theme for Indian sellers. Apply in one click.`}
        url={`https://pictocart.in/marketplace/${theme.theme_id}`}
        ogImage={theme.preview_image || undefined}
      />

      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><PicToCartLogo size={36} /></Link>
          <Link to="/marketplace" className="text-sm font-medium text-slate-600 hover:text-indigo-600 inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to marketplace
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {theme.is_default && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase">Trending</span>
              )}
              {theme.is_premium ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold">
                  <Crown className="h-3 w-3" /> Premium · ₹{theme.price}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">FREE</span>
              )}
              {theme.category && (
                <span className="text-[11px] uppercase tracking-wider text-slate-500">{theme.category}</span>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">{theme.name}</h1>
            <p className="text-slate-600 text-lg mb-6 leading-relaxed">
              {theme.description || 'A premium AI-crafted 5-page storefront, ready to apply with one click.'}
            </p>
            <div className="flex items-center gap-3 mb-8 text-sm text-slate-500">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <span className="text-slate-700 font-semibold">4.8</span>
              <span>·</span>
              <span>120+ sellers using it</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={`/auth?theme=${theme.theme_id}`} className="flex-1">
                <Button size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 shadow-lg shadow-indigo-500/30">
                  Use this theme <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href={`/admin/themes/preview-live/${theme.theme_id}`} target="_blank" rel="noreferrer" className="flex-1">
                <Button size="lg" variant="outline" className="w-full py-6 font-semibold">
                  <Eye className="mr-2 h-4 w-4" /> Live preview
                </Button>
              </a>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              {theme.is_premium
                ? `14-day free trial — pay ₹${theme.price} only if you keep it after.`
                : 'Free forever. No card required.'}
            </p>
          </div>

          {/* Preview image */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-2xl shadow-slate-900/20 bg-white">
              {theme.preview_image ? (
                <img src={theme.preview_image} alt={`${theme.name} preview`} className="w-full h-auto" />
              ) : (
                <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-indigo-100 to-violet-100">
                  <Sparkles className="h-12 w-12 text-indigo-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-8">What's included</h2>
          <ul className="grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
                <span className="text-slate-700 text-sm leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Like it? Apply it in one tap.</h2>
          <p className="text-white/80 mb-8">Sign up free — the {theme.name} theme is auto-selected in your onboarding.</p>
          <Link to={`/auth?theme=${theme.theme_id}`}>
            <Button size="lg" className="bg-white text-indigo-700 hover:bg-white/90 font-bold px-8 py-6 text-base">
              Use this theme <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ThemeDetail;
