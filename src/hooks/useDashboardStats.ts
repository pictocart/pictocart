import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DayBucket {
  date: string;       // 'YYYY-MM-DD'
  label: string;      // '5 May'
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  todayCount: number;
  todayRevenue: number;
  totalCount: number;
  totalRevenue: number;
  pendingCount: number;
  aov: number;                // Average order value (last 30d)
  cvrSeries: number[];        // sparkline placeholder
  last30Days: DayBucket[];
  last7Revenue: number[];     // for sparklines
  last7Orders: number[];
  prev7Revenue: number;
  curr7Revenue: number;
  revenueDeltaPct: number;
  ordersDeltaPct: number;
}

const EMPTY: DashboardStats = {
  todayCount: 0, todayRevenue: 0, totalCount: 0, totalRevenue: 0, pendingCount: 0,
  aov: 0, cvrSeries: [], last30Days: [],
  last7Revenue: [], last7Orders: [],
  prev7Revenue: 0, curr7Revenue: 0,
  revenueDeltaPct: 0, ordersDeltaPct: 0,
};

/**
 * Single source of truth for dashboard order metrics.
 * Replaces duplicate queries previously in Dashboard.tsx and RevenueChart.tsx.
 */
export const useDashboardStats = (storeId?: string) => {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['dashboard-orders', storeId],
    enabled: !!storeId,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('total, status, payment_status, created_at')
        .eq('store_id', storeId!)
        .order('created_at', { ascending: true });
      return data || [];
    },
  });

  const stats = useMemo<DashboardStats>(() => {
    if (!orders.length) return EMPTY;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thirty = new Date(); thirty.setDate(thirty.getDate() - 29); thirty.setHours(0, 0, 0, 0);
    const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 6); sevenAgo.setHours(0, 0, 0, 0);
    const fourteenAgo = new Date(); fourteenAgo.setDate(fourteenAgo.getDate() - 13); fourteenAgo.setHours(0, 0, 0, 0);

    // 30-day buckets
    const days: Record<string, DayBucket> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      days[key] = {
        date: key,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: 0,
        orders: 0,
      };
    }

    let todayCount = 0, todayRevenue = 0, pendingCount = 0;
    let totalRevenue = 0;
    let curr7Revenue = 0, prev7Revenue = 0;
    let curr7Orders = 0, prev7Orders = 0;
    let revenue30 = 0, count30 = 0;

    for (const o of orders) {
      const total = Number(o.total) || 0;
      const created = new Date(o.created_at);
      // Revenue counts only paid orders (online gateway, COD marked paid, or
      // offline cash/UPI/card collected at counter). Pending/unpaid orders
      // are excluded so the dashboard updates the moment payment is received.
      const isPaid = (o as any).payment_status === 'paid';
      const revenueAmt = isPaid ? total : 0;
      totalRevenue += revenueAmt;
      if (o.status === 'pending') pendingCount += 1;
      if (created >= today) { todayCount += 1; todayRevenue += revenueAmt; }

      const key = created.toISOString().slice(0, 10);
      if (days[key]) { days[key].revenue += revenueAmt; days[key].orders += 1; revenue30 += revenueAmt; count30 += 1; }

      if (created >= sevenAgo) { curr7Revenue += revenueAmt; curr7Orders += 1; }
      else if (created >= fourteenAgo) { prev7Revenue += revenueAmt; prev7Orders += 1; }
    }

    const last30Days = Object.values(days);
    const last7Revenue = last30Days.slice(-7).map((d) => d.revenue);
    const last7Orders = last30Days.slice(-7).map((d) => d.orders);

    const aov = count30 > 0 ? Math.round(revenue30 / count30) : 0;
    const revenueDeltaPct = prev7Revenue > 0 ? Math.round(((curr7Revenue - prev7Revenue) / prev7Revenue) * 100) : (curr7Revenue > 0 ? 100 : 0);
    const ordersDeltaPct = prev7Orders > 0 ? Math.round(((curr7Orders - prev7Orders) / prev7Orders) * 100) : (curr7Orders > 0 ? 100 : 0);

    return {
      todayCount, todayRevenue,
      totalCount: orders.length,
      totalRevenue,
      pendingCount,
      aov,
      cvrSeries: [],
      last30Days,
      last7Revenue, last7Orders,
      prev7Revenue, curr7Revenue,
      revenueDeltaPct, ordersDeltaPct,
    };
  }, [orders]);

  return { stats, loading: isLoading };
};
