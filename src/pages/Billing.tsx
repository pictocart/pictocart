import { useState } from 'react';
import { useSubscription, PLAN_LIMITS } from '@/hooks/useSubscription';
import { useStore } from '@/hooks/useStore';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Crown, Check, X, Loader2, Package, Palette, Globe, CreditCard,
  Truck, FileText, Ticket, BarChart3, Search, Zap,
} from 'lucide-react';

declare global {
  interface Window { Razorpay: any; }
}

const PREMIUM_PRICE = 499;
const FEATURES = [
  { key: 'products', label: 'Products', icon: Package, free: '10 products', premium: 'Unlimited' },
  { key: 'themes', label: 'Premium Themes', icon: Palette, free: '1 theme', premium: 'Unlimited' },
  { key: 'customDomain', label: 'Custom Domain', icon: Globe, free: false, premium: true },
  { key: 'razorpay', label: 'Online Payments (Razorpay)', icon: CreditCard, free: false, premium: true },
  { key: 'shipping', label: 'Shipping Integration', icon: Truck, free: false, premium: true },
  { key: 'blog', label: 'Blog & Newsletter', icon: FileText, free: false, premium: true },
  { key: 'coupons', label: 'Coupons & Discounts', icon: Ticket, free: false, premium: true },
  { key: 'analytics', label: 'AI Analytics Report', icon: BarChart3, free: false, premium: true },
  { key: 'seo', label: 'Advanced SEO', icon: Search, free: false, premium: true },
] as const;

const Billing = () => {
  const { subscription, plan, isPremium, loading } = useSubscription();
  const { store } = useStore();
  const { products } = useProducts();
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    if (!store) return;

    const settings = store.settings as any;
    const razorpayKey = settings?.razorpay?.key_id;

    // For now, use a simple Razorpay payment (not subscription API)
    // In production, you'd create a Razorpay Subscription Plan
    if (!razorpayKey) {
      toast.error('Platform payment gateway not configured. Contact support.');
      return;
    }

    setUpgrading(true);
    try {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);
      await new Promise(resolve => { script.onload = resolve; });

      const options = {
        key: razorpayKey,
        amount: PREMIUM_PRICE * 100,
        currency: 'INR',
        name: 'Store on Tips',
        description: 'Premium Plan — Monthly Subscription',
        prefill: { email: '' },
        theme: { color: '#F97316' },
        handler: async () => {
          // In production: verify via webhook, update subscription
          toast.success('Payment successful! Your plan will be upgraded shortly.');
          setUpgrading(false);
        },
        modal: {
          ondismiss: () => setUpgrading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error('Failed to initiate payment');
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Plan</h1>
        <p className="text-muted-foreground">Manage your subscription and plan features</p>
      </div>

      {/* Current Plan */}
      <Card className={isPremium ? 'border-primary/30 bg-primary/5' : ''}>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3">
            {isPremium ? (
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Zap className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {isPremium ? 'Premium Plan' : 'Free Plan'}
                </h2>
                <Badge variant={isPremium ? 'default' : 'secondary'}>
                  {isPremium ? 'Active' : 'Current'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPremium
                  ? `₹${PREMIUM_PRICE}/month • Renews ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('en-IN') : 'soon'}`
                  : 'Limited features • Upgrade to unlock everything'}
              </p>
            </div>
          </div>
          {!isPremium && (
            <Button onClick={handleUpgrade} disabled={upgrading} className="gap-2">
              {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              Upgrade to Premium — ₹{PREMIUM_PRICE}/mo
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      {!isPremium && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">Products</span>
              <span className="text-sm font-medium">
                {products.length} / {PLAN_LIMITS.free.products}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (products.length / PLAN_LIMITS.free.products) * 100)}%` }}
              />
            </div>
            {products.length >= PLAN_LIMITS.free.products && (
              <p className="text-xs text-destructive mt-2">
                You've reached the free plan limit. Upgrade to add more products.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 border-b pb-3 mb-3">
            <div className="text-sm font-medium">Feature</div>
            <div className="text-sm font-medium text-center">Free</div>
            <div className="text-sm font-medium text-center text-primary">Premium</div>
          </div>
          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.key} className="grid grid-cols-3 gap-4 items-center">
                <div className="flex items-center gap-2 text-sm">
                  <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {f.label}
                </div>
                <div className="text-center">
                  {typeof f.free === 'string' ? (
                    <span className="text-xs text-muted-foreground">{f.free}</span>
                  ) : f.free ? (
                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                  )}
                </div>
                <div className="text-center">
                  {typeof f.premium === 'string' ? (
                    <span className="text-xs font-medium text-primary">{f.premium}</span>
                  ) : (
                    <Check className="h-4 w-4 text-primary mx-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
