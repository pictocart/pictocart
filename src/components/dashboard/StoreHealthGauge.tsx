import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  store: any;
  productCount: number;
  totalRevenue: number;
  hasShipping: boolean;
  hasDomain: boolean;
  hasSeo: boolean;
  hasLogo: boolean;
  hasBlog: boolean;
}

interface Pillar {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number;
  hint: string;
}

const StoreHealthGauge = (p: Props) => {
  const pillars = useMemo<Pillar[]>(() => {
    const catalog = Math.min(100, p.productCount * 10); // 10 products = 100
    const trust = (p.hasLogo ? 40 : 0) + (p.store?.is_published ? 40 : 0) + (p.store?.description ? 20 : 0);
    const settings = (p.hasShipping ? 50 : 0) + (p.hasDomain ? 50 : 0);
    const seo = (p.hasSeo ? 60 : 0) + (p.hasBlog ? 40 : 0);
    const sales = Math.min(100, Math.round(p.totalRevenue / 100)); // ₹10k = 100
    return [
      { key: 'catalog', label: 'Catalog', score: catalog, weight: 0.25, hint: 'Add more products' },
      { key: 'trust', label: 'Trust', score: trust, weight: 0.25, hint: 'Logo + store description' },
      { key: 'settings', label: 'Setup', score: settings, weight: 0.2, hint: 'Shipping + domain' },
      { key: 'seo', label: 'Marketing', score: seo, weight: 0.15, hint: 'SEO + blog posts' },
      { key: 'sales', label: 'Sales', score: sales, weight: 0.15, hint: 'Drive your first orders' },
    ];
  }, [p]);

  const total = Math.round(pillars.reduce((s, x) => s + x.score * x.weight, 0));

  // Animated SVG gauge
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (total / 100) * circ;
  const tone = total >= 75 ? 'text-emerald-500' : total >= 45 ? 'text-amber-500' : 'text-rose-500';

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Store Health Score
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Updated live from your store data</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0">
          <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r={radius} className="stroke-muted" strokeWidth="10" fill="none" />
            <circle
              cx="70" cy="70" r={radius}
              className={cn(tone, 'transition-all duration-1000')}
              strokeWidth="10"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={cn('text-3xl font-bold tabular-nums', tone)}>{total}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</div>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2.5 min-w-0">
          {pillars.map((pl) => (
            <div key={pl.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{pl.label}</span>
                <span className="tabular-nums text-muted-foreground">{pl.score}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-700',
                    pl.score >= 75 ? 'bg-emerald-500' : pl.score >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                  )}
                  style={{ width: `${Math.max(2, pl.score)}%` }}
                />
              </div>
              {pl.score < 60 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">→ {pl.hint}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default StoreHealthGauge;
