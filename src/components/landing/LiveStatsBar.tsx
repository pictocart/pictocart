import { useEffect, useState } from 'react';
import { Users, Package, ShoppingBag, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  stores_live: number;
  products_listed: number;
  orders_processed: number;
  themes_available: number;
}

/** A row of real-time platform counters. Designed to slot under the hero copy. */
const LiveStatsBar = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [display, setDisplay] = useState<Stats>({
    stores_live: 0, products_listed: 0, orders_processed: 0, themes_available: 0,
  });

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke('get-public-stats')
      .then(({ data }) => {
        if (!cancelled && data) setStats(data as Stats);
      })
      .catch(() => {/* silent — falls back to zeros */});
    return () => { cancelled = true; };
  }, []);

  // Animate counters once data arrives
  useEffect(() => {
    if (!stats) return;
    const duration = 1600;
    const startedAt = performance.now();
    const from = { ...display };
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay({
        stores_live: Math.round(from.stores_live + (stats.stores_live - from.stores_live) * e),
        products_listed: Math.round(from.products_listed + (stats.products_listed - from.products_listed) * e),
        orders_processed: Math.round(from.orders_processed + (stats.orders_processed - from.orders_processed) * e),
        themes_available: Math.round(from.themes_available + (stats.themes_available - from.themes_available) * e),
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  const items = [
    { icon: Users, label: 'Stores Live', value: display.stores_live, color: 'text-emerald-400' },
    { icon: Package, label: 'Products Listed', value: display.products_listed, color: 'text-violet-400' },
    { icon: ShoppingBag, label: 'Orders Processed', value: display.orders_processed, color: 'text-amber-400' },
    { icon: Palette, label: 'Themes Available', value: display.themes_available, color: 'text-sky-400' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center lg:justify-start text-white/70 text-sm">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Live
      </span>
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span>
            <span className="text-white font-bold tabular-nums">{value.toLocaleString('en-IN')}</span>{' '}
            <span className="text-white/60">{label}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

export default LiveStatsBar;
