import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { featureCatalog } from '@/lib/featureCatalog';

/** Bento grid of every shipping capability. Slugs match featureCatalog. */
const HIGHLIGHTS = [
  'source-india', 'snap-to-product', 'theme-marketplace',
  'whatsapp-share', 'custom-domain', 'payments',
  'shipping', 'gst-invoices', 'coupons',
  'reviews', 'blog-seo', 'ai-engagement',
];

const EverySolutionGrid = () => {
  const items = HIGHLIGHTS.map((s) => featureCatalog.find((f) => f.slug === s)!).filter(Boolean);

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-white via-indigo-50/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-violet-50 text-violet-600 text-sm font-semibold mb-4">
            Every Solution, One Platform
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 max-w-3xl mx-auto leading-tight">
            Now <em className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">what to sell</em> and <em className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">where to sell</em> — we have a solution for both.
          </h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
            From sourcing verified manufacturers to GST invoices, we ship every tool a modern Indian seller needs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {items.map((f, i) => (
            <Link
              key={f.slug}
              to={`/features/${f.slug}`}
              className="group relative rounded-2xl bg-white border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Highlight pill for Source India */}
              {f.slug === 'source-india' && (
                <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold tracking-wide shadow">
                  NEW
                </span>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-sm leading-tight">{f.name}</h3>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">{f.pillar}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">{f.short}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                Learn more <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/features/source-india"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-indigo-600"
          >
            See the full feature catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default EverySolutionGrid;
