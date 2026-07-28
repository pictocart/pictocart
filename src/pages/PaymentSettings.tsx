import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  IndianRupee,
  Banknote,
  Smartphone,
  Store as StoreIcon,
  ExternalLink,
  ShieldCheck,
  Globe,
  Key,
  ArrowRight,
} from 'lucide-react';

const FNB_KEYWORDS = ['food', 'food_beverages', 'food-and-beverages', 'restaurant', 'cafe'];

const DomainVerificationDialog = ({
  open,
  onClose,
  storeUrl,
}: {
  open: boolean;
  onClose: () => void;
  storeUrl: string;
}) => (
  <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5 text-primary" />
          Keys saved — one more step
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-1">
        <p className="text-sm text-muted-foreground">
          Your Razorpay API keys are stored securely. Before your customers can pay online,
          you need to <strong>register your website</strong> on Razorpay so their gateway
          authorises payments from your domain.
        </p>

        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 p-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Why is this needed?</strong> Razorpay live mode only processes payments
          from approved websites. Without this, customers will see "issue with merchant" error.
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Follow these steps on Razorpay:</p>

          {[
            {
              icon: ExternalLink,
              step: '1',
              title: 'Open Razorpay Business Website Details',
              desc: 'Go to Account & Settings → Business Website Details',
              link: 'https://dashboard.razorpay.com/app/website-app-settings/business-website-details',
              linkLabel: 'Open Razorpay →',
            },
            {
              icon: Globe,
              step: '2',
              title: 'Add your website URL',
              desc: `Click "Add additional website/app" and enter your store URL`,
              highlight: storeUrl,
            },
            {
              icon: ShieldCheck,
              step: '3',
              title: 'Wait for approval',
              desc: 'Razorpay reviews and approves websites within 24–48 hours.',
            },
            {
              icon: CheckCircle2,
              step: '4',
              title: 'Toggle "Domain Verified" below',
              desc: 'Once approved, come back here and turn on the "Domain Verified" toggle to activate online payments.',
            },
          ].map(({ icon: Icon, step, title, desc, link, linkLabel, highlight }) => (
            <div key={step} className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {step}
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
                {highlight && (
                  <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">{highlight}</code>
                )}
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary underline mt-0.5"
                  >
                    {linkLabel} <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

const PaymentSettings = () => {
  const { store, setStore } = useStore();
  const isFnB = !!store?.category && FNB_KEYWORDS.includes(String(store.category).toLowerCase());

  // -------- Online (Razorpay) state --------
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({ key_id: '', key_secret: '', test_mode: true });
  const [domainVerified, setDomainVerified] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [showKeySavedPopup, setShowKeySavedPopup] = useState(false);

  // -------- Offline payment modes state --------
  const existingOffline = (store?.settings as any)?.offline_payments;
  const [offline, setOffline] = useState({
    cash: existingOffline?.cash ?? true,
    upi: existingOffline?.upi ?? isFnB,
    card: existingOffline?.card ?? isFnB,
  });
  const [savingOffline, setSavingOffline] = useState(false);

  useEffect(() => {
    if (existingOffline) {
      setOffline({
        cash: existingOffline.cash ?? true,
        upi: existingOffline.upi ?? false,
        card: existingOffline.card ?? false,
      });
    } else {
      setOffline({ cash: true, upi: isFnB, card: isFnB });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  useEffect(() => {
    const load = async () => {
      if (!store?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('store_secrets' as any)
        .select('razorpay_key_id, razorpay_key_secret, razorpay_test_mode, razorpay_domain_verified')
        .eq('store_id', store.id)
        .maybeSingle();
      if (data) {
        setForm({
          key_id: (data as any).razorpay_key_id || '',
          key_secret: (data as any).razorpay_key_secret || '',
          test_mode: (data as any).razorpay_test_mode ?? true,
        });
        setDomainVerified(!!(data as any).razorpay_domain_verified);
      }
      setLoading(false);
    };
    load();
  }, [store?.id]);

  const isConnected = !!form.key_id && !!form.key_secret;
  // Online payments are active only when keys are set AND domain is verified (or test mode)
  const onlinePaymentsActive = isConnected && (form.test_mode || domainVerified);

  const storeUrl = store?.custom_domain 
    ? `https://${store.custom_domain}`
    : store?.slug 
      ? `https://www.pictocart.in/store/${store.slug}` 
      : 'https://www.pictocart.in';

  const handleSave = async () => {
    if (!store) return;
    if (!form.key_id || !form.key_secret) {
      toast.error('Please enter both Key ID and Key Secret');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('store_secrets' as any)
      .upsert({
        store_id: store.id,
        razorpay_key_id: form.key_id,
        razorpay_key_secret: form.key_secret,
        razorpay_test_mode: form.test_mode,
      }, { onConflict: 'store_id' });
    if (error) {
      toast.error('Failed to save payment settings');
    } else {
      const updatedSettings = {
        ...((store.settings as any) || {}),
        razorpay: {
          connected: true,
          test_mode: form.test_mode,
          domain_verified: domainVerified,
        },
      };
      await supabase.from('stores').update({ settings: updatedSettings }).eq('id', store.id);
      setStore({ ...store, settings: updatedSettings });
      toast.success('Keys saved successfully');
      // Show domain verification popup only in live mode
      if (!form.test_mode) {
        setShowKeySavedPopup(true);
      }
    }
    setSaving(false);
  };

  const handleDisconnect = async () => {
    if (!store) return;
    setSaving(true);
    await supabase
      .from('store_secrets' as any)
      .update({ razorpay_key_id: null, razorpay_key_secret: null, razorpay_domain_verified: false })
      .eq('store_id', store.id);
    const updatedSettings = { ...((store.settings as any) || {}) };
    delete updatedSettings.razorpay;
    await supabase.from('stores').update({ settings: updatedSettings }).eq('id', store.id);
    setForm({ key_id: '', key_secret: '', test_mode: true });
    setDomainVerified(false);
    setStore({ ...store, settings: updatedSettings });
    toast.success('Razorpay disconnected');
    setSaving(false);
  };

  const handleDomainVerifiedToggle = async (value: boolean) => {
    if (!store) return;
    setSavingDomain(true);
    const { error } = await supabase
      .from('store_secrets' as any)
      .upsert({
        store_id: store.id,
        razorpay_domain_verified: value,
      }, { onConflict: 'store_id' });
    if (error) {
      toast.error('Failed to update domain verification status');
    } else {
      setDomainVerified(value);
      // Sync domain_verified into stores.settings so checkout can read it without secrets
      const updatedSettings = {
        ...((store.settings as any) || {}),
        razorpay: {
          ...((store.settings as any)?.razorpay || {}),
          connected: isConnected,
          domain_verified: value,
        },
      };
      await supabase.from('stores').update({ settings: updatedSettings }).eq('id', store.id);
      setStore({ ...store, settings: updatedSettings });
      if (value) {
        toast.success('Domain verified — online payments are now active!');
      } else {
        toast.info('Online payments paused — domain marked as unverified');
      }
    }
    setSavingDomain(false);
  };

  const saveOffline = async (next: typeof offline) => {
    if (!store) return;
    setSavingOffline(true);
    const updatedSettings = {
      ...((store.settings as any) || {}),
      offline_payments: next,
    };
    const { error } = await supabase
      .from('stores')
      .update({ settings: updatedSettings })
      .eq('id', store.id);
    if (error) {
      toast.error('Failed to save offline modes');
    } else {
      setStore({ ...store, settings: updatedSettings });
      toast.success('Offline payment modes updated');
    }
    setSavingOffline(false);
  };

  const toggleOffline = (key: 'cash' | 'upi' | 'card', value: boolean) => {
    const next = { ...offline, [key]: value };
    setOffline(next);
    saveOffline(next);
  };

  const anyOfflineOn = offline.cash || offline.upi || offline.card;

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how you accept money — online via gateway, or offline at your counter.
        </p>
      </div>

      <Tabs defaultValue="online" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="online" className="gap-2">
            <CreditCard className="h-4 w-4" /> Online
          </TabsTrigger>
          <TabsTrigger value="offline" className="gap-2">
            <StoreIcon className="h-4 w-4" /> Offline
            {isFnB && <Badge variant="secondary" className="ml-1 text-[10px]">Recommended</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ============= ONLINE TAB ============= */}
        <TabsContent value="online" className="space-y-6">

          {/* Status banner */}
          <Card className={
            onlinePaymentsActive
              ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
              : 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20'
          }>
            <CardContent className="flex items-center gap-3 p-4">
              {onlinePaymentsActive ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Razorpay Connected</p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {form.test_mode ? 'Test mode — no real charges' : 'Live mode — accepting real payments'}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {form.test_mode ? 'Test' : 'Live'}
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {isConnected && !form.test_mode && !domainVerified
                        ? 'Domain not verified — online payments inactive'
                        : 'Not Connected'}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      {isConnected && !form.test_mode && !domainVerified
                        ? 'Verify your domain on Razorpay, then toggle "Domain Verified" below'
                        : 'Only COD is available until you connect Razorpay'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Keys config */}
          <Card data-tour="pay-razorpay-key">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <IndianRupee className="h-5 w-5" /> Razorpay Configuration
              </CardTitle>
              <CardDescription>
                Get your API keys from{' '}
                <a
                  href="https://dashboard.razorpay.com/app/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Razorpay Dashboard → Settings → API Keys
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Key ID</Label>
                <Input
                  placeholder="rzp_test_xxxxxxxxxx or rzp_live_xxxxxxxxxx"
                  value={form.key_id}
                  onChange={(e) => setForm((f) => ({ ...f, key_id: e.target.value }))}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Key Secret</Label>
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Enter your Razorpay Key Secret"
                    value={form.key_secret}
                    onChange={(e) => setForm((f) => ({ ...f, key_secret: e.target.value }))}
                    className="pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Stored securely server-side — never exposed to your storefront visitors.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Test Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Use test keys to simulate payments without real money
                  </p>
                </div>
                <Switch
                  checked={form.test_mode}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, test_mode: v }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving || loading}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
                {isConnected && (
                  <Button variant="outline" onClick={handleDisconnect} disabled={saving}>
                    Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Domain verification — only shown in live mode with keys set */}
          {isConnected && !form.test_mode && (
            <Card className={domainVerified ? 'border-green-200' : 'border-orange-200'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4" />
                  Domain Verification
                </CardTitle>
                <CardDescription>
                  Razorpay live mode requires your website to be registered and approved on their
                  dashboard before payments can be processed.{' '}
                  <a
                    href="https://dashboard.razorpay.com/app/website-app-settings/business-website-details"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-0.5"
                  >
                    Verify on Razorpay <ExternalLink className="h-3 w-3" />
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`flex items-center justify-between rounded-lg border p-3 ${domainVerified ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200' : 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-1.5 ${domainVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        I have verified my domain on Razorpay and I am eligible for accepting payments on my site
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {domainVerified
                          ? 'Online payment gateway is active for your customers'
                          : 'Toggle ON after your domain is approved on Razorpay to open the payment gateway'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={domainVerified}
                    disabled={savingDomain}
                    onCheckedChange={handleDomainVerifiedToggle}
                    className="shrink-0 ml-3"
                  />
                </div>

                {!domainVerified && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">How to verify:</p>
                    {[
                      'Go to Razorpay → Account & Settings → Business Website Details',
                      `Add your site URL: https://www.pictocart.in`,
                      'Wait 24–48 hrs for Razorpay approval',
                      'Come back here and toggle ON above',
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Online methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Online Methods Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium">Cash on Delivery</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">Always Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium">UPI (GPay, PhonePe, Paytm)</span>
                  <Badge variant="secondary" className={onlinePaymentsActive ? 'bg-green-100 text-green-700' : ''}>
                    {onlinePaymentsActive ? 'Active' : 'Requires Razorpay'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium">Cards & Net Banking</span>
                  <Badge variant="secondary" className={onlinePaymentsActive ? 'bg-green-100 text-green-700' : ''}>
                    {onlinePaymentsActive ? 'Active' : 'Requires Razorpay'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= OFFLINE TAB ============= */}
        <TabsContent value="offline" className="space-y-6">
          <Card className={anyOfflineOn ? 'border-green-200 bg-green-50/50' : 'border-yellow-200 bg-yellow-50/50'}>
            <CardContent className="flex items-center gap-3 p-4">
              {anyOfflineOn ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Offline collection active</p>
                    <p className="text-xs text-green-600">
                      You can collect payment at the counter from order details.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">No offline modes enabled</p>
                    <p className="text-xs text-yellow-600">
                      Enable at least one mode to record payments collected in person.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">In-Store Payment Modes</CardTitle>
              <CardDescription>
                {isFnB
                  ? 'Restaurants & cafes typically accept all three. Toggle off any mode you do not support.'
                  : 'Pick which offline modes you accept at delivery or pickup. Staff will see these on the order page.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'cash' as const, label: 'Cash', icon: Banknote, hint: 'Hand-to-hand cash collection' },
                { key: 'upi' as const, label: 'UPI', icon: Smartphone, hint: 'GPay, PhonePe, Paytm QR — no gateway fee' },
                { key: 'card' as const, label: 'Card (POS)', icon: CreditCard, hint: 'Swipe/tap on your own POS machine' },
              ].map((m) => (
                <div key={m.key} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <m.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.hint}</p>
                    </div>
                  </div>
                  <Switch
                    checked={offline[m.key]}
                    disabled={savingOffline}
                    onCheckedChange={(v) => toggleOffline(m.key, v)}
                  />
                </div>
              ))}

              <p className="text-xs text-muted-foreground pt-2">
                Enabled modes appear as quick-tap tiles on every unpaid order under{' '}
                <span className="font-medium">Order Details → Collect Payment</span>. Marking an
                order as paid here updates your dashboard revenue instantly.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Post-save domain verification popup */}
      <DomainVerificationDialog
        open={showKeySavedPopup}
        onClose={() => setShowKeySavedPopup(false)}
        storeUrl={storeUrl}
      />
    </div>
  );
};

export default PaymentSettings;
