import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Crown, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PlanRow {
  id: string;
  plan: 'free' | 'starter' | 'growth' | 'scale';
  display_name: string;
  price_inr: number;
  annual_price_inr: number;
  commission_percent: number;
  razorpay_plan_id: string | null;
  trial_days: number;
  product_limit: number;
  theme_limit: number;
  custom_domain: boolean;
  razorpay_payments: boolean;
  shipping: boolean;
  blog: boolean;
  coupons: boolean;
  analytics: boolean;
  seo: boolean;
  email_branding: boolean;
  premium_themes: boolean;
  multi_domain: boolean;
  early_access: boolean;
  is_active: boolean;
  sort_order: number;
}

const BOOLEAN_FEATURES: { key: keyof PlanRow; label: string }[] = [
  { key: 'custom_domain', label: 'Custom Domain' },
  { key: 'razorpay_payments', label: 'Online Payments' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'blog', label: 'Blog & Newsletter' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'seo', label: 'Advanced SEO' },
  { key: 'email_branding', label: 'Branded Emails' },
  { key: 'premium_themes', label: 'Premium Themes' },
  { key: 'multi_domain', label: 'Multi-Domain' },
  { key: 'early_access', label: 'Early Access' },
];

const PlanEditor = ({ plan }: { plan: PlanRow }) => {
  const [form, setForm] = useState<PlanRow>(plan);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = form;
      const { error } = await supabase.from('plan_configs').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${form.display_name} updated`);
      qc.invalidateQueries({ queryKey: ['admin-plan-configs'] });
      qc.invalidateQueries({ queryKey: ['plan-configs'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = <K extends keyof PlanRow>(k: K, v: PlanRow[K]) => setForm({ ...form, [k]: v });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            {form.display_name}
            <span className="text-xs text-muted-foreground font-normal">({form.plan})</span>
          </CardTitle>
          <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Display Name</Label>
            <Input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Price (₹/mo)</Label>
            <Input type="number" value={form.price_inr} onChange={(e) => set('price_inr', parseInt(e.target.value || '0'))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Annual Price (₹/yr)</Label>
            <Input
              type="number"
              value={form.annual_price_inr ?? 0}
              onChange={(e) => set('annual_price_inr', parseInt(e.target.value || '0'))}
              disabled={form.plan === 'free'}
            />
            {form.plan !== 'free' && form.price_inr > 0 && form.annual_price_inr > 0 && (
              <p className="text-[10px] text-muted-foreground">
                ≈ ₹{Math.round(form.annual_price_inr / 12).toLocaleString('en-IN')}/mo (
                {Math.max(0, Math.round(((form.price_inr * 12 - form.annual_price_inr) / (form.price_inr * 12)) * 100))}% off)
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Commission %</Label>
            <Input type="number" step="0.1" value={form.commission_percent} onChange={(e) => set('commission_percent', parseFloat(e.target.value || '0'))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Trial days</Label>
            <Input type="number" value={form.trial_days} onChange={(e) => set('trial_days', parseInt(e.target.value || '0'))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Product limit</Label>
            <Input type="number" value={form.product_limit} onChange={(e) => set('product_limit', parseInt(e.target.value || '0'))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Theme limit</Label>
            <Input type="number" value={form.theme_limit} onChange={(e) => set('theme_limit', parseInt(e.target.value || '0'))} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Razorpay Plan ID</Label>
            <Input
              placeholder="plan_XXXXXXXXXXXX"
              value={form.razorpay_plan_id || ''}
              onChange={(e) => set('razorpay_plan_id', e.target.value || null)}
              disabled={form.plan === 'free'}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t">
          {BOOLEAN_FEATURES.map((f) => (
            <label key={f.key as string} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span>{f.label}</span>
              <Switch
                checked={form[f.key] as boolean}
                onCheckedChange={(v) => set(f.key, v as any)}
              />
            </label>
          ))}
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Plan
        </Button>
      </CardContent>
    </Card>
  );
};

const AdminPlans = () => {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plan-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_configs').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PlanRow[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" /> Subscription Plans
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage pricing, feature flags and Razorpay plan IDs. Changes apply instantly to merchants.
        </p>
      </div>
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-4">
          {plans.map((p) => <PlanEditor key={p.id} plan={p} />)}
        </div>
      )}
    </div>
  );
};

export default AdminPlans;
