import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, TrendingUp, TrendingDown, Package, Users, Sparkles, Receipt } from 'lucide-react';

type PlanRow = { plan: string; price_inr: number; commission_percent: number; display_name: string };

const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const AdminRevenue = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue-pnl'],
    queryFn: async () => {
      const [plansRes, subsRes, ordersRes, storesRes, themePacksRes, themePurchasesRes] = await Promise.all([
        supabase.from('plan_configs').select('plan, price_inr, commission_percent, display_name'),
        supabase.from('subscriptions').select('store_id, plan, status, current_period_end'),
        supabase.from('orders').select('store_id, total, payment_status, created_at'),
        supabase.from('stores').select('id'),
        supabase.from('theme_packs').select('id, name, category, price, sales_count, ai_generation_cost'),
        supabase.from('theme_purchases').select('id, theme_pack_id, purchased_at'),
      ]);

      const plans = (plansRes.data || []) as PlanRow[];
      const planMap = new Map(plans.map((p) => [p.plan, p]));
      const subs = subsRes.data || [];
      const orders = ordersRes.data || [];
      const stores = storesRes.data || [];
      const packs = themePacksRes.data || [];
      const purchases = themePurchasesRes.data || [];

      // ---- MRR: sum of price_inr over paying subs (active/trialing on a paid plan)
      const paying = subs.filter((s) => s.status === 'active' && (planMap.get(s.plan)?.price_inr || 0) > 0);
      const mrr = paying.reduce((acc, s) => acc + (planMap.get(s.plan)?.price_inr || 0), 0);
      const trials = subs.filter((s) => s.status === 'trialing').length;

      // sub breakdown
      const subBreakdown = plans.map((p) => {
        const count = subs.filter((s) => s.plan === p.plan && s.status === 'active').length;
        return { ...p, count, mrr: count * p.price_inr };
      });

      // ---- Commission per-store using each store's subscription plan
      const storePlanMap = new Map<string, string>();
      subs.forEach((s) => storePlanMap.set(s.store_id, s.plan));

      const paidOrders = orders.filter((o) => o.payment_status === 'paid' || o.payment_status === 'cod');
      const gmv = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const paidGmv = paidOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

      let commission = 0;
      paidOrders.forEach((o) => {
        const plan = storePlanMap.get(o.store_id) || 'free';
        const rate = (planMap.get(plan)?.commission_percent ?? 3) / 100;
        commission += (Number(o.total) || 0) * rate;
      });

      // ---- Theme economics
      const themeRevenue = packs.reduce((s: number, p: any) => s + Number(p.price) * Number(p.sales_count || 0), 0);
      const aiCost = packs.reduce((s: number, p: any) => s + Number(p.ai_generation_cost || 0), 0);

      // last 30d
      const since = Date.now() - 30 * 86400000;
      const ordersThisMonth = paidOrders.filter((o) => new Date(o.created_at).getTime() >= since);
      const gmvMonth = ordersThisMonth.reduce((s, o) => s + (Number(o.total) || 0), 0);
      let commissionMonth = 0;
      ordersThisMonth.forEach((o) => {
        const plan = storePlanMap.get(o.store_id) || 'free';
        const rate = (planMap.get(plan)?.commission_percent ?? 3) / 100;
        commissionMonth += (Number(o.total) || 0) * rate;
      });
      const themeRevMonth = purchases
        .filter((p) => new Date(p.purchased_at).getTime() >= since)
        .reduce((sum, p) => {
          const pk: any = packs.find((x: any) => x.id === p.theme_pack_id);
          return sum + (pk ? Number(pk.price) : 0);
        }, 0);

      const grossMonthly = mrr + commissionMonth + themeRevMonth;
      const netMonthly = grossMonthly - aiCost; // AI cost is one-time, conservative
      const grossLifetime = commission + themeRevenue + mrr; // mrr just snapshot
      const netLifetime = grossLifetime - aiCost;

      return {
        plans,
        mrr,
        trials,
        subBreakdown,
        gmv,
        paidGmv,
        commission,
        commissionMonth,
        gmvMonth,
        themeRevenue,
        themeRevMonth,
        aiCost,
        grossMonthly,
        netMonthly,
        grossLifetime,
        netLifetime,
        totalStores: stores.length,
        payingCount: paying.length,
        ordersCount: orders.length,
        packs,
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const headline = [
    { label: 'MRR', value: fmt(data.mrr), sub: `${data.payingCount} paying · ${data.trials} trial`, icon: IndianRupee, accent: 'text-emerald-600' },
    { label: 'Commission (30d)', value: fmt(data.commissionMonth), sub: `GMV ${fmt(data.gmvMonth)}`, icon: Receipt, accent: 'text-blue-600' },
    { label: 'Theme Sales (30d)', value: fmt(data.themeRevMonth), sub: `Lifetime ${fmt(data.themeRevenue)}`, icon: Sparkles, accent: 'text-violet-600' },
    { label: 'AI Cost (lifetime)', value: fmt(data.aiCost), sub: 'Theme generation spend', icon: TrendingDown, accent: 'text-destructive' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue P&amp;L</h1>
        <p className="text-sm text-muted-foreground">Subscriptions, commissions, theme sales and AI cost across the entire platform.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {headline.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.accent}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Net Profit</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <PnlRow label="Gross monthly" value={data.grossMonthly} />
          <PnlRow label="Net monthly (after AI)" value={data.netMonthly} accent />
          <PnlRow label="Gross lifetime" value={data.grossLifetime} muted />
          <PnlRow label="Net lifetime (after AI)" value={data.netLifetime} muted />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Subscription Breakdown</CardTitle>
          <span className="text-xs text-muted-foreground">{data.totalStores} stores total</span>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Stores</TableHead>
                <TableHead className="text-right">Price/mo</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Plan MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subBreakdown.map((p) => (
                <TableRow key={p.plan}>
                  <TableCell><Badge variant="outline" className="capitalize">{p.display_name || p.plan}</Badge></TableCell>
                  <TableCell className="text-right">{p.count}</TableCell>
                  <TableCell className="text-right">{p.price_inr === 0 ? 'Free' : fmt(p.price_inr)}</TableCell>
                  <TableCell className="text-right">{p.commission_percent}%</TableCell>
                  <TableCell className="text-right font-medium">{fmt(p.mrr)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Theme P&amp;L</CardTitle>
        </CardHeader>
        <CardContent>
          {data.packs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No themes published yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Theme</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">AI Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.packs.map((p: any) => {
                  const rev = Number(p.price) * Number(p.sales_count || 0);
                  const cost = Number(p.ai_generation_cost || 0);
                  const profit = rev - cost;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.name} <Badge variant="outline" className="ml-1 text-[10px] capitalize">{p.category}</Badge></TableCell>
                      <TableCell className="text-right">{fmt(p.price)}</TableCell>
                      <TableCell className="text-right">{p.sales_count || 0}</TableCell>
                      <TableCell className="text-right">{fmt(rev)}</TableCell>
                      <TableCell className="text-right">{fmt(cost)}</TableCell>
                      <TableCell className={`text-right font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmt(profit)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PnlRow = ({ label, value, accent, muted }: { label: string; value: number; accent?: boolean; muted?: boolean }) => (
  <div className={`rounded-lg border p-4 ${accent ? 'bg-primary/5 border-primary/30' : ''} ${muted ? 'opacity-80' : ''}`}>
    <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className={`text-2xl font-bold mt-1 ${value < 0 ? 'text-destructive' : accent ? 'text-primary' : ''}`}>
      {fmt(value)}
      {value > 0 && <TrendingUp className="inline h-4 w-4 ml-2 text-emerald-500" />}
    </div>
  </div>
);

export default AdminRevenue;
