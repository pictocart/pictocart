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
import { Truck, Loader2, CheckCircle2, XCircle, MapPin, ExternalLink, KeyRound, Package } from 'lucide-react';

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
  const [registering, setRegistering] = useState(false);

  // Shiprocket
  const [srEmail, setSrEmail] = useState('');
  const [srPassword, setSrPassword] = useState('');
  const [srPickupName, setSrPickupName] = useState('Primary');
  const [srTesting, setSrTesting] = useState(false);
  const [srTestResult, setSrTestResult] = useState<'success' | 'error' | null>(null);

  const [preferredCourier, setPreferredCourier] = useState<'delhivery' | 'shiprocket'>('delhivery');

  useEffect(() => {
    const load = async () => {
      if (!store?.id) return;
      setLoading(true);
      const s = (store.settings as any)?.shipping;
      if (s?.pickup) setPickup({ ...emptyPickup, ...s.pickup });
      if (s?.shiprocket_pickup_name) setSrPickupName(s.shiprocket_pickup_name);
      const { data } = await supabase
        .from('store_secrets' as any)
        .select('delhivery_api_token, delhivery_test_mode, shiprocket_email, shiprocket_password, preferred_courier')
        .eq('store_id', store.id)
        .maybeSingle();
      if (data) {
        setApiToken((data as any).delhivery_api_token || '');
        setTestMode((data as any).delhivery_test_mode ?? true);
        setSrEmail((data as any).shiprocket_email || '');
        setSrPassword((data as any).shiprocket_password || '');
        setPreferredCourier(((data as any).preferred_courier || 'delhivery') as any);
      }
      setLoading(false);
    };
    load();
  }, [store?.id]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);

    const settings = {
      ...((store.settings as any) || {}),
      shipping: {
        configured: !!apiToken || !!(srEmail && srPassword),
        test_mode: testMode,
        pickup,
        shiprocket_pickup_name: srPickupName,
        preferred_courier: preferredCourier,
      },
    };
    const { error } = await supabase.from('stores').update({ settings }).eq('id', store.id);

    const { error: secErr } = await supabase
      .from('store_secrets' as any)
      .upsert({
        store_id: store.id,
        delhivery_api_token: apiToken || null,
        delhivery_test_mode: testMode,
        shiprocket_email: srEmail || null,
        shiprocket_password: srPassword || null,
        preferred_courier: preferredCourier,
      }, { onConflict: 'store_id' });

    if (error || secErr) {
      toast.error('Failed to save shipping settings');
    } else {
      toast.success('Shipping settings saved');
      setStore({ ...store, settings });
    }
    setSaving(false);
  };

  const handleTestShiprocket = async () => {
    if (!store?.id) return;
    if (!srEmail || !srPassword) {
      toast.error('Enter Shiprocket email & password first');
      return;
    }
    setSrTesting(true);
    setSrTestResult(null);
    try {
      // Auto-save credentials first so the proxy can read them
      const { error: secErr } = await supabase
        .from('store_secrets' as any)
        .upsert({
          store_id: store.id,
          shiprocket_email: srEmail,
          shiprocket_password: srPassword,
          preferred_courier: preferredCourier,
        }, { onConflict: 'store_id' });
      if (secErr) {
        setSrTestResult('error');
        toast.error('Could not save credentials: ' + secErr.message);
        setSrTesting(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shiprocket-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            action: 'serviceability',
            store_id: store.id,
            pickup_pincode: pickup.pincode || '110001',
            delivery_pincode: '560001',
            weight: 0.5,
            cod: 0,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && !data.error) {
        setSrTestResult('success');
        toast.success('Shiprocket connected successfully!');
      } else {
        setSrTestResult('error');
        toast.error(data.error || 'Shiprocket connection failed. Check your email & password.');
      }
    } catch {
      setSrTestResult('error');
      toast.error('Shiprocket connection failed.');
    }
    setSrTesting(false);
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

  const handleRegisterWarehouse = async () => {
    if (!store?.id) return;
    if (!apiToken) { toast.error('Save your API token first'); return; }
    if (!pickup.name || !pickup.phone || !pickup.address || !pickup.city || !pickup.state || !pickup.pincode) {
      toast.error('Fill in all pickup address fields, save, then register');
      return;
    }
    setRegistering(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/delhivery-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            action: 'register-warehouse',
            store_id: store.id,
            warehouse: pickup,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to register warehouse with Delhivery');
      } else if (data.already_exists) {
        toast.success(`Warehouse "${pickup.name}" is already registered in Delhivery ✓`);
      } else {
        toast.success(`Warehouse "${pickup.name}" registered with Delhivery!`);
      }
    } catch {
      toast.error('Failed to register warehouse');
    }
    setRegistering(false);
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

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" /> Don't have a Delhivery API token?
          </CardTitle>
          <CardDescription>
            Sign up as a Delhivery business shipper and generate your API key in 4 steps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
              <div>
                <p className="font-medium">Create a Delhivery One business account</p>
                <p className="text-muted-foreground text-xs">Sign up with your business name, GSTIN and pickup address. Approval is usually same-day.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
              <div>
                <p className="font-medium">Complete KYC & add a pickup location</p>
                <p className="text-muted-foreground text-xs">Upload PAN, GST and a cancelled cheque. Add the warehouse address you'll dispatch from.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>
              <div>
                <p className="font-medium">Open Settings → API in the Delhivery One panel</p>
                <p className="text-muted-foreground text-xs">Once approved, go to <span className="font-mono">one.delhivery.com</span> → Settings → API & click <strong>Generate API Token</strong>.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">4</span>
              <div>
                <p className="font-medium">Copy the token and paste it below</p>
                <p className="text-muted-foreground text-xs">Use the staging token first with Test Mode ON, then switch to the live token before going live.</p>
              </div>
            </li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild size="sm">
              <a href="https://www.delhivery.com/partner-with-us/" target="_blank" rel="noopener noreferrer">
                Sign up on Delhivery <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="https://one.delhivery.com/" target="_blank" rel="noopener noreferrer">
                Open Delhivery One <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href="https://track.delhivery.com/api-portal/" target="_blank" rel="noopener noreferrer">
                API docs <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          </div>
        </CardContent>
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
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <p className="text-sm font-medium">Register this pickup with Delhivery</p>
            <p className="text-xs text-muted-foreground">
              Delhivery requires the <strong>Contact Name</strong> above to exactly match a registered warehouse name in your Delhivery account.
              Save your settings, then click below to register this address as a pickup warehouse. (If "ClientWarehouse matching query does not exist" appears when shipping, it means this step is needed.)
            </p>
            <Button size="sm" variant="outline" onClick={handleRegisterWarehouse} disabled={registering || !apiToken}>
              {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Register Warehouse with Delhivery
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shiprocket Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Shiprocket Integration</CardTitle>
                <CardDescription>Multi-courier aggregator — compare rates across 17+ partners</CardDescription>
              </div>
            </div>
            <Badge variant={srEmail && srPassword ? 'default' : 'secondary'}>
              {srEmail && srPassword ? 'Configured' : 'Not Set Up'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" /> Don't have a Shiprocket account?
          </CardTitle>
          <CardDescription>
            Sign up free, complete KYC, register a pickup location, then paste your login below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
              <div>
                <p className="font-medium">Sign up on Shiprocket</p>
                <p className="text-muted-foreground text-xs">Free account — no monthly fees on the basic plan.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
              <div>
                <p className="font-medium">Complete KYC & add a Pickup Location</p>
                <p className="text-muted-foreground text-xs">In Shiprocket → Settings → Pickup Addresses. Note the <strong>nickname</strong> you give it (e.g. "Primary").</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>
              <div>
                <p className="font-medium">Paste your login email & password below</p>
                <p className="text-muted-foreground text-xs">We use them to fetch a short-lived API token; stored encrypted server-side, never exposed to the storefront.</p>
              </div>
            </li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild size="sm">
              <a href="https://app.shiprocket.in/register" target="_blank" rel="noopener noreferrer">
                Sign up on Shiprocket <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="https://app.shiprocket.in/" target="_blank" rel="noopener noreferrer">
                Open Shiprocket panel <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href="https://apidocs.shiprocket.in/" target="_blank" rel="noopener noreferrer">
                API docs <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shiprocket Credentials</CardTitle>
          <CardDescription>Login email & password from your Shiprocket account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Shiprocket Email</Label>
            <Input
              type="email"
              placeholder="you@yourbusiness.com"
              value={srEmail}
              onChange={(e) => setSrEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Shiprocket Password</Label>
            <Input
              type="password"
              placeholder="Your Shiprocket login password"
              value={srPassword}
              onChange={(e) => setSrPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Pickup Location Nickname</Label>
            <Input
              placeholder="Primary"
              value={srPickupName}
              onChange={(e) => setSrPickupName(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Must match exactly the nickname registered in Shiprocket → Settings → Pickup Addresses.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleTestShiprocket} variant="outline" disabled={srTesting || !srEmail || !srPassword}>
              {srTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Test Connection
            </Button>
            {srTestResult === 'success' && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Connected
              </div>
            )}
            {srTestResult === 'error' && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <XCircle className="h-4 w-4" /> Failed
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Default courier */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Courier</CardTitle>
          <CardDescription>Pre-selected provider in the Ship Order dialog. Sellers can still switch per-order.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {(['delhivery', 'shiprocket'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreferredCourier(p)}
                className={`rounded-md border px-3 py-2 text-sm font-medium capitalize transition ${
                  preferredCourier === p ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ))}
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
