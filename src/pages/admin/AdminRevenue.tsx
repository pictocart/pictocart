import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, TrendingUp } from 'lucide-react';

const AdminRevenue = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, created_at, status, payment_status')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const allOrders = orders || [];
      const totalRevenue = allOrders.reduce((s, o) => s + (o.total || 0), 0);
      const paidOrders = allOrders.filter((o) => o.payment_status === 'paid' || o.payment_status === 'cod');
      const paidRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0);

      // Last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = allOrders.filter((o) => new Date(o.created_at) >= sevenDaysAgo);
      const recentRevenue = recent.reduce((s, o) => s + (o.total || 0), 0);

      return {
        totalRevenue,
        paidRevenue,
        commission2: Math.round(totalRevenue * 0.02),
        recentRevenue,
        totalOrders: allOrders.length,
        recentOrders: recent.length,
      };
    },
  });

  const cards = [
    { label: 'Total GMV', value: `₹${(data?.totalRevenue ?? 0).toLocaleString('en-IN')}`, icon: IndianRupee },
    { label: 'Paid Revenue', value: `₹${(data?.paidRevenue ?? 0).toLocaleString('en-IN')}`, icon: IndianRupee },
    { label: 'Platform Commission (2%)', value: `₹${(data?.commission2 ?? 0).toLocaleString('en-IN')}`, icon: TrendingUp },
    { label: 'Last 7 Days GMV', value: `₹${(data?.recentRevenue ?? 0).toLocaleString('en-IN')}`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform-wide revenue and commission tracking</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Orders</span>
                  <p className="text-lg font-bold">{data?.totalOrders ?? 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Orders (Last 7 days)</span>
                  <p className="text-lg font-bold">{data?.recentOrders ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminRevenue;
