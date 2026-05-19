import { useStore } from '@/hooks/useStore';
import { useFulfillment, type FulfillmentSettings as FS } from '@/hooks/useFulfillment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Utensils, ShoppingBag, Truck, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const FulfillmentSettingsPage = () => {
  const { store } = useStore();
  const { settings, loading, save, saving } = useFulfillment(store?.id);
  const [draft, setDraft] = useState<FS>(settings);

  useEffect(() => { if (!loading) setDraft(settings); }, [loading, settings.store_id]); // eslint-disable-line

  if (!store || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const update = (patch: Partial<FS>) => setDraft((d) => ({ ...d, ...patch }));
  const onSave = () => save(draft);

  return (
    <div className="space-y-6 max-w-3xl pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fulfillment</h1>
          <p className="text-sm text-muted-foreground">
            How customers can order from you — Dine-in, Takeaway, or Delivery.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings/qr">QR Codes <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link>
        </Button>
      </div>

      {/* Dine-in */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center"><Utensils className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">Dine-in</CardTitle>
              <CardDescription>Customers scan a table QR and order from their seat. No sign-up needed.</CardDescription>
            </div>
          </div>
          <Switch checked={draft.dine_in_enabled} onCheckedChange={(v) => update({ dine_in_enabled: v })} />
        </CardHeader>
        {draft.dine_in_enabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require table number</Label>
                <p className="text-xs text-muted-foreground">Recommended. QR can encode the table directly.</p>
              </div>
              <Switch checked={draft.dine_in_requires_table} onCheckedChange={(v) => update({ dine_in_requires_table: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-accept incoming orders</Label>
                <p className="text-xs text-muted-foreground">Skip manual confirmation; send straight to the kitchen.</p>
              </div>
              <Switch checked={draft.auto_accept} onCheckedChange={(v) => update({ auto_accept: v })} />
            </div>
            <div>
              <Label>Average prep time (minutes)</Label>
              <Input type="number" min={1} max={120} value={draft.kitchen_prep_minutes}
                onChange={(e) => update({ kitchen_prep_minutes: Number(e.target.value) || 20 })} className="w-32" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Takeaway */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center"><ShoppingBag className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">Takeaway / Pickup</CardTitle>
              <CardDescription>Customer orders ahead, pays online or at counter, picks up.</CardDescription>
            </div>
          </div>
          <Switch checked={draft.takeaway_enabled} onCheckedChange={(v) => update({ takeaway_enabled: v })} />
        </CardHeader>
        {draft.takeaway_enabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Phone number only (no address)</Label>
                <p className="text-xs text-muted-foreground">Fastest checkout. We call them when ready.</p>
              </div>
              <Switch checked={draft.takeaway_min_phone_only} onCheckedChange={(v) => update({ takeaway_min_phone_only: v })} />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Delivery */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Truck className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">Delivery</CardTitle>
              <CardDescription>Standard ship-to-address with Razorpay & COD.</CardDescription>
            </div>
          </div>
          <Switch checked={draft.delivery_enabled} onCheckedChange={(v) => update({ delivery_enabled: v })} />
        </CardHeader>
        {draft.delivery_enabled && (
          <CardContent className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Radius (km)</Label>
              <Input type="number" min={0} value={draft.delivery_radius_km}
                onChange={(e) => update({ delivery_radius_km: Number(e.target.value) || 0 })} />
              <p className="text-xs text-muted-foreground mt-1">0 = unlimited</p>
            </div>
            <div>
              <Label>Min order (₹)</Label>
              <Input type="number" min={0} value={draft.delivery_min_order}
                onChange={(e) => update({ delivery_min_order: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Flat delivery fee (₹)</Label>
              <Input type="number" min={0} value={draft.delivery_fee_flat}
                onChange={(e) => update({ delivery_fee_flat: Number(e.target.value) || 0 })} />
            </div>
          </CardContent>
        )}
      </Card>

      <div className="sticky bottom-0 md:static -mx-4 md:mx-0 bg-background/95 backdrop-blur border-t md:border-0 p-4 md:p-0 flex justify-end">
        <Button onClick={onSave} disabled={saving} size="lg">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save fulfillment settings
        </Button>
      </div>
    </div>
  );
};

export default FulfillmentSettingsPage;
