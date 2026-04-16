import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

interface Props {
  storeId: string;
}

interface OrderItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string | null;
}

const TopProducts = ({ storeId }: Props) => {
  const { data: orders = [] } = useQuery({
    queryKey: ['top-products', storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('items')
        .eq('store_id', storeId);
      return data || [];
    },
  });

  const topProducts = useMemo(() => {
    const map: Record<string, { title: string; image?: string | null; qty: number; revenue: number }> = {};

    orders.forEach((order) => {
      const items = (order.items as unknown as OrderItem[]) || [];
      items.forEach((item) => {
        if (!item.product_id) return;
        if (!map[item.product_id]) {
          map[item.product_id] = { title: item.title, image: item.image, qty: 0, revenue: 0 };
        }
        map[item.product_id].qty += item.quantity || 1;
        map[item.product_id].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        {topProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No sales data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {product.image ? (
                    <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{product.title}</p>
                  <p className="text-xs text-muted-foreground">{product.qty} sold</p>
                </div>
                <span className="text-sm font-semibold text-primary shrink-0">
                  ₹{product.revenue.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopProducts;
