import { useNavigate } from 'react-router-dom';
import { Layers, ChevronRight, Shirt, Sparkles, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const layouts = [
  {
    id: 'layout-1',
    name: 'Layout 1',
    subtitle: 'Fashion & Apparel Collection',
    description:
      'A premium clothing-first layout system built for modern fashion brands. Choose from two distinct sub-layouts — each crafted with full e-commerce feature parity and bespoke visual identities.',
    icon: Shirt,
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    badge: 'Clothing',
    subLayouts: 2,
    themes: 4,
    status: 'active',
    tags: ['Fashion', 'Apparel', 'Luxury', 'Minimal'],
  },
];

const AdminLayouts = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Layout Studio</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Curated storefront layout collections. Each layout ships with industry-grade sub-layouts and
          themes designed for specific verticals.
        </p>
      </div>

      {/* Layout grid */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {layouts.map((layout) => {
          const Icon = layout.icon;
          return (
            <button
              key={layout.id}
              onClick={() => navigate(`/admin/layouts/${layout.id}`)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* Gradient hero */}
              <div
                className={cn(
                  'relative h-44 w-full bg-gradient-to-br flex items-end p-5',
                  layout.gradient
                )}
              >
                {/* Background decorative circles */}
                <div className="absolute top-4 right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-black/20 blur-3xl" />

                {/* Icon */}
                <div className="absolute top-5 left-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Status badge */}
                {layout.status === 'active' ? (
                  <span className="absolute top-5 right-5 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-semibold text-white uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="absolute top-5 right-5 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white uppercase tracking-wider">
                    <Lock className="h-2.5 w-2.5" />
                    Soon
                  </span>
                )}

                {/* Bottom left — name */}
                <div>
                  <p className="text-xs font-medium text-white/70 uppercase tracking-widest mb-0.5">
                    {layout.badge}
                  </p>
                  <h2 className="text-2xl font-bold text-white">{layout.name}</h2>
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 space-y-4">
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {layout.subtitle}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {layout.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {layout.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-base font-bold text-foreground">{layout.subLayouts}</p>
                      <p className="text-[10px] text-muted-foreground">Sub-layouts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-foreground">{layout.themes}</p>
                      <p className="text-[10px] text-muted-foreground">Themes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                    Explore <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Hover shimmer */}
              <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-300 pointer-events-none" />
            </button>
          );
        })}

        {/* Coming Soon placeholder cards */}
        {[
          { name: 'Layout 2', subtitle: 'Electronics & Tech', gradient: 'from-slate-700 via-slate-800 to-zinc-900' },
          { name: 'Layout 3', subtitle: 'Food & Grocery', gradient: 'from-emerald-600 via-green-600 to-teal-700' },
        ].map((placeholder) => (
          <div
            key={placeholder.name}
            className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card/60 opacity-60 cursor-not-allowed select-none"
          >
            <div className={cn('h-44 w-full bg-gradient-to-br flex items-end p-5 opacity-40', placeholder.gradient)}>
              <div>
                <p className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Coming Soon</p>
                <h2 className="text-2xl font-bold text-white">{placeholder.name}</h2>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm font-semibold text-muted-foreground">{placeholder.subtitle}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/60">
                <Sparkles className="h-3.5 w-3.5" />
                In development
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLayouts;
