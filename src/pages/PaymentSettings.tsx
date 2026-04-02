import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, IndianRupee } from 'lucide-react';

const PaymentSettings = () => {
  const { store, setStore } = useStore();
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({
    key_id: '',
    key_secret: '',
    test_mode: true,
  });

  useEffect(() => {
    if (store?.settings?.razorpay) {
      const rp = store.settings.razorpay;
      setForm({
        key_id: rp.key_id || '',
        key_secret: rp.key_secret || '',
        test_mode: rp.test_mode ?? true,
      });
    }
  }, [store]);

  const isConnected = !!form.key_id && !!form.key_secret;

  const handleSave = async () => {
    if (!store) return;
    if (!form.key_id || !form.key_secret) {
      toast.error('Please enter both Key ID and Key Secret');
      return;
    }

    setSaving(true);
    const updatedSettings = {
      ...(store.settings || {}),
      razorpay: {
        key_id: form.key_id,
        key_secret: form.key_secret,
        test_mode: form.test_mode,
      },
    };

    const { error } = await supabase
      .from('stores')
      .update({ settings: updatedSettings })
      .eq('id', store.id);

    if (error) {
      toast.error('Failed to save payment settings');
    } else {
      toast.success('Payment settings saved successfully');
      setStore({ ...store, settings: updatedSettings });
    }
    setSaving(false);
  };

  const handleDisconnect = async () => {
    if (!store) return;
    setSaving(true);
    const updatedSettings = { ...(store.settings || {}) };
    delete updatedSettings.razorpay;

    const { error } = await supabase
      .from('stores')
      .update({ settings: updatedSettings })
      .eq('id', store.id);

    if (error) {
      toast.error('Failed to disconnect');
    } else {
      setForm({ key_id: '', key_secret: '', test_mode: true });
      toast.success('Razorpay disconnected');
      setStore({ ...store, settings: updatedSettings });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-sm text-muted-foreground">
          Connect Razorpay to accept online payments from your customers.
        </p>
      </div>

      {/* Status Banner */}
      <Card className={isConnected ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' : 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20'}>
        <CardContent className="flex items-center gap-3 p-4">
          {isConnected ? (
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
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Not Connected</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Only COD is available until you connect Razorpay
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Razorpay Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IndianRupee className="h-5 w-5" />
            Razorpay Configuration
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
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            <Button onClick={handleSave} disabled={saving}>
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

      {/* Payment Methods Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Available Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Cash on Delivery</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">Always Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">UPI (GPay, PhonePe, Paytm)</span>
              </div>
              <Badge variant="secondary" className={isConnected ? 'bg-green-100 text-green-700' : ''}>
                {isConnected ? 'Active' : 'Requires Razorpay'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Cards & Net Banking</span>
              </div>
              <Badge variant="secondary" className={isConnected ? 'bg-green-100 text-green-700' : ''}>
                {isConnected ? 'Active' : 'Requires Razorpay'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSettings;
