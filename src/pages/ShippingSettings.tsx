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
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');

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

  useEffect(() => {
    if (!loading) setGuideOpen(!isConfigured);
  }, [loading, isConfigured]);

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
      <Card data-tour="ship-credentials">
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

      {/* Step-by-step setup guide — collapsible carousel */}
      {(() => {
        const steps = [
          {
            icon: UserCheck,
            title: 'Create a free Shiprocket account',
            bullets: [
              <>Go to <span className="font-mono">app.shiprocket.in/register</span></>,
              <>Sign up using your business email + 10-digit mobile number</>,
              <>Choose plan <strong>"Lite" (Free — pay-per-shipment)</strong> to start. You can upgrade later.</>,
              <>Verify the OTP sent to your phone & email</>,
            ],
            cta: { href: 'https://app.shiprocket.in/register', label: 'Open Shiprocket Signup' },
          },
          {
            icon: ShieldCheck,
            title: 'Complete KYC (Know Your Customer)',
            bullets: [
              <>In Shiprocket dashboard go to <span className="font-mono">Settings → Company Setup → KYC</span></>,
              <>Upload your <strong>PAN card</strong> (mandatory)</>,
              <>Upload <strong>GST certificate</strong> (mandatory if turnover &gt; ₹40 lakh)</>,
              <>Upload a <strong>cancelled cheque</strong> or bank statement (for COD remittance)</>,
              <>Upload <strong>Aadhaar</strong> of the proprietor / authorised signatory</>,
              <>Approval usually arrives within 4–24 hours by email</>,
            ],
          },
          {
            icon: Warehouse,
            title: 'Add a Pickup Location (warehouse address)',
            bullets: [
              <>Go to <span className="font-mono">Settings → Pickup Addresses → + Add New</span></>,
              <>Give it a short <strong>Nickname</strong> like <span className="font-mono">"Primary"</span> — paste this same nickname in Step 6</>,
              <>Enter the exact address, city, state, pincode and a 10-digit pickup contact number</>,
              <>Wait for the green <strong>"Verified"</strong> tag against the address (usually instant)</>,
              <>Mark this address as <strong>"Primary Pickup"</strong></>,
            ],
            note: {
              tone: 'amber' as const,
              icon: Info,
              text: <>The <strong>nickname</strong> here must match the "Pickup Location Nickname" in Step 6 — character-for-character. Otherwise shipments fail with <em>"Wrong Pickup location entered"</em>.</>,
            },
          },
          {
            icon: Wallet,
            title: 'Recharge your Shiprocket wallet',
            bullets: [
              <>Go to <span className="font-mono">Wallet → Recharge</span> in the Shiprocket dashboard</>,
              <>Add a minimum of <strong>₹500</strong> to start (shipping charges auto-deduct per order)</>,
              <>For COD orders, remittance gets credited to your bank in 8 days (or 2 days on Pro plan)</>,
            ],
          },
          {
            icon: Key,
            title: 'Create a dedicated API User (critical!)',
            bullets: [
              <>Go to <span className="font-mono">Settings → API → Configure</span></>,
              <>Click <strong>"Create an API User"</strong></>,
              <>Enter a <strong>new</strong> email (e.g. <span className="font-mono">api@yourbusiness.com</span>) and a fresh password</>,
              <>Leave <strong>"Allowed IPs for PII Access"</strong> blank (our server uses a rotating IP pool)</>,
              <>Tick all module permissions shown and click <strong>Create User</strong></>,
            ],
            note: {
              tone: 'destructive' as const,
              icon: ShieldCheck,
              text: <>Your normal dashboard login <strong>WILL NOT WORK</strong> — Shiprocket's API returns <em>"Access forbidden"</em>. You MUST create a separate API User.</>,
            },
          },
          {
            icon: Settings2,
            title: 'Paste credentials & pickup address below',
            bullets: [
              <>Fill in the <strong>API credentials</strong> form below</>,
              <>Fill in the <strong>pickup address</strong> form below</>,
              <>Enter the same <strong>pickup nickname</strong> from Step 3</>,
              <>Click <strong>"Test Connection"</strong>, then <strong>"Save Shipping Settings"</strong></>,
            ],
          },
        ];

        const go = (next: number) => {
          if (next < 0 || next >= steps.length || next === activeStep) return;
          setSlideDir(next > activeStep ? 'right' : 'left');
          setActiveStep(next);
        };

        const Step = steps[activeStep];
        const StepIcon = Step.icon;

        return (
          <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/[0.02]">
            <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full group">
                  <CardHeader className="cursor-pointer transition-colors hover:bg-primary/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-left">
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 transition-transform group-hover:scale-110">
                          <Sparkles className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            Complete Shiprocket setup in 6 steps
                            {isConfigured && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {guideOpen ? 'Tap to collapse — swipe through each step below' : `Most sellers go live in 15–30 minutes · ${steps.length} guided steps`}
                          </CardDescription>
                        </div>
                      </div>
                      <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform duration-300', guideOpen && 'rotate-180')} />
                    </div>
                  </CardHeader>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <CardContent className="space-y-4 pt-0">
                  {/* Step pills */}
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {steps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => go(i)}
                        aria-label={`Go to step ${i + 1}`}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-500',
                          i === activeStep ? 'w-8 bg-primary shadow-sm shadow-primary/40' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        )}
                      />
                    ))}
                  </div>

                  {/* Slide viewport */}
                  <div className="relative overflow-hidden rounded-xl border bg-background/80 backdrop-blur">
                    <div
                      key={activeStep}
                      className={cn(
                        'p-5 md:p-6',
                        slideDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20">
                            <StepIcon className="h-5 w-5" />
                          </div>
                          <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-foreground text-[11px] font-bold text-background">
                            {activeStep + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-snug">{Step.title}</p>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
                            Step {activeStep + 1} of {steps.length}
                          </p>
                        </div>
                      </div>

                      <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                        {Step.bullets.map((b, i) => (
                          <li
                            key={i}
                            className="flex gap-2 animate-fade-in"
                            style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
                          >
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                            <span className="leading-relaxed">{b}</span>
                          </li>
                        ))}
                      </ul>

                      {Step.note && (
                        <div
                          className={cn(
                            'mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs animate-fade-in',
                            Step.note.tone === 'amber' && 'border-amber-500/30 bg-amber-500/5',
                            Step.note.tone === 'destructive' && 'border-destructive/30 bg-destructive/5'
                          )}
                          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
                        >
                          <Step.note.icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', Step.note.tone === 'amber' ? 'text-amber-600' : 'text-destructive')} />
                          <p>{Step.note.text}</p>
                        </div>
                      )}

                      {Step.cta && (
                        <Button asChild size="sm" className="mt-4 shadow-md shadow-primary/20">
                          <a href={Step.cta.href} target="_blank" rel="noopener noreferrer">
                            {Step.cta.label} <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Nav controls */}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => go(activeStep - 1)}
                      disabled={activeStep === 0}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {activeStep + 1} / {steps.length}
                    </span>
                    {activeStep < steps.length - 1 ? (
                      <Button size="sm" onClick={() => go(activeStep + 1)} className="gap-1 shadow-md shadow-primary/20">
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setGuideOpen(false)} className="gap-1 shadow-md shadow-primary/20">
                        <CheckCircle2 className="h-4 w-4" /> Got it
                      </Button>
                    )}
                  </div>

                  {/* Helpful external links */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild size="sm" variant="ghost" className="text-xs h-8">
                      <a href="https://app.shiprocket.in/" target="_blank" rel="noopener noreferrer">
                        Dashboard <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="text-xs h-8">
                      <a href="https://app.shiprocket.in/api/dashboard" target="_blank" rel="noopener noreferrer">
                        API → Configure <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="text-xs h-8">
                      <a href="https://apidocs.shiprocket.in/" target="_blank" rel="noopener noreferrer">
                        API docs <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })()}


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
