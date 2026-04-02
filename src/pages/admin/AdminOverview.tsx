import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Users, IndianRupee, Package, TrendingUp, ShoppingCart } from 'lucide-react';

const AdminOverview = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [storesRes, productsRes, ordersRes, usersRes] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      const totalRevenue = (ordersRes.data || []).reduce((s, o) => s + (o.total || 0), 0);

      return {
        stores: storesRes.count || 0,
        products: productsRes.count || 0,
        orders: ordersRes.data?.length || 0,
        users: usersRes.count || 0,
        revenue: totalRevenue,
      };
    },
  });

  const cards = [
    { label: 'Total Stores', value: stats?.stores ?? 0, icon: Store, color: 'text-primary' },
    { label: 'Total Users', value: stats?.users ?? 0, icon: Users, color: 'text-blue-500' },
    { label: 'Total Orders', value: stats?.orders ?? 0, icon: ShoppingCart, color: 'text-green-500' },
    { label: 'Total Products', value: stats?.products ?? 0, icon: Package, color: 'text-purple-500' },
    { label: 'Platform Revenue', value: `₹${(stats?.revenue ?? 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-amber-500' },
    { label: 'Commission (2%)', value: `₹${Math.round((stats?.revenue ?? 0) * 0.02).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">Monitor your entire platform at a glance</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
