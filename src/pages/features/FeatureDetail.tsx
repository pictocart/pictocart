import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEOHead from '@/components/storefront/SEOHead';
import { featureCatalog, findFeature, PILLARS, byPillar } from '@/lib/featureCatalog';
import PicToCartLogo from '@/components/PicToCartLogo';

/** Single dynamic feature page. Renders any slug from featureCatalog. */
const FeatureDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const feature = slug ? findFeature(slug) : undefined;

  if (!feature) return <Navigate to="/" replace />;

  const related = byPillar(feature.pillar).filter((f) => f.slug !== feature.slug).slice(0, 4);
  const Icon = feature.icon;

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`${feature.name} — Pic to Cart`}
        description={feature.tagline}
        url={`https://pictocart.in/features/${feature.slug}`}
      />

      {/* Minimal nav (shared marketing chrome lives on /, so we keep this light) */}
      <nav className="border-b border-slate-100 bg-white/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <PicToCartLogo size={36} />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/marketplace" className="hidden sm:inline text-sm font-medium text-slate-600 hover:text-indigo-600">
              Themes
            </Link>
            <Link to="/auth">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Start Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6">
            <ChevronLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-bold tracking-widest uppercase text-indigo-600">{feature.pillar}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500">Feature</span>
          </div>
          <div className="flex items-start gap-4 sm:gap-6 mb-6">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight">
                {feature.name}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 mt-2 max-w-2xl">{feature.tagline}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <Link to={feature.ctaHref || '/auth'}>
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25">
                {feature.cta || 'Try it free'} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-indigo-600">
              See full feature list →
            </Link>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6">What it does</h2>
          <ul className="space-y-4">
            {feature.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
                <span className="text-slate-700 leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>

          {/* Screenshot placeholder — real captures replace this progressively */}
          <div className="mt-12 rounded-3xl overflow-hidden border border-slate-200 bg-gradient-to-br from-indigo-100 via-white to-violet-100 aspect-video flex items-center justify-center relative">
            <div className="text-center px-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md mb-3">
                <Icon className="h-7 w-7 text-indigo-600" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Live screenshot from the merchant dashboard</p>
              <p className="text-xs text-slate-500 mt-1">Coming soon — fresh captures from the portal</p>
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                More in <span className="text-indigo-600">{feature.pillar}</span>
              </h2>
              <Link to="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                All features →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/features/${r.slug}`}
                  className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{r.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.short}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-center text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Sparkles className="h-8 w-8 mx-auto mb-3 text-white/80" />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Ready in 5 minutes</h2>
          <p className="text-white/80 mb-8">Sign up, name your store, pick a category, accept the auto-suggested theme — go live.</p>
          <Link to="/auth">
            <Button size="lg" className="bg-white text-indigo-700 hover:bg-white/90 font-bold px-8 py-6 text-base">
              Create your free store <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default FeatureDetail;
