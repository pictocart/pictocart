import { useState } from 'react';
import { useSubscription, usePlanConfigs, type PlanConfig } from '@/hooks/useSubscription';
import { useStore } from '@/hooks/useStore';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Crown, Check, X, Loader2, Zap, Sparkles } from 'lucide-react';

declare global {
  interface Window { Razorpay: any; }
}

// Razorpay key ID is returned by the create-razorpay-subscription edge function (sourced from RAZORPAY_KEY_ID secret)

const FEATURE_ROWS: { key: keyof PlanConfig; label: string }[] = [
  { key: 'signup_bonus_credits', label: 'Signup AI Credits' },
  { key: 'product_limit',      label: 'Products' },
  { key: 'theme_limit',        label: 'Themes' },
  { key: 'commission_percent', label: 'Commission' },
  { key: 'custom_domain',      label: 'Custom Domain' },
  { key: 'razorpay_payments',  label: 'Online Payments' },
  { key: 'shipping',           label: 'Shipping (Shiprocket)' },
  { key: 'blog',               label: 'Blog & Newsletter' },
  { key: 'coupons',            label: 'Coupons' },
  { key: 'analytics',          label: 'Analytics' },
  { key: 'seo',                label: 'Advanced SEO' },
  { key: 'email_branding',     label: 'Branded Emails' },
  { key: 'premium_themes',     label: 'Premium Themes' },
  { key: 'multi_domain',       label: 'Multi-Domain' },
  { key: 'early_access',       label: 'Early Access' },
];

const renderCell = (plan: PlanConfig, key: keyof PlanConfig) => {
  const v = plan[key];
  if (key === 'product_limit' || key === 'theme_limit') {
    return (v as number) >= 2_000_000_000 ? 'Unlimited' : String(v);
  }
  if (key === 'commission_percent') return `${v}%`;
  if (key === 'signup_bonus_credits') {
    const n = Number(v ?? 0);
    return n > 0 ? `${n.toLocaleString('en-IN')} cr` : '—';
  }
  if (typeof v === 'boolean') {
    return v
      ? <Check className="h-4 w-4 text-green-600 mx-auto" />
      : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  }
  return String(v);
};

const Billing = () => {
  const { subscription, plan, planConfig, loading } = useSubscription();
  const { data: plans = [] } = usePlanConfigs();
  const { store } = useStore();
  const { products } = useProducts();
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

  const handleUpgrade = async (target: 'starter' | 'growth' | 'scale') => {
    if (!store) return;
    setUpgradingTo(target);
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-subscription', {
        body: { store_id: store.id, plan: target },
      });
      if (error || !data?.subscription_id) {
        throw new Error(error?.message || data?.error || 'Failed to create subscription');
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);
      await new Promise((res) => { script.onload = res; });

      const targetPlan = plans.find((p) => p.plan === target);
      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        subscription_id: data.subscription_id,
        name: 'Pic to Cart',
        description: `${targetPlan?.display_name} — ₹${targetPlan?.price_inr}/month`,
        theme: { color: '#F97316' },
        handler: () => {
          toast.success('Payment successful! Your plan will activate shortly.');
          setUpgradingTo(null);
          setTimeout(() => window.location.reload(), 3000);
        },
        modal: { ondismiss: () => setUpgradingTo(null) },
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to start payment');
      setUpgradingTo(null);
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
        <p className="text-muted-foreground">Pick the plan that fits your store.</p>
      </div>

      {/* Current Plan */}
      <Card className={plan !== 'free' ? 'border-primary/30 bg-primary/5' : ''}>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {plan === 'free'
                ? <Zap className="h-5 w-5 text-muted-foreground" />
                : <Crown className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{planConfig.display_name} Plan</h2>
                <Badge variant={plan === 'free' ? 'secondary' : 'default'}>
                  {subscription?.status === 'trialing' ? 'Trial' : 'Current'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {plan === 'free'
                  ? 'Limited features • Upgrade for more'
                  : `₹${planConfig.price_inr}/month • Renews ${
                      subscription?.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString('en-IN')
                        : 'soon'
                    }`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage on free */}
      {plan === 'free' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Usage</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">Products</span>
              <span className="text-sm font-medium">
                {products.length} / {planConfig.product_limit}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (products.length / planConfig.product_limit) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = p.plan === plan;
          const isFree = p.plan === 'free';
          const isUpgrading = upgradingTo === p.plan;
          return (
            <Card
              key={p.id}
              className={`flex flex-col ${isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{p.display_name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">₹{p.price_inr}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Commission {p.commission_percent}% · {p.trial_days > 0 ? `${p.trial_days}-day trial` : 'No trial'}
                </p>
                {!!p.signup_bonus_credits && p.signup_bonus_credits > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 text-xs font-semibold">
                    <Sparkles className="h-3 w-3" />
                    {p.signup_bonus_credits.toLocaleString('en-IN')} AI credits free
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <ul className="space-y-1.5 text-sm flex-1">
                  {!!p.signup_bonus_credits && p.signup_bonus_credits > 0 && (
                    <li className="flex items-center gap-2 text-amber-700 font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      {p.signup_bonus_credits.toLocaleString('en-IN')} AI credits on signup
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    {p.product_limit >= 2_000_000_000 ? 'Unlimited' : p.product_limit} products
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    {p.theme_limit >= 2_000_000_000 ? 'All' : p.theme_limit} theme(s)
                  </li>
                  {p.custom_domain && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />Custom domain</li>}
                  {p.razorpay_payments && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />Online payments</li>}
                  {p.shipping && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />Shipping (Shiprocket)</li>}
                  {p.blog && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />Blog & newsletter</li>}
                  {p.email_branding && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />Branded emails</li>}
                  {p.premium_themes && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />Premium themes</li>}
                  {p.multi_domain && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />Multi-domain</li>}
                  {p.early_access && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />Early access</li>}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">Current Plan</Button>
                ) : isFree ? (
                  <Button variant="outline" disabled className="w-full">Free Forever</Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(p.plan as any)}
                    disabled={!!upgradingTo}
                    className="w-full gap-2"
                  >
                    {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                    Upgrade
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed comparison */}
      <Card>
        <CardHeader><CardTitle className="text-base">Compare all features</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Feature</th>
                {plans.map((p) => (
                  <th key={p.id} className="text-center py-2 font-medium px-2">{p.display_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.key} className="border-b last:border-0">
                  <td className="py-2 text-muted-foreground">{row.label}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-2 text-center">{renderCell(p, row.key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
