import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { useProducts } from '@/hooks/useProducts';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  IndianRupee, ShoppingCart, TrendingUp, Package, ExternalLink, Copy, Check,
  CheckCircle2, Circle, ArrowRight, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { useLowStockNotifications } from '@/hooks/useLowStockNotifications';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import RevenueChart from '@/components/dashboard/RevenueChart';
import TopProducts from '@/components/dashboard/TopProducts';
import RecentOrders from '@/components/dashboard/RecentOrders';
import ProvisioningStatus from '@/components/dashboard/ProvisioningStatus';
import WeeklyDigest from '@/components/dashboard/WeeklyDigest';
import AbandonedCartBanner from '@/components/dashboard/AbandonedCartBanner';
import PremiumThemePendingCard from '@/components/dashboard/PremiumThemePendingCard';
import { ThemeUpdateBanner } from '@/components/ThemeUpdateBanner';
import WalletCard from '@/components/dashboard/WalletCard';
import HeroGreeting from '@/components/dashboard/HeroGreeting';
import SmartActions from '@/components/dashboard/SmartActions';
import StoreHealthGauge from '@/components/dashboard/StoreHealthGauge';
import StatCard from '@/components/ui/StatCard';

const Dashboard = () => {
  const { user } = useAuth();
  const { store, loading } = useStore();
  const { products } = useProducts();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  useOrderNotifications(store?.id);
  useLowStockNotifications();

  const { stats } = useDashboardStats(store?.id);

  useEffect(() => {
    if (!loading && !store) {
      const isCustomer = user?.user_metadata?.is_customer === true;
      if (!isCustomer) navigate('/onboarding', { replace: true });
    }
  }, [loading, store, navigate, user]);

  const settings = (store?.settings as any) || {};

  const lowStockCount = useMemo(
    () => products.filter((p: any) => typeof p.inventory_count === 'number' && p.inventory_count > 0 && p.inventory_count <= 5).length,
    [products]
  );

  const checklist = useMemo(() => {
    if (!store) return [];
    return [
      { label: 'Store name set', done: !!store.name, link: '/customise' },
      { label: 'Category selected', done: !!store.category, link: '/customise' },
      { label: 'Logo uploaded', done: !!store.logo_url, link: '/customise' },
      { label: 'First product added', done: products.length > 0, link: '/products/new' },
      { label: 'Set up shipping', done: !!settings.shipping_enabled, link: '/settings/shipping' },
      { label: 'Connect custom domain', done: !!settings.custom_domain, link: '/settings/domain' },
      { label: 'Configure SEO', done: !!settings.seo_title, link: '/settings/seo' },
      { label: 'Write a blog post', done: false, link: '/blog-posts/new' },
    ];
  }, [store, products, settings]);

  const completedCount = checklist.filter((c) => c.done).length;
  const completionPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const storeUrl = store?.slug ? `${window.location.origin}/store/${store.slug}` : '';
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success('Store URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative space-y-6 pb-20 md:pb-0">
      {/* Soft mesh background */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-50 dark:opacity-30"
        style={{
          background:
            'radial-gradient(60% 40% at 10% 0%, hsl(var(--primary) / 0.08), transparent 60%), radial-gradient(40% 30% at 90% 10%, hsl(220 90% 60% / 0.06), transparent 60%)',
        }}
      />

      <ProvisioningStatus />
      <PremiumThemePendingCard />

      {/* Hero greeting */}
      <HeroGreeting
        todayRevenue={stats.todayRevenue}
        todayOrders={stats.todayCount}
        pendingOrders={stats.pendingCount}
        storeName={store?.name}
      />

      {/* View store / copy url ribbon */}
      {store?.is_published && storeUrl && (
        <Card data-tour="dash-view-store" className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-background">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3.5 px-4">
            <div className="min-w-0 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Your store is live at</p>
                <p className="text-sm font-mono font-semibold truncate text-emerald-700 dark:text-emerald-400">{storeUrl}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleCopyUrl} className="gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button size="sm" onClick={() => window.open(`/store/${store.slug}`, '_blank')} className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> View
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart contextual actions */}
      <div data-tour="smart-actions">
        <SmartActions
          pendingOrders={stats.pendingCount}
          productCount={products.length}
          lowStockCount={lowStockCount}
          hasCustomDomain={!!settings.custom_domain}
          hasShipping={!!settings.shipping_enabled}
          isPublished={!!store?.is_published}
        />
      </div>

      {/* AI Wallet */}
      <div data-tour="wallet-card"><WalletCard /></div>

      {/* KPI grid */}
      <div data-tour="kpi-grid" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={stats.todayRevenue}
          prefix="₹"
          format="inr"
          icon={IndianRupee}
          tone="emerald"
          deltaPct={stats.revenueDeltaPct}
          series={stats.last7Revenue}
        />
        <StatCard
          label="Today's Orders"
          value={stats.todayCount}
          icon={ShoppingCart}
          tone="indigo"
          deltaPct={stats.ordersDeltaPct}
          series={stats.last7Orders}
        />
        <StatCard
          label="Avg Order Value"
          value={stats.aov}
          prefix="₹"
          format="inr"
          icon={Receipt}
          tone="amber"
        />
        <StatCard
          label="Pending Orders"
          value={stats.pendingCount}
          icon={Package}
          tone={stats.pendingCount > 0 ? 'rose' : 'primary'}
        />
      </div>

      {/* Charts row */}
      {store?.id && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RevenueChart storeId={store.id} data={stats.last30Days} />
          </div>
          <div className="lg:col-span-2">
            <TopProducts storeId={store.id} />
          </div>
        </div>
      )}

      {/* Health gauge */}
      <StoreHealthGauge
        store={store}
        productCount={products.length}
        totalRevenue={stats.totalRevenue}
        hasShipping={!!settings.shipping_enabled}
        hasDomain={!!settings.custom_domain}
        hasSeo={!!settings.seo_title}
        hasLogo={!!store?.logo_url}
        hasBlog={false}
      />

      <ThemeUpdateBanner />
      {store?.id && <AbandonedCartBanner storeId={store.id} />}
      {store?.id && <WeeklyDigest storeId={store.id} />}
      {store?.id && <RecentOrders storeId={store.id} />}

      {/* Setup checklist */}
      {completionPct < 100 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Store Setup Progress
              </CardTitle>
              <span className="text-sm font-semibold text-primary tabular-nums">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-2 mt-2" />
          </CardHeader>
          <CardContent className="grid gap-1.5 sm:grid-cols-2">
            {checklist.map((item) => (
              <button
                key={item.label}
                onClick={() => !item.done && navigate(item.link)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors text-sm border border-transparent',
                  item.done
                    ? 'text-muted-foreground'
                    : 'hover:bg-accent hover:border-border cursor-pointer'
                )}
                disabled={item.done}
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={cn('truncate', item.done && 'line-through')}>{item.label}</span>
                {!item.done && <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />}
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
            <Button className="mt-4" onClick={() => navigate('/products/new')}>Add Product</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
