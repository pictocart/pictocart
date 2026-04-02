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

interface ShippingConfig {
  api_token: string;
  test_mode: boolean;
  pickup: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

const emptyConfig: ShippingConfig = {
  api_token: '',
  test_mode: true,
  pickup: { name: '', phone: '', address: '', city: '', state: '', pincode: '' },
};

const ShippingSettings = () => {
  const { store, setStore } = useStore();
  const [config, setConfig] = useState<ShippingConfig>(emptyConfig);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (store?.settings) {
      const s = store.settings as any;
      if (s?.shipping) {
        setConfig({ ...emptyConfig, ...s.shipping });
      }
    }
  }, [store]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    const settings = { ...(store.settings as any), shipping: config };
    const { error } = await supabase
      .from('stores')
      .update({ settings })
      .eq('id', store.id);

    if (error) {
      toast.error('Failed to save shipping settings');
    } else {
      toast.success('Shipping settings saved');
      setStore({ ...store, settings });
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!config.api_token || !config.pickup.pincode) {
      toast.error('Enter API token and pickup pincode first');
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
            api_token: config.api_token,
            test_mode: config.test_mode,
            origin_pincode: config.pickup.pincode,
            destination_pincode: '110001', // Delhi for test
          }),
        }
      );
      if (res.ok) {
        setTestResult('success');
        toast.success('Connection successful! Delhivery API is working.');
      } else {
        setTestResult('error');
        toast.error('Connection failed. Check your API token.');
      }
    } catch {
      setTestResult('error');
      toast.error('Connection failed.');
    }
    setTesting(false);
  };

  const updatePickup = (key: string, value: string) =>
    setConfig((c) => ({ ...c, pickup: { ...c.pickup, [key]: value } }));

  const isConfigured = !!config.api_token && !!config.pickup.pincode;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shipping Settings</h1>
        <p className="text-sm text-muted-foreground">Configure Delhivery for automated shipping</p>
      </div>

      {/* Status */}
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

      {/* API Token */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Credentials</CardTitle>
          <CardDescription>Get your API token from the Delhivery partner dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Token</Label>
            <Input
              type="password"
              placeholder="Enter your Delhivery API Token"
              value={config.api_token}
              onChange={(e) => setConfig((c) => ({ ...c, api_token: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Test Mode</p>
              <p className="text-xs text-muted-foreground">Use staging API for testing</p>
            </div>
            <Switch
              checked={config.test_mode}
              onCheckedChange={(checked) => setConfig((c) => ({ ...c, test_mode: checked }))}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleTestConnection} variant="outline" disabled={testing || !config.api_token}>
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

      {/* Pickup Address */}
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
              <Input
                placeholder="Warehouse contact name"
                value={config.pickup.name}
                onChange={(e) => updatePickup('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                placeholder="10-digit phone number"
                value={config.pickup.phone}
                onChange={(e) => updatePickup('phone', e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Address *</Label>
              <Input
                placeholder="Full pickup address"
                value={config.pickup.address}
                onChange={(e) => updatePickup('address', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input
                placeholder="City"
                value={config.pickup.city}
                onChange={(e) => updatePickup('city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input
                placeholder="State"
                value={config.pickup.state}
                onChange={(e) => updatePickup('state', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pincode *</Label>
              <Input
                placeholder="6-digit pincode"
                value={config.pickup.pincode}
                onChange={(e) => updatePickup('pincode', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Shipping Settings
        </Button>
      </div>
    </div>
  );
};

export default ShippingSettings;
