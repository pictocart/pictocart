import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Sparkles, Coins, Tag, Trophy, Database, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const useSettings = () => useQuery({
  queryKey: ['admin-credit-settings'],
  queryFn: async () => {
    const { data } = await supabase.from('platform_credit_settings').select('*').eq('id', 1).maybeSingle();
    return data;
  },
});

const useActions = () => useQuery({
  queryKey: ['admin-action-costs'],
  queryFn: async () => {
    const { data } = await supabase.from('ai_action_costs').select('*').order('action_key');
    return data || [];
  },
});

const usePacks = () => useQuery({
  queryKey: ['admin-packs'],
  queryFn: async () => {
    const { data } = await supabase.from('ai_credit_packs').select('*').order('sort_order');
    return data || [];
  },
});

const usePromos = () => useQuery({
  queryKey: ['admin-promos'],
  queryFn: async () => {
    const { data } = await supabase.from('credit_promos').select('*').order('created_at', { ascending: false });
    return data || [];
  },
});

const useEconomyStats = () => useQuery({
  queryKey: ['admin-economy-stats'],
  queryFn: async () => {
    const [{ data: walletAgg }, { data: txAgg }] = await Promise.all([
      supabase.from('ai_credit_wallets').select('balance, lifetime_purchased, lifetime_used, lifetime_saved_inr'),
      supabase.from('ai_credit_transactions').select('type, credits, inr_value, cache_hit').limit(5000),
    ]);
    const wallets = walletAgg || [];
    const txs = txAgg || [];
    return {
      totalStores: wallets.length,
      totalBalance: wallets.reduce((s, w) => s + (w.balance || 0), 0),
      totalPurchased: wallets.reduce((s, w) => s + (w.lifetime_purchased || 0), 0),
      totalUsed: wallets.reduce((s, w) => s + (w.lifetime_used || 0), 0),
      merchantSavedInr: wallets.reduce((s, w) => s + Number(w.lifetime_saved_inr || 0), 0),
      revenueInr: txs.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.inr_value || 0), 0),
      cacheHits: txs.filter(t => t.cache_hit).length,
      totalDebits: txs.filter(t => t.type === 'debit').length,
    };
  },
});

const PricingTab = () => {
  const { data: s } = useSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const cur = form ?? s;
  const [saving, setSaving] = useState(false);

  if (!cur) return <Loader2 className="h-5 w-5 animate-spin" />;

  const previewCreditInr = Number(cur.base_cost_per_credit_inr) * Number(cur.margin_multiplier);
  const previewMargin = ((1 - 1 / cur.margin_multiplier) * 100).toFixed(0);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('platform_credit_settings').update({
      base_cost_per_credit_inr: cur.base_cost_per_credit_inr,
      margin_multiplier: cur.margin_multiplier,
      custom_recharge_rate: cur.custom_recharge_rate,
      custom_min_inr: cur.custom_min_inr,
      custom_max_inr: cur.custom_max_inr,
      welcome_grant_credits: cur.welcome_grant_credits,
      low_balance_threshold: cur.low_balance_threshold,
      critical_balance_threshold: cur.critical_balance_threshold,
      freelancer_inr_per_hour: cur.freelancer_inr_per_hour,
    }).eq('id', 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Pricing updated');
    qc.invalidateQueries({ queryKey: ['admin-credit-settings'] });
    qc.invalidateQueries({ queryKey: ['credit-settings'] });
  };

  const F = (key: string, label: string, suffix?: string, step = 1) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step={step}
          value={cur[key] ?? ''}
          onChange={(e) => setForm({ ...cur, [key]: Number(e.target.value) })}
          className="h-10"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> Pricing & Margin</CardTitle>
        <CardDescription>Control the underlying cost and markup for every AI credit on the platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border bg-secondary/30 p-4 grid sm:grid-cols-3 gap-3 text-sm">
          <div><div className="text-muted-foreground text-xs">Sell price / credit</div><div className="font-bold text-base">₹{previewCreditInr.toFixed(3)}</div></div>
          <div><div className="text-muted-foreground text-xs">At {cur.margin_multiplier}× margin</div><div className="font-bold text-base">~{previewMargin}% gross margin</div></div>
          <div><div className="text-muted-foreground text-xs">₹100 buys</div><div className="font-bold text-base">{Math.floor(100 / previewCreditInr).toLocaleString()} credits</div></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {F('base_cost_per_credit_inr', 'Base cost / credit (your cost)', '₹', 0.001)}
          {F('margin_multiplier', 'Margin multiplier (×)', '', 0.1)}
          {F('custom_recharge_rate', 'Custom: credits per ₹1', '')}
          {F('custom_min_inr', 'Custom: min ₹', '₹')}
          {F('custom_max_inr', 'Custom: max ₹', '₹')}
          {F('welcome_grant_credits', 'Welcome grant credits', 'cr')}
          {F('low_balance_threshold', 'Low-balance warning', 'cr')}
          {F('critical_balance_threshold', 'Critical-balance warning', 'cr')}
          {F('freelancer_inr_per_hour', 'Freelancer cost / hour (for savings calc)', '₹')}
        </div>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save pricing
        </Button>
      </CardContent>
    </Card>
  );
};

const ActionsTab = () => {
  const { data: actions = [] } = useActions();
  const qc = useQueryClient();

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from('ai_action_costs').update(patch).eq('action_key', id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['admin-action-costs'] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Action Costs</CardTitle>
        <CardDescription>Per-action credit price, cache discount, and merchant savings benchmark.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((a: any) => (
          <div key={a.action_key} className="grid grid-cols-12 gap-2 items-center rounded-lg border p-3 text-sm">
            <div className="col-span-12 sm:col-span-3">
              <div className="font-semibold">{a.label}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{a.action_key}</div>
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="text-[10px]">Credits</Label>
              <Input type="number" defaultValue={a.credits} onBlur={(e) => update(a.action_key, { credits: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="text-[10px]">Cache cr</Label>
              <Input type="number" defaultValue={a.cache_hit_credits} onBlur={(e) => update(a.action_key, { cache_hit_credits: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="text-[10px]">Manual ₹</Label>
              <Input type="number" defaultValue={a.manual_cost_inr} onBlur={(e) => update(a.action_key, { manual_cost_inr: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Label className="text-[10px]">Manual mins</Label>
              <Input type="number" defaultValue={a.manual_minutes} onBlur={(e) => update(a.action_key, { manual_minutes: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-6 sm:col-span-1 flex items-end justify-end gap-2">
              <Switch checked={a.is_active} onCheckedChange={(v) => update(a.action_key, { is_active: v })} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const PacksTab = () => {
  const { data: packs = [] } = usePacks();
  const qc = useQueryClient();

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from('ai_credit_packs').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['admin-packs'] });
    qc.invalidateQueries({ queryKey: ['credit-packs'] });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this pack?')) return;
    await supabase.from('ai_credit_packs').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-packs'] });
  };

  const add = async () => {
    const { error } = await supabase.from('ai_credit_packs').insert({
      name: 'New pack', price_inr: 999, credits: 10000, bonus_pct: 0, sort_order: packs.length, is_active: true,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['admin-packs'] });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Recharge Packs</CardTitle>
          <CardDescription>Configure Razorpay-backed top-up packs shown to merchants.</CardDescription>
        </div>
        <Button size="sm" onClick={add} className="gap-1.5"><Plus className="h-4 w-4" /> Add pack</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {packs.map((p: any) => (
          <div key={p.id} className="grid grid-cols-12 gap-2 items-end rounded-lg border p-3 text-sm">
            <div className="col-span-6 sm:col-span-2">
              <Label className="text-[10px]">Name</Label>
              <Input defaultValue={p.name} onBlur={(e) => update(p.id, { name: e.target.value })} className="h-8" />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Label className="text-[10px]">Price ₹</Label>
              <Input type="number" defaultValue={p.price_inr} onBlur={(e) => update(p.id, { price_inr: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Label className="text-[10px]">Credits</Label>
              <Input type="number" defaultValue={p.credits} onBlur={(e) => update(p.id, { credits: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-6 sm:col-span-1">
              <Label className="text-[10px]">Bonus %</Label>
              <Input type="number" defaultValue={p.bonus_pct} onBlur={(e) => update(p.id, { bonus_pct: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Label className="text-[10px]">Badge</Label>
              <Input defaultValue={p.badge || ''} placeholder="Most popular" onBlur={(e) => update(p.id, { badge: e.target.value || null })} className="h-8" />
            </div>
            <div className="col-span-3 sm:col-span-1 flex items-center gap-1.5">
              <Switch checked={p.is_popular} onCheckedChange={(v) => update(p.id, { is_popular: v })} />
              <span className="text-[10px]">★</span>
            </div>
            <div className="col-span-3 sm:col-span-1 flex items-center">
              <Switch checked={p.is_active} onCheckedChange={(v) => update(p.id, { is_active: v })} />
            </div>
            <div className="col-span-6 sm:col-span-1 flex justify-end">
              <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const PromosTab = () => {
  const { data: promos = [] } = usePromos();
  const qc = useQueryClient();

  const add = async () => {
    const code = prompt('Promo code (e.g. LAUNCH50)')?.toUpperCase().trim();
    if (!code) return;
    const { error } = await supabase.from('credit_promos').insert({
      type: 'code', code, bonus_pct: 25, is_active: true, min_recharge_inr: 0, eligible_pack_ids: [],
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['admin-promos'] });
  };

  const update = async (id: string, patch: any) => {
    await supabase.from('credit_promos').update(patch).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-promos'] });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Promotions</CardTitle>
          <CardDescription>Bonus codes, festival sales, first-recharge bonuses, referrals.</CardDescription>
        </div>
        <Button size="sm" onClick={add} className="gap-1.5"><Plus className="h-4 w-4" /> Add promo</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {promos.length === 0 && <p className="text-sm text-muted-foreground">No promos yet. Click "Add promo" to launch your first incentive.</p>}
        {promos.map((p: any) => (
          <div key={p.id} className="grid grid-cols-12 gap-2 items-end rounded-lg border p-3 text-sm">
            <div className="col-span-12 sm:col-span-3">
              <div className="flex items-center gap-2 font-semibold">
                {p.code || p.type}
                <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-[10px]">{p.is_active ? 'live' : 'paused'}</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground">Used {p.used_count}{p.max_uses ? ` / ${p.max_uses}` : ''}</div>
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="text-[10px]">Bonus %</Label>
              <Input type="number" defaultValue={p.bonus_pct} onBlur={(e) => update(p.id, { bonus_pct: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="text-[10px]">Flat credits</Label>
              <Input type="number" defaultValue={p.bonus_flat_credits} onBlur={(e) => update(p.id, { bonus_flat_credits: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="text-[10px]">Min ₹</Label>
              <Input type="number" defaultValue={p.min_recharge_inr} onBlur={(e) => update(p.id, { min_recharge_inr: Number(e.target.value) })} className="h-8" />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Label className="text-[10px]">Max uses</Label>
              <Input type="number" defaultValue={p.max_uses || ''} onBlur={(e) => update(p.id, { max_uses: e.target.value ? Number(e.target.value) : null })} className="h-8" />
            </div>
            <div className="col-span-6 sm:col-span-1 flex items-center justify-end">
              <Switch checked={p.is_active} onCheckedChange={(v) => update(p.id, { is_active: v })} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const InsightsTab = () => {
  const { data: stats } = useEconomyStats();
  if (!stats) return <Loader2 className="h-5 w-5 animate-spin" />;
  const cacheRate = stats.totalDebits ? ((stats.cacheHits / stats.totalDebits) * 100).toFixed(1) : '0';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Economy Insights</CardTitle>
        <CardDescription>Live snapshot of credit flow across the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Stores w/ wallets" value={stats.totalStores} />
          <Stat label="Credits in circulation" value={stats.totalBalance.toLocaleString()} />
          <Stat label="Lifetime purchased" value={stats.totalPurchased.toLocaleString()} />
          <Stat label="Lifetime used" value={stats.totalUsed.toLocaleString()} />
          <Stat label="Platform revenue" value={`₹${Math.round(stats.revenueInr).toLocaleString()}`} highlight />
          <Stat label="Merchants saved" value={`₹${Math.round(stats.merchantSavedInr).toLocaleString()}`} />
          <Stat label="Cache reuse rate" value={`${cacheRate}%`} />
          <Stat label="AI calls" value={stats.totalDebits.toLocaleString()} />
        </div>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) => (
  <div className={`rounded-xl border p-3 ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-secondary/30'}`}>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-lg font-bold mt-1">{value}</div>
  </div>
);

const AdminCreditsEconomy = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-6 w-6 text-primary" /> Credits Economy</h1>
        <p className="text-muted-foreground text-sm">Set pricing, packs, promotions, and watch the AI economy in real time.</p>
      </div>
      <Tabs defaultValue="pricing">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="actions">AI Actions</TabsTrigger>
          <TabsTrigger value="packs">Packs</TabsTrigger>
          <TabsTrigger value="promos">Promos</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="pricing" className="mt-4"><PricingTab /></TabsContent>
        <TabsContent value="actions" className="mt-4"><ActionsTab /></TabsContent>
        <TabsContent value="packs" className="mt-4"><PacksTab /></TabsContent>
        <TabsContent value="promos" className="mt-4"><PromosTab /></TabsContent>
        <TabsContent value="insights" className="mt-4"><InsightsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCreditsEconomy;
