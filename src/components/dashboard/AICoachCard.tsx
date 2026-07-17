import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Loader2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { storeId: string }

const AICoachCard = ({ storeId }: Props) => {
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { data } = useQuery({
    queryKey: ['coach-digest', storeId],
    queryFn: async () => {
      const now = new Date();
      const w1Start = new Date(now.getTime() - 7 * 86400000).toISOString();
      const w2Start = new Date(now.getTime() - 14 * 86400000).toISOString();

      const [{ data: thisWeek }, { data: lastWeek }, { data: events }] = await Promise.all([
        supabase.from('orders').select('total, items, created_at').eq('store_id', storeId).gte('created_at', w1Start),
        supabase.from('orders').select('total, created_at').eq('store_id', storeId).gte('created_at', w2Start).lt('created_at', w1Start),
        supabase.from('analytics_events').select('event_type, product_id').eq('store_id', storeId).gte('created_at', w1Start),
      ]);

      const tw = thisWeek || [], lw = lastWeek || [], ev = events || [];
      const revThis = tw.reduce((s, o) => s + Number(o.total || 0), 0);
      const revLast = lw.reduce((s, o) => s + Number(o.total || 0), 0);

      const views = ev.filter(e => e.event_type === 'product_view').length;
      const carts = ev.filter(e => e.event_type === 'add_to_cart').length;
      const purchases = ev.filter(e => e.event_type === 'purchase').length;
      const cvr = views > 0 ? (purchases / views) * 100 : 0;

      // Top product by orders
      const productCounts = new Map<string, number>();
      tw.forEach(o => {
        ((o.items as any[]) || []).forEach((it: any) => {
          const id = it.product_id || it.id;
          if (id) productCounts.set(id, (productCounts.get(id) || 0) + (it.quantity || 1));
        });
      });
      let topProductId: string | null = null, topQty = 0;
      productCounts.forEach((q, id) => { if (q > topQty) { topQty = q; topProductId = id; } });
      let topProductName: string | null = null;
      if (topProductId) {
        const { data: p } = await supabase.from('products').select('title').eq('id', topProductId).maybeSingle();
        topProductName = p?.title || null;
      }

      return {
        revenue: revThis, revenuePrev: revLast,
        orders: tw.length, ordersPrev: lw.length,
        views, carts, cvr,
        topProductName, topProductQty: topQty,
      };
    },
    enabled: !!storeId,
  });

  const fetchInsight = async (force = false) => {
    if (!storeId || !data) return;

    const cacheKey = `insight_store_${storeId}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          if (age < 24 * 60 * 60 * 1000) { // 24 hours
            setInsight(parsed.insight);
            return;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    setLoadingInsight(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('generate-dashboard-insights', {
        body: {
          store_id: storeId,
          revenue: data.revenue,
          revenuePrev: data.revenuePrev,
          orders: data.orders,
          ordersPrev: data.ordersPrev,
          views: data.views,
          carts: data.carts,
          cvr: data.cvr,
          topProductName: data.topProductName,
          topProductQty: data.topProductQty,
        },
      });
      if (error) throw new Error(error.message);
      if (res?.insight) {
        setInsight(res.insight);
        localStorage.setItem(cacheKey, JSON.stringify({
          insight: res.insight,
          timestamp: Date.now()
        }));
      }
    } catch (e) {
      console.error('Failed to load AI insight', e);
      if (!insight) {
        setInsight('• Apne active products ko directly WhatsApp par share karein customer traffic badhane ke liye.\n• Checkout page par active discounts promote karein taaki cart abandonment rate kam ho sake.');
      }
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    if (data) {
      fetchInsight();
    }
  }, [storeId, !!data]);

  return (
    <Card className="border-2 border-violet-500/30 bg-gradient-to-r from-violet-600/10 via-indigo-600/5 to-transparent shadow-lg overflow-hidden relative">
      <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600 animate-pulse" />
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              AI Business Coach
            </CardTitle>
            <p className="text-xs text-muted-foreground">Personalized strategy checklist to grow your sales</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
          onClick={() => fetchInsight(true)}
          disabled={loadingInsight || !data}
        >
          <RefreshCw className={cn("h-4 w-4", loadingInsight && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {loadingInsight || !data ? (
          <div className="flex items-center gap-3 text-sm text-slate-500 py-6">
            <Loader2 className="h-4 w-4 animate-spin text-violet-600 shrink-0" />
            <span>Analyzing your weekly performance matrix and drafting sales tactics...</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {insight.split('\n').filter(line => line.trim()).map((tip, i) => {
              const cleanTip = tip.replace(/^[•\-\*\s]+/, '').trim();
              return (
                <div key={i} className="flex items-start gap-2.5 bg-white/80 dark:bg-slate-900/60 p-3 rounded-lg border border-violet-50/50 shadow-sm">
                  <div className="h-5 w-5 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 shrink-0 mt-0.5">
                    <Lightbulb className="h-3 w-3" />
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                    {cleanTip}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AICoachCard;
