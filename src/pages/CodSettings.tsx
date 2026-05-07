import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Banknote } from 'lucide-react';

interface CodRules {
  enabled: boolean;
  max_order_value: number;
  min_order_value: number;
  require_phone_verification: boolean;
  min_prior_orders: number;
  pincode_allowlist: string[];
  pincode_blocklist: string[];
  blocked_phones: string[];
  notes: string | null;
}

const DEFAULTS: CodRules = {
  enabled: true,
  max_order_value: 5000,
  min_order_value: 0,
  require_phone_verification: false,
  min_prior_orders: 0,
  pincode_allowlist: [],
  pincode_blocklist: [],
  blocked_phones: [],
  notes: null,
};

const toLines = (arr: string[]) => arr.join('\n');
const fromLines = (s: string) =>
  s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

const CodSettings = () => {
  const { store } = useStore();
  const [rules, setRules] = useState<CodRules>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!store?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('cod_rules' as any)
        .select('*')
        .eq('store_id', store.id)
        .maybeSingle();
      if (data) setRules({ ...DEFAULTS, ...(data as any) });
      setLoading(false);
    })();
  }, [store?.id]);

  const save = async () => {
    if (!store) return;
    setSaving(true);
    const { error } = await supabase
      .from('cod_rules' as any)
      .upsert({ store_id: store.id, ...rules }, { onConflict: 'store_id' });
    if (error) toast.error(error.message);
    else toast.success('COD rules saved');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Banknote className="h-6 w-6" /> Cash on Delivery Rules
        </h1>
        <p className="text-sm text-muted-foreground">
          Reduce fake orders by setting limits, allowlists and verification.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Availability</CardTitle>
          <CardDescription>Turn COD on or off for the storefront.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enable COD</p>
              <p className="text-xs text-muted-foreground">Customers can choose pay-on-delivery</p>
            </div>
            <Switch
              checked={rules.enabled}
              onCheckedChange={(v) => setRules((r) => ({ ...r, enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order limits</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Min order value (₹)</Label>
            <Input
              type="number" min={0}
              value={rules.min_order_value}
              onChange={(e) => setRules((r) => ({ ...r, min_order_value: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Max order value (₹)</Label>
            <Input
              type="number" min={0}
              value={rules.max_order_value}
              onChange={(e) => setRules((r) => ({ ...r, max_order_value: Number(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground">Recommended: ₹5,000–₹10,000</p>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Minimum prior orders required</Label>
            <Input
              type="number" min={0}
              value={rules.min_prior_orders}
              onChange={(e) => setRules((r) => ({ ...r, min_prior_orders: Number(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground">
              0 = anyone can use COD. Set to 1+ to require returning customers only.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Require logged-in customer for COD</p>
              <p className="text-xs text-muted-foreground">Customer must sign in (verified phone or email) to place a COD order.</p>
            </div>
            <Switch
              checked={rules.require_phone_verification}
              onCheckedChange={(v) => setRules((r) => ({ ...r, require_phone_verification: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Geographic rules</CardTitle>
          <CardDescription>One pincode per line. Allowlist (if any) takes precedence; blocklist always blocks.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Allowlist pincodes</Label>
            <Textarea
              rows={6}
              placeholder="e.g.&#10;110001&#10;400001"
              value={toLines(rules.pincode_allowlist)}
              onChange={(e) => setRules((r) => ({ ...r, pincode_allowlist: fromLines(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Blocklist pincodes</Label>
            <Textarea
              rows={6}
              placeholder="Pincodes never allowed for COD"
              value={toLines(rules.pincode_blocklist)}
              onChange={(e) => setRules((r) => ({ ...r, pincode_blocklist: fromLines(e.target.value) }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Blocked customers</CardTitle>
          <CardDescription>Phone numbers (10-digit) that cannot use COD.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="9876543210"
            value={toLines(rules.blocked_phones)}
            onChange={(e) => setRules((r) => ({ ...r, blocked_phones: fromLines(e.target.value) }))}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save COD rules
        </Button>
      </div>
    </div>
  );
};

export default CodSettings;
