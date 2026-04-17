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
  Mail,
  Shield,
} from 'lucide-react';

// ── Types ──

interface DomainConfig {
  domain: string;
  verified: boolean;
  verification_token: string;
  connected_at: string | null;
}

interface EmailDomainConfig {
  id: string;
  store_id: string;
  domain: string;
  resend_domain_id: string | null;
  status: string;
  dns_records: any[];
  sender_prefix: string;
  verified_at: string | null;
}

// ── Constants ──

const PLATFORM_IP = '185.158.133.1';

const generateToken = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'aca_verify_';
  for (let i = 0; i < 16; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
};

// ── Sub-components ──

function StoreUrlCard({
  storeUrl,
  config,
  statusBadge,
}: {
  storeUrl: string;
  config: DomainConfig | null;
  statusBadge: React.ReactNode;
}) {
  return (
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
          {statusBadge}
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
  );
}

function CustomDomainCard({
  domain,
  setDomain,
  config,
  saving,
  handleSaveDomain,
  handleRemoveDomain,
}: {
  domain: string;
  setDomain: (v: string) => void;
  config: DomainConfig | null;
  saving: boolean;
  handleSaveDomain: () => void;
  handleRemoveDomain: () => void;
}) {
  return (
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
  );
}

function DnsInstructionsCard({
  config,
  verifying,
  verificationResult,
  handleVerify,
}: {
  config: DomainConfig;
  verifying: boolean;
  verificationResult: { txt_ok: boolean; a_ok: boolean } | null;
  handleVerify: () => void;
}) {
  return (
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
          <DnsRecordRow type="A" name="@" value={PLATFORM_IP} />
        </div>

        {/* Step 2: TXT Record */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            <h3 className="text-sm font-semibold">Add TXT Record (verifies ownership)</h3>
          </div>
          <DnsRecordRow type="TXT" name="_aca" value={config.verification_token} valueSmall />
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
          <Button onClick={handleVerify} disabled={verifying}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
            Verify Domain
          </Button>

          {verificationResult && (
            <div className="rounded-lg border p-4 space-y-2">
              <VerificationRow ok={verificationResult.a_ok} label="A Record" successText="Correct" failText="Not found or incorrect" />
              <VerificationRow ok={verificationResult.txt_ok} label="TXT Record" successText="Verified" failText="Not found or incorrect" />
            </div>
          )}
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
          <p className="font-medium">💡 Need help?</p>
          <p>Search for "add A record" + your domain registrar name for step-by-step guides.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DnsRecordRow({
  type,
  name,
  value,
  valueSmall,
}: {
  type: string;
  name: string;
  value: string;
  valueSmall?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-4 text-sm">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Type</p>
        <p className="font-mono font-medium">{type}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Name / Host</p>
        <div className="flex items-center gap-1">
          <p className="font-mono font-medium">{name}</p>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(name)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Value</p>
        <div className="flex items-center gap-1">
          <p className={`font-mono font-medium ${valueSmall ? 'text-xs break-all' : ''}`}>{value}</p>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(value)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function VerificationRow({ ok, label, successText, failText }: { ok: boolean; label: string; successText: string; failText: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
      <span>{label} — {ok ? successText : failText}</span>
    </div>
  );
}

// ── Email Domain Section ──

function EmailDomainSection({ store }: { store: any }) {
  const [emailDomain, setEmailDomain] = useState('');
  const [senderPrefix, setSenderPrefix] = useState('notifications');
  const [emailConfig, setEmailConfig] = useState<EmailDomainConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    if (!store?.id) return;
    const fetchEmailDomain = async () => {
      const { data } = await supabase
        .from('store_email_domains')
        .select('*')
        .eq('store_id', store.id)
        .maybeSingle();
      if (data) {
        setEmailConfig(data as EmailDomainConfig);
        setEmailDomain(data.domain);
        setSenderPrefix(data.sender_prefix);
      }
      setLoadingConfig(false);
    };
    fetchEmailDomain();
  }, [store?.id]);

  const handleSetupEmailDomain = async () => {
    if (!emailDomain.trim() || !store) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/manage-email-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          store_id: store.id,
          domain: emailDomain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').trim(),
          sender_prefix: senderPrefix,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');

      // Refetch config
      const { data: updated } = await supabase
        .from('store_email_domains')
        .select('*')
        .eq('store_id', store.id)
        .single();
      if (updated) setEmailConfig(updated as EmailDomainConfig);
      toast.success('Email domain registered — add the DNS records below');
    } catch (err: any) {
      toast.error(err.message || 'Failed to set up email domain');
    }
    setLoading(false);
  };

  const handleVerifyEmail = async () => {
    if (!store) return;
    setVerifying(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/manage-email-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', store_id: store.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      if (data.verified) {
        toast.success('Email domain verified! Emails will now be sent from your domain.');
      } else {
        toast.error('DNS records not yet propagated. Please wait and try again.');
      }

      // Refetch
      const { data: updated } = await supabase
        .from('store_email_domains')
        .select('*')
        .eq('store_id', store.id)
        .single();
      if (updated) setEmailConfig(updated as EmailDomainConfig);
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    }
    setVerifying(false);
  };

  const handleRemoveEmailDomain = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/manage-email-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', store_id: store.id }),
      });
      setEmailConfig(null);
      setEmailDomain('');
      toast.success('Email domain removed');
    } catch {
      toast.error('Failed to remove email domain');
    }
    setLoading(false);
  };

  if (loadingConfig) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const emailStatusBadge = () => {
    if (!emailConfig) return <Badge variant="secondary">Not Configured</Badge>;
    if (emailConfig.status === 'verified') return <Badge className="bg-green-100 text-green-800 border-green-200">Verified</Badge>;
    return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Pending</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Email Sender Domain</CardTitle>
                <CardDescription>
                  Send order notifications from your own domain (e.g., notifications@yourstore.com)
                </CardDescription>
              </div>
            </div>
            {emailStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!emailConfig ? (
            <>
              <div className="space-y-2">
                <Label>Domain Name</Label>
                <Input
                  placeholder="yourstore.com"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sender Prefix</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={senderPrefix}
                    onChange={(e) => setSenderPrefix(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <span className="text-sm text-muted-foreground">@{emailDomain || 'yourstore.com'}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Emails will be sent from <strong>{senderPrefix}@{emailDomain || 'yourstore.com'}</strong>
                </p>
              </div>
              <Button onClick={handleSetupEmailDomain} disabled={loading || !emailDomain.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Set Up Email Domain
              </Button>
            </>
          ) : emailConfig.status === 'verified' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Emails are sent from: <strong>{emailConfig.sender_prefix}@{emailConfig.domain}</strong>
                  </p>
                  {emailConfig.verified_at && (
                    <p className="text-xs text-green-600">
                      Verified on {new Date(emailConfig.verified_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleRemoveEmailDomain} disabled={loading}>
                Remove Email Domain
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Domain <strong>{emailConfig.domain}</strong> is registered. Add the DNS records below to verify it.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DNS records for pending email domain */}
      {emailConfig && emailConfig.status === 'pending' && emailConfig.dns_records && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-yellow-500" />
              Email DNS Records Required
            </CardTitle>
            <CardDescription>
              Add these records at your domain registrar to verify email sending from {emailConfig.domain}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(emailConfig.dns_records as any[]).map((record: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold">
                    {record.type} Record {record.name ? `— ${record.name}` : ''}
                  </h3>
                  {record.status === 'verified' && (
                    <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <p className="font-mono font-medium">{record.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Name / Host</p>
                    <div className="flex items-center gap-1">
                      <p className="font-mono font-medium text-xs break-all">{record.name || '@'}</p>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(record.name || '@')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Value</p>
                    <div className="flex items-center gap-1">
                      <p className="font-mono font-medium text-xs break-all">{record.value}</p>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(record.value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {record.priority !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Priority</p>
                      <p className="font-mono font-medium">{record.priority}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleVerifyEmail} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Verify Email Domain
              </Button>
              <Button variant="outline" size="sm" onClick={handleRemoveEmailDomain} disabled={loading}>
                Remove
              </Button>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
              <p className="font-medium">💡 Pro tip</p>
              <p>SPF and DKIM records ensure your emails pass authentication checks and land in the inbox — not spam.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ── Main Page (Cloudflare for SaaS) ──

type SslStatus = 'pending' | 'pending_validation' | 'pending_issuance' | 'pending_deployment' | 'active' | 'failed' | null;

const DomainSettings = () => {
  const { store, refetchStore } = useStore();
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [hostnameStatus, setHostnameStatus] = useState<string | null>(null);
  const [sslStatus, setSslStatus] = useState<SslStatus>(null);
  const [verificationErrors, setVerificationErrors] = useState<string[]>([]);

  const cnameTarget = 'fallback.pictocart.in';
  const customDomain: string | null = (store as any)?.custom_domain ?? null;
  const storeUrl = store ? `${window.location.origin}/store/${store.slug}` : '';

  useEffect(() => {
    if (customDomain) setDomain(customDomain);
    setSslStatus(((store as any)?.ssl_status as SslStatus) ?? null);
  }, [customDomain, store]);

  // Auto-poll status every 15s while pending
  useEffect(() => {
    if (!customDomain || sslStatus === 'active' || sslStatus === 'failed') return;
    const id = setInterval(() => { void handleCheck(); }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDomain, sslStatus]);

  const handleConnect = async () => {
    if (!store) return;
    const clean = domain.replace(/^(https?:\/\/)?/i, '').replace(/\/.*$/, '').trim().toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean)) {
      toast.error('Enter a valid domain like mystore.com');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-custom-hostname', {
        body: { store_id: store.id, domain: clean },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Domain registered — now add the CNAME records at your registrar');
      setSslStatus(((data as any)?.ssl_status as SslStatus) ?? 'pending');
      await refetchStore();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to connect domain');
    }
    setSaving(false);
  };

  const handleCheck = async () => {
    if (!store || !customDomain) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-custom-hostname', {
        body: { store_id: store.id },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.error) throw new Error(d.error);
      setHostnameStatus(d.hostname_status);
      setSslStatus(d.ssl_status as SslStatus);
      const errs: string[] = [];
      (d.verification_errors ?? []).forEach((e: any) => errs.push(typeof e === 'string' ? e : JSON.stringify(e)));
      (d.ssl_validation_errors ?? []).forEach((e: any) => errs.push(e?.message ?? JSON.stringify(e)));
      setVerificationErrors(errs);
      if (d.is_active) {
        toast.success('Domain is live with SSL!');
        await refetchStore();
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Check failed');
    }
    setChecking(false);
  };

  const handleRemove = async () => {
    if (!store) return;
    setRemoving(true);
    try {
      const { data, error } = await supabase.functions.invoke('remove-custom-hostname', {
        body: { store_id: store.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDomain('');
      setSslStatus(null);
      setHostnameStatus(null);
      setVerificationErrors([]);
      toast.success('Domain removed');
      await refetchStore();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to remove domain');
    }
    setRemoving(false);
  };

  const statusBadge = () => {
    if (!customDomain) return <Badge variant="secondary">Not Configured</Badge>;
    if (sslStatus === 'active') return <Badge className="bg-green-100 text-green-800 border-green-200">Live (SSL Active)</Badge>;
    if (sslStatus === 'failed') return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Pending DNS / SSL</Badge>;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Domain & Email Settings</h1>
        <p className="text-sm text-muted-foreground">Connect your own domain — SSL is provisioned automatically</p>
      </div>

      {/* Store URL */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Store URL</CardTitle>
                <CardDescription>Your store's default address</CardDescription>
              </div>
            </div>
            {statusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
            <code className="flex-1 text-sm font-mono truncate">{storeUrl}</code>
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(storeUrl)}><Copy className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={storeUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          </div>
          {customDomain && sslStatus === 'active' && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <code className="flex-1 text-sm font-mono text-green-800 truncate">https://{customDomain}</code>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`https://${customDomain}`)}><Copy className="h-4 w-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connect a Custom Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{customDomain ? 'Connected Domain' : 'Connect Your Domain'}</CardTitle>
          <CardDescription>
            Bring your own domain — we'll handle SSL automatically via Cloudflare for SaaS
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
                disabled={!!customDomain}
              />
              {!customDomain && (
                <Button onClick={handleConnect} disabled={saving || !domain.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Enter without http:// or www — e.g. <code>mystore.com</code>
            </p>
          </div>

          {customDomain && (
            <Button variant="destructive" size="sm" onClick={handleRemove} disabled={removing}>
              {removing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Remove Domain
            </Button>
          )}
        </CardContent>
      </Card>

      {/* DNS Instructions */}
      {customDomain && sslStatus !== 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Add DNS Records at Your Registrar
            </CardTitle>
            <CardDescription>
              Go to your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.) and add the following CNAME records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <h3 className="text-sm font-semibold">Root domain (apex)</h3>
              </div>
              <DnsRecordRow type="CNAME" name="@" value={cnameTarget} />
              <p className="text-xs text-muted-foreground">
                Some registrars don't allow CNAME on the apex — use ALIAS / ANAME / flattened CNAME instead. If yours doesn't, set up only <code>www</code> below and add a redirect from apex.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <h3 className="text-sm font-semibold">www subdomain</h3>
              </div>
              <DnsRecordRow type="CNAME" name="www" value={cnameTarget} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <h3 className="text-sm font-semibold">Wait & verify</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                After adding the records, wait 1–10 minutes for propagation. We'll automatically check status every 15 seconds. SSL is issued automatically once DNS propagates.
              </p>
              <Button onClick={handleCheck} disabled={checking}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Check Status Now
              </Button>

              {(hostnameStatus || sslStatus) && (
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span><strong>Hostname:</strong> {hostnameStatus ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {String(sslStatus) === 'active'
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <span><strong>SSL:</strong> {sslStatus ?? 'pending'}</span>
                  </div>
                  {verificationErrors.length > 0 && (
                    <div className="rounded bg-destructive/10 p-3 text-destructive text-xs space-y-1">
                      {verificationErrors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
              <p className="font-medium">💡 How this works</p>
              <p>Your DNS points to our edge. Cloudflare for SaaS issues a free SSL certificate for your domain automatically — no manual setup, no expiry headaches.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {customDomain && sslStatus === 'active' && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Domain Connected & SSL Active!</p>
                <p className="text-sm text-green-600">
                  Your store is live at <strong>https://{customDomain}</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Domain Section */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold tracking-tight mb-4">📧 Email Sender Identity</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Set up your email domain so customers receive order notifications from <strong>your brand</strong>, not a generic address.
        </p>
      </div>

      {store && <EmailDomainSection store={store} />}
    </div>
  );
};

export default DomainSettings;
