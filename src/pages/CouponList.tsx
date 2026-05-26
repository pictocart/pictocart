import { useState } from 'react';
import { useCoupons, type Coupon } from '@/hooks/useCoupons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Copy, Ticket, Percent, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PremiumGate from '@/components/PremiumGate';

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const CouponList = () => {
  const { coupons, isLoading, createCoupon, deleteCoupon, toggleActive } = useCoupons();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    code: generateCode(),
    type: 'percentage' as 'percentage' | 'flat' | 'bogo' | 'tiered',
    value: 10,
    min_order_amount: 0,
    max_uses: '',
    expires_at: '',
    auto_apply: false,
    bogo_buy_qty: 1,
    bogo_get_qty: 1,
    bogo_get_discount_pct: 100,
    tiers: [
      { min_subtotal: 1000, type: 'flat' as 'flat' | 'percentage', value: 100 },
      { min_subtotal: 2500, type: 'flat' as 'flat' | 'percentage', value: 300 },
    ],
    description: '',
  });

  const handleCreate = async () => {
    if (!form.code.trim()) { toast.error('Code is required'); return; }
    if ((form.type === 'percentage' || form.type === 'flat') && form.value <= 0) {
      toast.error('Value must be greater than 0'); return;
    }
    await createCoupon.mutateAsync({
      code: form.code,
      type: form.type,
      value: form.type === 'percentage' || form.type === 'flat' ? form.value : 0,
      min_order_amount: form.min_order_amount,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
      auto_apply: form.auto_apply,
      description: form.description || null,
      bogo_buy_qty: form.type === 'bogo' ? form.bogo_buy_qty : null,
      bogo_get_qty: form.type === 'bogo' ? form.bogo_get_qty : null,
      bogo_get_discount_pct: form.type === 'bogo' ? form.bogo_get_discount_pct : null,
      tiers: form.type === 'tiered' ? form.tiers : null,
    });
    setDialogOpen(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied!');
  };

  const isExpired = (c: Coupon) => c.expires_at && new Date(c.expires_at) < new Date();
  const isMaxed = (c: Coupon) => c.max_uses !== null && c.used_count >= c.max_uses;

  return (
    <PremiumGate feature="coupons" fallbackMessage="Upgrade to Premium to create discount codes and coupons for your customers.">
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
          <p className="text-sm text-muted-foreground">Create discount codes for your customers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-tour="coupons-new" size="sm"><Plus className="h-4 w-4 mr-1" /> New Coupon</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                  <Button variant="outline" size="sm" onClick={() => setForm({ ...form, code: generateCode() })}>
                    Generate
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount Type</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                      <SelectItem value="bogo">BOGO (Buy X Get Y)</SelectItem>
                      <SelectItem value="tiered">Tiered (spend more, save more)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(form.type === 'percentage' || form.type === 'flat') && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Value</Label>
                    <Input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              {form.type === 'bogo' && (
                <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-muted/40">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Buy Qty</Label>
                    <Input type="number" min={1} value={form.bogo_buy_qty}
                      onChange={(e) => setForm({ ...form, bogo_buy_qty: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Get Qty</Label>
                    <Input type="number" min={1} value={form.bogo_get_qty}
                      onChange={(e) => setForm({ ...form, bogo_get_qty: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Get % off</Label>
                    <Input type="number" min={1} max={100} value={form.bogo_get_discount_pct}
                      onChange={(e) => setForm({ ...form, bogo_get_discount_pct: Number(e.target.value) })} />
                  </div>
                </div>
              )}

              {form.type === 'tiered' && (
                <div className="space-y-2 p-3 rounded-md bg-muted/40">
                  <Label className="text-xs">Tiers (cheapest qualifying tier wins)</Label>
                  {form.tiers.map((t, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2">
                      <Input type="number" placeholder="Min ₹" value={t.min_subtotal}
                        onChange={(e) => {
                          const tiers = [...form.tiers]; tiers[idx] = { ...tiers[idx], min_subtotal: Number(e.target.value) }; setForm({ ...form, tiers });
                        }} />
                      <Select value={t.type} onValueChange={(v: any) => {
                        const tiers = [...form.tiers]; tiers[idx] = { ...tiers[idx], type: v }; setForm({ ...form, tiers });
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat ₹</SelectItem>
                          <SelectItem value="percentage">%</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" placeholder="Value" value={t.value}
                        onChange={(e) => {
                          const tiers = [...form.tiers]; tiers[idx] = { ...tiers[idx], value: Number(e.target.value) }; setForm({ ...form, tiers });
                        }} />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => setForm({ ...form, tiers: [...form.tiers, { min_subtotal: 0, type: 'flat', value: 0 }] })}>
                      + Add tier
                    </Button>
                    {form.tiers.length > 1 && (
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => setForm({ ...form, tiers: form.tiers.slice(0, -1) })}>
                        Remove last
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Order Amount (₹)</Label>
                  <Input
                    type="number"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Uses (blank = unlimited)</Label>
                  <Input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form.auto_apply}
                  onCheckedChange={(v) => setForm({ ...form, auto_apply: v })} />
                Auto-apply at checkout if cart qualifies (best coupon wins)
              </label>
              <Button onClick={handleCreate} disabled={createCoupon.isPending} className="w-full">
                {createCoupon.isPending ? 'Creating...' : 'Create Coupon'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : coupons.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ticket className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No coupons yet. Create one to offer discounts.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {coupons.map((c) => {
            const expired = isExpired(c);
            const maxed = isMaxed(c);
            return (
              <Card key={c.id} className={expired || maxed ? 'opacity-60' : ''}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {c.type === 'percentage' ? <Percent className="h-4 w-4 text-primary" /> : <IndianRupee className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm">{c.code}</span>
                        <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.type === 'percentage' && `${c.value}% off`}
                        {c.type === 'flat' && `₹${c.value} off`}
                        {c.type === 'bogo' && `Buy ${c.bogo_buy_qty} Get ${c.bogo_get_qty} (${c.bogo_get_discount_pct}% off)`}
                        {c.type === 'tiered' && `Tiered • ${(c.tiers?.length ?? 0)} tier${(c.tiers?.length ?? 0) === 1 ? '' : 's'}`}
                        {c.min_order_amount > 0 && ` • Min ₹${c.min_order_amount}`}
                        {c.auto_apply && ' • Auto-apply'}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{c.used_count}{c.max_uses ? `/${c.max_uses}` : ''} used</span>
                    {c.expires_at && (
                      <span>{expired ? 'Expired' : `Expires ${format(new Date(c.expires_at), 'dd MMM')}`}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {expired && <Badge variant="secondary" className="text-[10px]">Expired</Badge>}
                    {maxed && <Badge variant="secondary" className="text-[10px]">Maxed</Badge>}
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: c.id, is_active: v })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteCoupon.mutate(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </PremiumGate>
  );
};

export default CouponList;
