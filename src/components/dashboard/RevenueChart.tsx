import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  storeId: string;
}

const RevenueChart = ({ storeId }: Props) => {
  const { data: orders = [] } = useQuery({
    queryKey: ['revenue-chart', storeId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('store_id', storeId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      return data || [];
    },
  });

  const chartData = useMemo(() => {
    const days: Record<string, { date: string; revenue: number; orders: number }> = {};

    // Fill last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = {
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: 0,
        orders: 0,
      };
    }

    orders.forEach((o) => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      if (days[key]) {
        days[key].revenue += Number(o.total) || 0;
        days[key].orders += 1;
      }
    });

    return Object.values(days);
  }, [orders]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue — Last 30 Days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? `₹${value.toLocaleString('en-IN')}` : value,
                  name === 'revenue' ? 'Revenue' : 'Orders',
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
