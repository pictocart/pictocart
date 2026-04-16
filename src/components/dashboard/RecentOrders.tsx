import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface Props {
  storeId: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
};

const RecentOrders = ({ storeId }: Props) => {
  const navigate = useNavigate();

  const { data: orders = [] } = useQuery({
    queryKey: ['recent-orders', storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total, status, payment_status, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No orders yet. Share your store to start receiving orders.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Orders</CardTitle>
        <button
          onClick={() => navigate('/orders')}
          className="text-xs text-primary hover:underline"
        >
          View All
        </button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 text-left font-medium">Order</th>
                <th className="pb-2 text-left font-medium hidden sm:table-cell">Customer</th>
                <th className="pb-2 text-left font-medium">Amount</th>
                <th className="pb-2 text-left font-medium">Status</th>
                <th className="pb-2 text-left font-medium hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 font-medium">{order.order_number}</td>
                  <td className="py-3 hidden sm:table-cell text-muted-foreground">
                    {order.customer_name || '—'}
                  </td>
                  <td className="py-3 font-semibold">₹{Number(order.total || 0).toLocaleString('en-IN')}</td>
                  <td className="py-3">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[order.status || 'pending'] || ''}`}>
                      {order.status || 'pending'}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground hidden md:table-cell">
                    {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentOrders;
