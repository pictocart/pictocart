import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { useProducts } from '@/hooks/useProducts';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  IndianRupee, ShoppingCart, TrendingUp, Package, ExternalLink, Copy, Check,
  CheckCircle2, Circle, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import RevenueChart from '@/components/dashboard/RevenueChart';
import TopProducts from '@/components/dashboard/TopProducts';
import RecentOrders from '@/components/dashboard/RecentOrders';
import ProvisioningStatus from '@/components/dashboard/ProvisioningStatus';
import WeeklyDigest from '@/components/dashboard/WeeklyDigest';
import AbandonedCartBanner from '@/components/dashboard/AbandonedCartBanner';
import { ThemeUpdateBanner } from '@/components/ThemeUpdateBanner';

const Dashboard = () => {
  const { user } = useAuth();
  const { store, loading } = useStore();
  const { products, loading: productsLoading } = useProducts();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  useOrderNotifications(store?.id);

  // All-time + today stats
  const { data: orderStats } = useQuery({
    queryKey: ['dashboard-stats', store?.id],
    queryFn: async () => {
      if (!store?.id) return { todayCount: 0, todayRevenue: 0, totalCount: 0, totalRevenue: 0, pendingCount: 0 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: allOrders } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .eq('store_id', store.id);

      const orders = allOrders || [];
      const todayOrders = orders.filter(o => new Date(o.created_at) >= today);

      return {
        todayCount: todayOrders.length,
        todayRevenue: todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
        totalCount: orders.length,
        totalRevenue: orders.reduce((s, o) => s + (Number(o.total) || 0), 0),
        pendingCount: orders.filter(o => o.status === 'pending').length,
      };
    },
    enabled: !!store?.id,
  });

  useEffect(() => {
    if (!loading && !store) {
      const isCustomer = user?.user_metadata?.is_customer === true;
      if (!isCustomer) {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [loading, store, navigate, user]);

  const checklist = useMemo(() => {
    if (!store) return [];
    const settings = (store.settings as any) || {};
    return [
      { label: 'Store name set', done: !!store.name, link: '/store-design' },
      { label: 'Category selected', done: !!store.category, link: '/store-design' },
      { label: 'Logo uploaded', done: !!store.logo_url, link: '/store-design' },
      { label: 'First product added', done: products.length > 0, link: '/products/new' },
      { label: 'Set up shipping', done: !!settings.shipping_enabled, link: '/settings/shipping' },
      { label: 'Connect custom domain', done: !!settings.custom_domain, link: '/settings/domain' },
      { label: 'Configure SEO', done: !!settings.seo_title, link: '/settings/seo' },
      { label: 'Write a blog post', done: false, link: '/blog-posts/new' },
    ];
  }, [store, products]);

  const completedCount = checklist.filter((c) => c.done).length;
  const completionPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const stats = [
    { label: "Today's Revenue", value: `₹${(orderStats?.todayRevenue ?? 0).toLocaleString('en-IN')}`, icon: IndianRupee },
    { label: "Today's Orders", value: String(orderStats?.todayCount ?? 0), icon: ShoppingCart },
    { label: 'Total Revenue', value: `₹${(orderStats?.totalRevenue ?? 0).toLocaleString('en-IN')}`, icon: TrendingUp },
    { label: 'Pending Orders', value: String(orderStats?.pendingCount ?? 0), icon: Package },
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
      <ProvisioningStatus />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
          </p>
        </div>
        {store?.is_published && (
          <Button onClick={() => window.open(`/store/${store.slug}`, '_blank')} className="gap-2">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      {store?.id && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RevenueChart storeId={store.id} />
          </div>
          <div className="lg:col-span-2">
            <TopProducts storeId={store.id} />
          </div>
        </div>
      )}

      {/* Theme update notification */}
      <ThemeUpdateBanner />

      {/* Abandoned Cart Insight */}
      {store?.id && <AbandonedCartBanner storeId={store.id} />}

      {/* Weekly Digest */}
      {store?.id && <WeeklyDigest storeId={store.id} />}

      {/* Recent Orders */}
      {store?.id && <RecentOrders storeId={store.id} />}

      {/* Completion Checklist */}
      {completionPct < 100 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Store Setup Progress</CardTitle>
              <span className="text-sm font-semibold text-primary">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-2 mt-2" />
          </CardHeader>
          <CardContent className="grid gap-2">
            {checklist.map((item) => (
              <button
                key={item.label}
                onClick={() => !item.done && navigate(item.link)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors text-sm',
                  item.done ? 'text-muted-foreground' : 'hover:bg-accent cursor-pointer'
                )}
                disabled={item.done}
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={cn(item.done && 'line-through')}>{item.label}</span>
                {!item.done && <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {products.length === 0 && (
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
      )}
    </div>
  );
};

export default Dashboard;
