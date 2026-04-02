import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { useProducts } from '@/hooks/useProducts';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IndianRupee, ShoppingCart, TrendingUp, Package, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user } = useAuth();
  const { store, loading } = useStore();
  const { products, loading: productsLoading } = useProducts();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: orderStats } = useQuery({
    queryKey: ['order-stats', store?.id],
    queryFn: async () => {
      if (!store?.id) return { count: 0, revenue: 0 };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('orders')
        .select('total')
        .eq('store_id', store.id)
        .gte('created_at', today.toISOString());
      if (error) throw error;
      return {
        count: data.length,
        revenue: data.reduce((sum, o) => sum + (o.total || 0), 0),
      };
    },
    enabled: !!store?.id,
  });

  useEffect(() => {
    if (!loading && (!store || (store.onboarding_step !== null && store.onboarding_step < 7))) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, store, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const stats = [
    { label: "Today's Sales", value: `₹${orderStats?.revenue ?? 0}`, icon: IndianRupee, change: '' },
    { label: 'Orders', value: String(orderStats?.count ?? 0), icon: ShoppingCart, change: '' },
    { label: 'Conversion', value: '0%', icon: TrendingUp, change: '' },
    { label: 'Products', value: String(products.length), icon: Package, change: '' },
  ];

  const storeUrl = store?.slug ? `${window.location.origin}/store/${store.slug}` : '';


  const handleCopyUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success('Store URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
          </p>
        </div>
        {store?.is_published && (
          <Button
            onClick={() => window.open(`/store/${store.slug}`, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" /> View Store
          </Button>
        )}
      </div>

      {/* Store URL Banner */}
      {store?.is_published && storeUrl && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your store is live at</p>
              <p className="text-sm font-mono font-semibold truncate text-primary">{storeUrl}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyUrl} className="shrink-0 gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy URL'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Package className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Add your first product</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Upload a product image and let AI generate all the details automatically.
            </p>
            <Button className="mt-4" onClick={() => navigate('/products/new')}>
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No orders yet. Share your store to start receiving orders.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
