import { useState } from 'react';
import { useSubscription, usePlanConfigs, type PlanConfig } from '@/hooks/useSubscription';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useStore } from '@/hooks/useStore';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Crown, Check, X, Loader2, Zap, Sparkles, AlertTriangle, Lock } from 'lucide-react';
import { CommissionPanel } from '@/components/billing/CommissionPanel';
import { usePlanOffer, isOfferActive } from '@/hooks/useSiteOffer';

type BillingCycle = 'monthly' | 'annual';
const annualMonthly = (annual: number) => Math.round((annual / 12) * 100) / 100;
const annualSavingsPct = (monthly: number, annual: number) => {
  if (!monthly || !annual) return 0;
  const full = monthly * 12;
  return Math.max(0, Math.round(((full - annual) / full) * 100));
};

declare global { interface Window { Razorpay: any; } }

const FEATURE_ROWS: { key: keyof PlanConfig; label: string }[] = [
  { key: 'signup_bonus_credits', label: 'Signup AI Credits' },
  { key: 'product_limit', label: 'Products' },
  { key: 'theme_limit', label: 'Themes' },
  { key: 'commission_percent', label: 'Commission' },
  { key: 'custom_domain', label: 'Custom Domain' },
  { key: 'razorpay_payments', label: 'Online Payments' },
  { key: 'shipping', label: 'Shipping (Shiprocket)' },
  { key: 'blog', label: 'Blog & Newsletter' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'seo', label: 'Advanced SEO' },
  { key: 'email_branding', label: 'Branded Emails' },
  { key: 'premium_themes', label: 'Premium Themes' },
  { key: 'multi_domain', label: 'Multi-Domain' },
  { key: 'early_access', label: 'Early Access' },
];

const gstTotal = (base: number, gst: number) => Math.round(base * (1 + gst / 100) * 100) / 100;

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
  const { isBlocked, inGrace, graceDaysLeft, pendingPlan, pendingPlanEffectiveAt } = useSubscriptionAccess();
  const { data: plans = [] } = usePlanConfigs();
  const { store } = useStore();
  const { products } = useProducts();
  const { data: planOffer } = usePlanOffer();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<PlanConfig | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  const offerActive = isOfferActive(planOffer);
  const offerPctFor = (c: BillingCycle) => {
    if (!offerActive) return 0;
    if (c === 'monthly' && !planOffer!.applies_to_monthly) return 0;
    if (c === 'annual' && !planOffer!.applies_to_annual) return 0;
    return Number(planOffer!.percent_off);
  };
  const currentOffer = offerPctFor(cycle);

  const currentOrder = plans.find((p) => p.plan === plan)?.sort_order ?? 1;

  const startRazorpay = async (target: PlanConfig) => {
    if (!store) return;
    setPendingAction(target.plan);
    try {
      if (cycle === 'annual') {
        const { data, error } = await supabase.functions.invoke('create-annual-plan-payment', {
          body: { store_id: store.id, plan: target.plan },
        });
        if (error || !data?.razorpay_order_id) throw new Error(error?.message || data?.error || 'Failed');

        if (!(window as any).Razorpay) {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          document.body.appendChild(s);
          await new Promise((res) => { s.onload = res; });
        }
        const rzp = new window.Razorpay({
          key: data.razorpay_key_id,
          order_id: data.razorpay_order_id,
          amount: data.amount,
          currency: data.currency,
          name: 'Pic to Cart',
          description: `${target.display_name} — Annual plan (₹${data.amount_inr})`,
          theme: { color: '#F97316' },
          handler: async (resp: any) => {
            try {
              const verify = await supabase.functions.invoke('verify-annual-plan-payment', {
                body: {
                  store_id: store.id,
                  plan: target.plan,
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                },
              });
              if (verify.error || (verify.data as any)?.error) {
                throw new Error(verify.error?.message || (verify.data as any)?.error || 'Verification failed');
              }
              toast.success('Annual plan activated! 🎉');
              setTimeout(() => window.location.reload(), 1500);
            } catch (e: any) {
              toast.error(e.message || 'Verification failed');
            } finally {
              setPendingAction(null);
            }
          },
          modal: { ondismiss: () => setPendingAction(null) },
        });
        rzp.open();
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-razorpay-subscription', {
        body: { store_id: store.id, plan: target.plan },
      });
      if (error || !data?.subscription_id) throw new Error(error?.message || data?.error || 'Failed');

      if (!(window as any).Razorpay) {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(s);
        await new Promise((res) => { s.onload = res; });
      }
      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        subscription_id: data.subscription_id,
        name: 'Pic to Cart',
        description: `${target.display_name} — ₹${target.price_inr} + ${target.gst_percent ?? 18}% GST/month`,
        theme: { color: '#F97316' },
        handler: () => {
          toast.success('Payment successful! Your plan will activate shortly.');
          setPendingAction(null);
          setTimeout(() => window.location.reload(), 3000);
        },
        modal: { ondismiss: () => setPendingAction(null) },
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to start payment');
      setPendingAction(null);
    }
  };

  const confirmDowngrade = async () => {
    if (!store || !downgradeTarget) return;
    setPendingAction(downgradeTarget.plan);
    try {
      const { data, error } = await supabase.functions.invoke('change-subscription-plan', {
        body: { store_id: store.id, new_plan: downgradeTarget.plan },
      });
      if (error) throw new Error(error.message);
      toast.success((data as any)?.message || 'Downgrade scheduled');
      setDowngradeTarget(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule downgrade');
    } finally {
      setPendingAction(null);
    }
  };

  const cancelPending = async () => {
    if (!store) return;
    const { error } = await supabase.rpc('cancel_pending_plan_change', { _store_id: store.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Pending plan change cancelled');
    setTimeout(() => window.location.reload(), 1000);
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
        <p className="text-muted-foreground">
          Pay monthly or save with an annual plan. All prices exclude 18% GST. Upgrade anytime; downgrades apply at the end of your current billing cycle.
        </p>
      </div>

      {offerActive && planOffer!.show_banner && (
        <div
          className="rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
          style={{
            backgroundColor: planOffer!.banner_bg_color || '#F97316',
            color: planOffer!.banner_text_color || '#FFFFFF',
          }}
        >
          <Sparkles className="h-4 w-4" />
          {planOffer!.banner_text ||
            `${planOffer!.label || 'Limited offer'} — Flat ${planOffer!.percent_off}% off${
              planOffer!.applies_to_monthly && planOffer!.applies_to_annual
                ? ' all plans'
                : planOffer!.applies_to_annual
                ? ' annual plans'
                : ' monthly plans'
            }!`}
        </div>
      )}

      {/* Lifecycle banners */}
      {isBlocked && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <Lock className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-destructive">Your store is paused</p>
              <p className="text-muted-foreground">Renew your subscription below to restore access instantly.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {inGrace && !isBlocked && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Payment overdue — {graceDaysLeft} day(s) left</p>
              <p className="text-amber-800">Renew before the grace period ends to avoid your store being paused.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {pendingPlan && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="flex items-center justify-between gap-3 py-4 text-sm">
            <div>
              <p className="font-semibold text-blue-900">Downgrade scheduled</p>
              <p className="text-blue-800">
                You'll move to <strong>{pendingPlan}</strong>
                {pendingPlanEffectiveAt && ` on ${new Date(pendingPlanEffectiveAt).toLocaleDateString('en-IN')}`}.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={cancelPending}>Cancel</Button>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card className={plan !== 'free' ? 'border-primary/30 bg-primary/5' : ''}>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {plan === 'free' ? <Zap className="h-5 w-5 text-muted-foreground" /> : <Crown className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{planConfig.display_name} Plan</h2>
                <Badge variant={plan === 'free' ? 'secondary' : 'default'}>
                  {subscription?.status === 'trialing' ? 'Trial' : (subscription?.status || 'active')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {plan === 'free'
                  ? 'Limited features • Upgrade for more'
                  : (() => {
                      const isAnnual = (subscription as any)?.billing_cycle === 'annual';
                      const annual = Number((planConfig as any).annual_price_inr ?? 0);
                      const base = isAnnual && annual > 0 ? annualMonthly(annual) : planConfig.price_inr;
                      const renews = subscription?.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString('en-IN')
                        : 'soon';
                      return `₹${gstTotal(base, planConfig.gst_percent ?? 18).toFixed(2)} / month (incl. 18% GST) • ${isAnnual ? 'Annual plan' : 'Monthly'} • Renews ${renews}`;
                    })()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {store && (
        <CommissionPanel
          storeId={store.id}
          storeName={store.name}
          storeSettings={(store as any).settings}
          commissionPercent={planConfig.commission_percent}
        />
      )}

      {plan === 'free' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Usage</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">Products</span>
              <span className="text-sm font-medium">{products.length} / {planConfig.product_limit}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (products.length / planConfig.product_limit) * 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing cycle toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Choose a plan</h3>
        <div className="inline-flex items-center rounded-full border bg-muted/40 p-1 text-sm self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={`px-4 py-1.5 rounded-full font-medium transition ${cycle === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            className={`px-4 py-1.5 rounded-full font-medium transition flex items-center gap-1.5 ${cycle === 'annual' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            Annual
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Save ~17%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = p.plan === plan;
          const isFree = p.plan === 'free';
          const isUpgrade = p.sort_order > currentOrder;
          const isDowngrade = p.sort_order < currentOrder;
          const busy = pendingAction === p.plan;
          const gstPct = p.gst_percent ?? 18;
          const annualPrice = Number(p.annual_price_inr ?? 0);
          const showAnnual = cycle === 'annual' && !isFree && annualPrice > 0;
          const displayMonthly = showAnnual ? annualMonthly(annualPrice) : p.price_inr;
          const total = gstTotal(displayMonthly, gstPct);
          const savings = showAnnual ? annualSavingsPct(p.price_inr, annualPrice) : 0;
          const offerPct = isFree ? 0 : currentOffer;
          const discountedMonthly = offerPct > 0 ? displayMonthly * (1 - offerPct / 100) : displayMonthly;
          const discountedAnnual = showAnnual && offerPct > 0
            ? annualPrice * (1 - offerPct / 100)
            : annualPrice;

          return (
            <Card key={p.id} className={`flex flex-col ${isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{p.display_name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                  {offerPct > 0 && !isCurrent && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                      -{offerPct}%
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-bold">₹{Math.round(discountedMonthly).toLocaleString('en-IN')}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                  {offerPct > 0 && (
                    <span className="text-sm text-muted-foreground line-through">
                      ₹{Math.round(displayMonthly).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                {!isFree && (
                  <p className="text-xs text-muted-foreground">
                    {showAnnual
                      ? <>Billed ₹{Math.round(discountedAnnual).toLocaleString('en-IN')} yearly{offerPct > 0 && <> <span className="line-through">₹{annualPrice.toLocaleString('en-IN')}</span></>} · incl. {gstPct}% GST{savings > 0 && <> · <span className="text-emerald-600 font-semibold">Save {savings}%</span></>}</>
                      : <>₹{total.toFixed(2)} incl. {gstPct}% GST{offerPct > 0 && cycle === 'monthly' && <span className="block text-orange-600">Festive offer shown on first invoice</span>}</>}
                  </p>
                )}
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
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />
                    {p.product_limit >= 2_000_000_000 ? 'Unlimited' : p.product_limit} products</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-600" />
                    {p.theme_limit >= 2_000_000_000 ? 'All' : p.theme_limit} theme(s)</li>
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
                  isDowngrade ? (
                    <Button variant="outline" disabled={!!pendingAction} className="w-full"
                      onClick={() => setDowngradeTarget(p)}>Schedule downgrade</Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full">Free Forever</Button>
                  )
                ) : isUpgrade ? (
                  <Button onClick={() => startRazorpay(p)} disabled={!!pendingAction} className="w-full gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                    {cycle === 'annual' && !isFree && annualPrice > 0 ? 'Pay yearly' : 'Upgrade now'}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setDowngradeTarget(p)}
                    disabled={!!pendingAction} className="w-full">
                    Schedule downgrade
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Need a feature on a higher plan for just one project? Upgrade now to use it, then schedule a downgrade —
        you'll only be billed for the plans you keep at the start of each cycle.
      </p>

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

      <AlertDialog open={!!downgradeTarget} onOpenChange={(o) => !o && setDowngradeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule downgrade to {downgradeTarget?.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll keep your current <strong>{planConfig.display_name}</strong> features until{' '}
              {subscription?.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString('en-IN')
                : 'the end of your current billing cycle'}.
              After that you'll move to <strong>{downgradeTarget?.display_name}</strong> and any features
              not included in that plan will become unavailable. You can cancel this anytime before then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current plan</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade}>Confirm downgrade</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Billing;
