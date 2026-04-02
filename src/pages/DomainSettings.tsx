import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface DomainConfig {
  domain: string;
  verified: boolean;
  verification_token: string;
  connected_at: string | null;
}

const PLATFORM_IP = '185.158.133.1';

const generateToken = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'aca_verify_';
  for (let i = 0; i < 16; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
};

const DomainSettings = () => {
  const { store, setStore } = useStore();
  const [domain, setDomain] = useState('');
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    txt_ok: boolean;
    a_ok: boolean;
  } | null>(null);

  useEffect(() => {
    if (store?.settings) {
      const s = store.settings as any;
      if (s?.domain) {
        setConfig(s.domain);
        setDomain(s.domain.domain || '');
      }
    }
  }, [store]);

  const storeUrl = store ? `${window.location.origin}/store/${store.slug}` : '';

  const handleSaveDomain = async () => {
    if (!store) return;
    if (!domain.trim()) {
      toast.error('Enter a domain name');
      return;
    }

    // Clean domain
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').trim();

    setSaving(true);
    const newConfig: DomainConfig = {
      domain: cleanDomain,
      verified: false,
      verification_token: config?.verification_token || generateToken(),
      connected_at: null,
    };

    const settings = { ...(store.settings as any), domain: newConfig };
    const { error } = await supabase
      .from('stores')
      .update({ settings })
      .eq('id', store.id);

    if (error) {
      toast.error('Failed to save domain');
    } else {
      setConfig(newConfig);
      setDomain(cleanDomain);
      setStore({ ...store, settings });
      toast.success('Domain saved — now configure your DNS records');
    }
    setSaving(false);
  };

  const handleVerify = async () => {
    if (!config?.domain || !store) return;
    setVerifying(true);
    setVerificationResult(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/verify-domain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: config.domain,
            verification_token: config.verification_token,
            expected_ip: PLATFORM_IP,
          }),
        }
      );

      const data = await res.json();
      setVerificationResult({ txt_ok: data.txt_verified, a_ok: data.a_verified });

      if (data.txt_verified && data.a_verified) {
        // Mark as verified
        const updatedConfig = { ...config, verified: true, connected_at: new Date().toISOString() };
        const settings = { ...(store.settings as any), domain: updatedConfig };
        await supabase.from('stores').update({ settings }).eq('id', store.id);
        setConfig(updatedConfig);
        setStore({ ...store, settings });
        toast.success('Domain verified and connected!');
      } else {
        toast.error('DNS records not yet configured correctly. Please check and try again.');
      }
    } catch {
      toast.error('Verification failed — please try again');
    }
    setVerifying(false);
  };

  const handleRemoveDomain = async () => {
    if (!store) return;
    const settings = { ...(store.settings as any) };
    delete settings.domain;
    await supabase.from('stores').update({ settings }).eq('id', store.id);
    setConfig(null);
    setDomain('');
    setStore({ ...store, settings });
    toast.success('Domain removed');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const statusBadge = () => {
    if (!config) return <Badge variant="secondary">Not Configured</Badge>;
    if (config.verified) return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Pending Verification</Badge>;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Custom Domain</h1>
        <p className="text-sm text-muted-foreground">Connect your own domain to your store</p>
      </div>

      {/* Current store URL */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Store URL</CardTitle>
                <CardDescription>Your store is currently accessible at:</CardDescription>
              </div>
            </div>
            {statusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
            <code className="flex-1 text-sm font-mono truncate">{storeUrl}</code>
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(storeUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          {config?.verified && config.domain && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <code className="flex-1 text-sm font-mono text-green-800 truncate">
                https://{config.domain}
              </code>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`https://${config.domain}`)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Domain Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {config?.domain ? 'Connected Domain' : 'Connect a Domain'}
          </CardTitle>
          <CardDescription>
            Enter your domain name — we'll guide you through DNS setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Domain Name</Label>
            <div className="flex gap-2">
              <Input
                placeholder="mystore.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={config?.verified}
              />
              {!config?.verified && (
                <Button onClick={handleSaveDomain} disabled={saving || !domain.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Enter without http:// or www — e.g., <code>mystore.com</code>
            </p>
          </div>
          {config?.verified && (
            <Button variant="destructive" size="sm" onClick={handleRemoveDomain}>
              Remove Domain
            </Button>
          )}
        </CardContent>
      </Card>

      {/* DNS Instructions */}
      {config && !config.verified && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              DNS Configuration Required
            </CardTitle>
            <CardDescription>
              Add these records at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: A Record */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <h3 className="text-sm font-semibold">Add A Record (points domain to our servers)</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <p className="font-mono font-medium">A</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name / Host</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono font-medium">@</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard('@')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Value / Points to</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono font-medium">{PLATFORM_IP}</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(PLATFORM_IP)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: TXT Record */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <h3 className="text-sm font-semibold">Add TXT Record (verifies ownership)</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <p className="font-mono font-medium">TXT</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name / Host</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono font-medium">_aca</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard('_aca')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Value</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono font-medium text-xs break-all">{config.verification_token}</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(config.verification_token)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Verify */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <h3 className="text-sm font-semibold">Verify your domain</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                After adding both DNS records, wait a few minutes for propagation, then click Verify.
                DNS changes can take up to 48 hours to propagate globally.
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={handleVerify} disabled={verifying}>
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  Verify Domain
                </Button>
              </div>

              {verificationResult && (
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {verificationResult.a_ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>A Record — {verificationResult.a_ok ? 'Correct' : 'Not found or incorrect'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {verificationResult.txt_ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>TXT Record — {verificationResult.txt_ok ? 'Verified' : 'Not found or incorrect'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Help text */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
              <p className="font-medium">💡 Need help?</p>
              <p>Search for "add A record" + your domain registrar name (e.g., "add A record GoDaddy") for step-by-step guides.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verified state */}
      {config?.verified && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Domain Connected!</p>
                <p className="text-sm text-green-600">
                  Your store is live at <strong>https://{config.domain}</strong>
                  {config.connected_at && (
                    <> — connected on {new Date(config.connected_at).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DomainSettings;
