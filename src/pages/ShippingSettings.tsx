import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Package, Loader2, CheckCircle2, XCircle, MapPin, ExternalLink, KeyRound, ShieldCheck, Info, ChevronDown, ChevronLeft, ChevronRight, Sparkles, UserCheck, Warehouse, Wallet, Key, Settings2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [srEmail, setSrEmail] = useState('');
  const [srPassword, setSrPassword] = useState('');
  const [srPickupName, setSrPickupName] = useState('Primary');
  const [srTesting, setSrTesting] = useState(false);
  const [srTestResult, setSrTestResult] = useState<'success' | 'error' | null>(null);
  const [srTestError, setSrTestError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!store?.id) return;
      setLoading(true);
      const s = (store.settings as any)?.shipping;
      if (s?.pickup) setPickup({ ...emptyPickup, ...s.pickup });
      if (s?.shiprocket_pickup_name) setSrPickupName(s.shiprocket_pickup_name);
      const { data } = await supabase
        .from('store_secrets' as any)
        .select('shiprocket_email, shiprocket_password')
        .eq('store_id', store.id)
        .maybeSingle();
      if (data) {
        setSrEmail((data as any).shiprocket_email || '');
        setSrPassword((data as any).shiprocket_password || '');
      }
      setLoading(false);
    };
    load();
  }, [store?.id]);

  const isConfigured = !!srEmail && !!srPassword && !!pickup.pincode;

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    const settings = {
      ...((store.settings as any) || {}),
      shipping: {
        configured: !!(srEmail && srPassword),
        pickup,
        shiprocket_pickup_name: srPickupName,
        preferred_courier: 'shiprocket',
      },
    };
    const { error } = await supabase.from('stores').update({ settings }).eq('id', store.id);
    const { error: secErr } = await supabase
      .from('store_secrets' as any)
      .upsert({
        store_id: store.id,
        shiprocket_email: srEmail || null,
        shiprocket_password: srPassword || null,
        preferred_courier: 'shiprocket',
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
      toast.error('Enter Shiprocket API-User email & password first');
      return;
    }
    setSrTesting(true);
    setSrTestResult(null);
    setSrTestError(null);
    try {
      const { error: secErr } = await supabase
        .from('store_secrets' as any)
        .upsert({
          store_id: store.id,
          shiprocket_email: srEmail,
          shiprocket_password: srPassword,
          preferred_courier: 'shiprocket',
        }, { onConflict: 'store_id' });
      if (secErr) {
        setSrTestResult('error');
        setSrTestError(secErr.message);
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
      const data = await res.json().catch(() => ({}));
      if (res.ok && !data.error) {
        setSrTestResult('success');
        toast.success('Shiprocket connected successfully!');
      } else {
        const msg = data?.error || `HTTP ${res.status}`;
        setSrTestResult('error');
        setSrTestError(msg);
        toast.error(msg);
      }
    } catch (e: any) {
      setSrTestResult('error');
      setSrTestError(e?.message || 'Network error');
      toast.error('Shiprocket connection failed.');
    }
    setSrTesting(false);
  };

  const updatePickup = (key: keyof PickupAddress, value: string) =>
    setPickup((c) => ({ ...c, [key]: value }));

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shipping Settings</h1>
        <p className="text-sm text-muted-foreground">
          Power your store with <strong>Shiprocket</strong> — India's #1 multi-courier aggregator (17+ couriers, 29,000+ pincodes, 220+ countries).
        </p>
      </div>

      {/* Status banner */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Shiprocket Integration</CardTitle>
                <CardDescription>Compare rates across Delhivery, Ekart, Bluedart, DTDC, Xpressbees & more — automatically</CardDescription>
              </div>
            </div>
            <Badge variant={isConfigured ? 'default' : 'secondary'}>
              {isConfigured ? 'Configured' : 'Not Set Up'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Step-by-step setup guide */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" /> Complete Shiprocket setup in 6 steps
          </CardTitle>
          <CardDescription>
            Follow these in order. Most sellers go live within 15–30 minutes (KYC approval can take up to 24 hours).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Step 1 */}
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">1</span>
              <p className="font-semibold text-sm">Create a free Shiprocket account</p>
            </div>
            <ul className="ml-9 list-disc space-y-1 text-xs text-muted-foreground">
              <li>Go to <span className="font-mono">app.shiprocket.in/register</span></li>
              <li>Sign up using your business email + 10-digit mobile number</li>
              <li>Choose plan <strong>"Lite" (Free — pay-per-shipment)</strong> to start. You can upgrade later.</li>
              <li>Verify the OTP sent to your phone & email</li>
            </ul>
            <Button asChild size="sm" className="ml-9 mt-2">
              <a href="https://app.shiprocket.in/register" target="_blank" rel="noopener noreferrer">
                Open Shiprocket Signup <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          </div>

          {/* Step 2 */}
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">2</span>
              <p className="font-semibold text-sm">Complete KYC (Know Your Customer)</p>
            </div>
            <ul className="ml-9 list-disc space-y-1 text-xs text-muted-foreground">
              <li>In Shiprocket dashboard go to <span className="font-mono">Settings → Company Setup → KYC</span></li>
              <li>Upload your <strong>PAN card</strong> (mandatory)</li>
              <li>Upload <strong>GST certificate</strong> (mandatory if turnover &gt; ₹40 lakh)</li>
              <li>Upload a <strong>cancelled cheque</strong> or bank statement (for COD remittance)</li>
              <li>Upload <strong>Aadhaar</strong> of the proprietor / authorised signatory</li>
              <li>Approval usually arrives within 4–24 hours by email</li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">3</span>
              <p className="font-semibold text-sm">Add a Pickup Location (warehouse address)</p>
            </div>
            <ul className="ml-9 list-disc space-y-1 text-xs text-muted-foreground">
              <li>Go to <span className="font-mono">Settings → Pickup Addresses → + Add New</span></li>
              <li>Give it a short <strong>Nickname</strong> like <span className="font-mono">"Primary"</span> — you'll paste this same nickname below in Step 6</li>
              <li>Enter the exact address, city, state, pincode and a 10-digit pickup contact number</li>
              <li>Wait for the green <strong>"Verified"</strong> tag against the address (usually instant)</li>
              <li>Mark this address as <strong>"Primary Pickup"</strong></li>
            </ul>
            <div className="ml-9 mt-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
              <p>The <strong>nickname</strong> here must match the "Pickup Location Nickname" you enter in Step 6 — character-for-character. If they don't match, shipments will fail with <em>"Wrong Pickup location entered"</em>.</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">4</span>
              <p className="font-semibold text-sm">Recharge your Shiprocket wallet</p>
            </div>
            <ul className="ml-9 list-disc space-y-1 text-xs text-muted-foreground">
              <li>Go to <span className="font-mono">Wallet → Recharge</span> in the Shiprocket dashboard</li>
              <li>Add a minimum of <strong>₹500</strong> to start (shipping charges get auto-deducted per order)</li>
              <li>For COD orders, your COD remittance gets credited to your bank in 8 days (or 2 days on Pro plan)</li>
            </ul>
          </div>

          {/* Step 5 */}
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">5</span>
              <p className="font-semibold text-sm">Create a dedicated API User (critical!)</p>
            </div>
            <ul className="ml-9 list-disc space-y-1 text-xs text-muted-foreground">
              <li>Go to <span className="font-mono">Settings → API → Configure</span></li>
              <li>Click the button <strong>"Create an API User"</strong></li>
              <li>Enter a <strong>new</strong> email (e.g. <span className="font-mono">api@yourbusiness.com</span>) and set a fresh password</li>
              <li>Leave <strong>"Allowed IPs for PII Access"</strong> blank (our server uses a rotating IP pool)</li>
              <li>Tick all module permissions shown and click <strong>Create User</strong></li>
            </ul>
            <div className="ml-9 mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
              <p>
                Your normal dashboard login <strong>WILL NOT WORK</strong> — Shiprocket's API returns <em>"Access forbidden"</em> for dashboard credentials.
                You MUST create a separate API User.
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">6</span>
              <p className="font-semibold text-sm">Paste those API-User credentials & pickup address below</p>
            </div>
            <p className="ml-9 text-xs text-muted-foreground">
              Fill in the three forms below — <strong>API credentials</strong>, <strong>pickup address</strong>, and the <strong>pickup nickname</strong> — then click <strong>"Test Connection"</strong>, then <strong>"Save Shipping Settings"</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild size="sm" variant="outline">
              <a href="https://app.shiprocket.in/" target="_blank" rel="noopener noreferrer">
                Open Shiprocket Dashboard <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="https://app.shiprocket.in/api/dashboard" target="_blank" rel="noopener noreferrer">
                Go to API → Configure <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href="https://apidocs.shiprocket.in/" target="_blank" rel="noopener noreferrer">
                Shiprocket API docs <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shiprocket API-User Credentials</CardTitle>
          <CardDescription>
            Use the email &amp; password of the <strong>API User</strong> you created in Step 5
            (Settings → API → Configure → "Create an API User"). Stored encrypted, never exposed to your storefront.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Shiprocket API-User Email</Label>
            <Input
              type="email"
              placeholder="api@yourbusiness.com"
              value={srEmail}
              onChange={(e) => setSrEmail(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label>Shiprocket API-User Password</Label>
            <Input
              type="password"
              placeholder="Password set for the API User"
              value={srPassword}
              onChange={(e) => setSrPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div className="flex gap-2 items-center">
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
          {srTestResult === 'error' && srTestError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-2">
              <p className="font-medium text-destructive">Shiprocket said: "{srTestError}"</p>
              {/access forbidden|invalid|unauthor/i.test(srTestError) && (
                <p className="text-muted-foreground">
                  This almost always means you're using your <strong>dashboard login</strong>. Go back to Step 5 above — Shiprocket's API only accepts a separate <strong>API User</strong>.
                  Create one at <a className="underline" href="https://app.shiprocket.in/api/dashboard" target="_blank" rel="noopener noreferrer">Settings → API → Configure</a> and paste those credentials.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pickup Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" /> Pickup Address
          </CardTitle>
          <CardDescription>
            The warehouse Shiprocket couriers will collect packages from. Must exactly match the address you added in Step 3.
          </CardDescription>
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
            <div className="md:col-span-2 space-y-2">
              <Label>Pickup Location Nickname *</Label>
              <Input
                placeholder="Primary"
                value={srPickupName}
                onChange={(e) => setSrPickupName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                <strong>Must match exactly</strong> the nickname you set in Shiprocket → Settings → Pickup Addresses (Step 3).
                Case-sensitive. Default is <span className="font-mono">Primary</span>.
              </p>
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
