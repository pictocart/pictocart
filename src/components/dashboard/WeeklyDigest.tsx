import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { storeId: string }

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const Delta = ({ curr, prev }: { curr: number; prev: number }) => {
  if (prev === 0 && curr === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const pct = prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-emerald-600' : 'text-red-600')}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
};

const WeeklyDigest = ({ storeId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['weekly-digest', storeId],
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

  if (isLoading || !data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            This week
          </CardTitle>
          <Badge variant="outline" className="text-xs">Last 7 days</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Revenue</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold">{fmtINR(data.revenue)}</span>
              <Delta curr={data.revenue} prev={data.revenuePrev} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Orders</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold">{data.orders}</span>
              <Delta curr={data.orders} prev={data.ordersPrev} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Visitors</p>
            <span className="text-lg font-bold">{data.views.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Conversion</p>
            <span className="text-lg font-bold">{data.cvr.toFixed(1)}%</span>
          </div>
        </div>
        {data.topProductName && (
          <div className="rounded-lg bg-accent/50 px-3 py-2.5 text-sm">
            🏆 <span className="font-medium">{data.topProductName}</span>
            <span className="text-muted-foreground"> — top seller ({data.topProductQty} sold)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyDigest;
