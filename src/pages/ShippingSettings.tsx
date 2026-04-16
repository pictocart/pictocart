import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Truck, Loader2, CheckCircle2, XCircle, MapPin } from 'lucide-react';

interface PickupAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const emptyPickup: PickupAddress = { name: '', phone: '', address: '', city: '', state: '', pincode: '' };

const ShippingSettings = () => {
  const { store, setStore } = useStore();
  const [pickup, setPickup] = useState<PickupAddress>(emptyPickup);
  const [apiToken, setApiToken] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!store?.id) return;
      setLoading(true);
      // Pickup address (non-secret) lives in stores.settings.shipping
      const s = (store.settings as any)?.shipping;
      if (s?.pickup) setPickup({ ...emptyPickup, ...s.pickup });
      // Token (secret) lives in store_secrets
      const { data } = await supabase
        .from('store_secrets' as any)
        .select('delhivery_api_token, delhivery_test_mode')
        .eq('store_id', store.id)
        .maybeSingle();
      if (data) {
        setApiToken((data as any).delhivery_api_token || '');
        setTestMode((data as any).delhivery_test_mode ?? true);
      }
      setLoading(false);
    };
    load();
  }, [store?.id]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);

    // Save pickup + flags (NO api_token) to public settings
    const settings = {
      ...((store.settings as any) || {}),
      shipping: {
        configured: !!apiToken,
        test_mode: testMode,
        pickup,
      },
    };
    const { error } = await supabase.from('stores').update({ settings }).eq('id', store.id);

    // Save token to private store_secrets
    const { error: secErr } = await supabase
      .from('store_secrets' as any)
      .upsert({
        store_id: store.id,
        delhivery_api_token: apiToken || null,
        delhivery_test_mode: testMode,
      }, { onConflict: 'store_id' });

    if (error || secErr) {
      toast.error('Failed to save shipping settings');
    } else {
      toast.success('Shipping settings saved');
      setStore({ ...store, settings });
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!store?.id) return;
    if (!apiToken || !pickup.pincode) {
      toast.error('Enter API token and pickup pincode first, then save before testing');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/delhivery-proxy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check-serviceability',
            store_id: store.id,
            destination_pincode: '110001',
          }),
        }
      );
      if (res.ok) {
        setTestResult('success');
        toast.success('Connection successful! Delhivery API is working.');
      } else {
        setTestResult('error');
        toast.error('Connection failed. Save your settings, then try again.');
      }
    } catch {
      setTestResult('error');
      toast.error('Connection failed.');
    }
    setTesting(false);
  };

  const updatePickup = (key: keyof PickupAddress, value: string) =>
    setPickup((c) => ({ ...c, [key]: value }));

  const isConfigured = !!apiToken && !!pickup.pincode;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shipping Settings</h1>
        <p className="text-sm text-muted-foreground">Configure Delhivery for automated shipping</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Delhivery Integration</CardTitle>
                <CardDescription>Ship orders with India's leading logistics partner</CardDescription>
              </div>
            </div>
            <Badge variant={isConfigured ? 'default' : 'secondary'}>
              {isConfigured ? 'Configured' : 'Not Set Up'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Credentials</CardTitle>
          <CardDescription>
            API token is stored securely server-side and never sent to storefront visitors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Token</Label>
            <Input
              type="password"
              placeholder="Enter your Delhivery API Token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Test Mode</p>
              <p className="text-xs text-muted-foreground">Use staging API for testing</p>
            </div>
            <Switch
              checked={testMode}
              onCheckedChange={setTestMode}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleTestConnection} variant="outline" disabled={testing || !apiToken}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Test Connection
            </Button>
            {testResult === 'success' && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Connected
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <XCircle className="h-4 w-4" /> Failed
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" /> Pickup Address
          </CardTitle>
          <CardDescription>Where Delhivery will pick up your packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Name *</Label>
              <Input placeholder="Warehouse contact name" value={pickup.name} onChange={(e) => updatePickup('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input placeholder="10-digit phone number" value={pickup.phone} onChange={(e) => updatePickup('phone', e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Address *</Label>
              <Input placeholder="Full pickup address" value={pickup.address} onChange={(e) => updatePickup('address', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input placeholder="City" value={pickup.city} onChange={(e) => updatePickup('city', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input placeholder="State" value={pickup.state} onChange={(e) => updatePickup('state', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pincode *</Label>
              <Input placeholder="6-digit pincode" value={pickup.pincode} onChange={(e) => updatePickup('pincode', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Shipping Settings
        </Button>
      </div>
    </div>
  );
};

export default ShippingSettings;
