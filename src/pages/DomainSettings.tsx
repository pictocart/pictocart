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
      const { data, error } = await supabase.functions.invoke('manage-email-domain', {
        body: {
          action: 'add',
          store_id: store.id,
          domain: emailDomain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').trim(),
          sender_prefix: senderPrefix,
        },
      });
      if (error) throw new Error((data as any)?.error || error.message || 'Setup failed');

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
      const { data, error } = await supabase.functions.invoke('manage-email-domain', {
        body: { action: 'verify', store_id: store.id },
      });
      if (error) throw new Error((data as any)?.error || error.message || 'Verification failed');

      if ((data as any)?.verified) {
        toast.success('Email domain verified! Emails will now be sent from your domain.');
      } else {
        toast.error('DNS records not yet propagated. Please wait and try again.');
      }

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
      const { data, error } = await supabase.functions.invoke('manage-email-domain', {
        body: { action: 'remove', store_id: store.id },
      });
      if (error) throw new Error((data as any)?.error || error.message || 'Failed to remove');
      setEmailConfig(null);
      setEmailDomain('');
      toast.success('Email domain removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove email domain');
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

// ── Helpers for live DNS / SSL UI ──

function DnsStatusPill({ check, loading }: { check: { ok: boolean; records: string[] } | null; loading: boolean }) {
  if (loading || !check) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking…
      </Badge>
    );
  }
  if (check.ok) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Detected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-yellow-300 text-yellow-700 gap-1">
      <XCircle className="h-3 w-3" /> Not yet
    </Badge>
  );
}

function DomainProgressBar({
  apexOk,
  wwwOk,
  sslStatus,
}: {
  apexOk: boolean;
  wwwOk: boolean;
  sslStatus: string | null;
}) {
  const dnsOk = apexOk || wwwOk; // Either one is enough to start SSL issuance
  const sslActive = sslStatus === 'active';
  const steps = [
    { label: 'Domain registered', done: true },
    { label: 'DNS detected', done: dnsOk, active: !dnsOk },
    { label: 'SSL issued', done: sslActive, active: dnsOk && !sslActive },
    { label: 'Live', done: sslActive, active: false },
  ];
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 text-center">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                s.done
                  ? 'bg-green-600 text-white'
                  : s.active
                  ? 'bg-primary text-primary-foreground animate-pulse'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-[10px] sm:text-xs ${s.done ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function humanSsl(s: string | null): string {
  switch (s) {
    case 'active': return 'Active 🎉';
    case 'pending': return 'Pending — waiting for DNS';
    case 'pending_validation': return 'Validating domain ownership…';
    case 'pending_issuance': return 'Issuing certificate…';
    case 'pending_deployment': return 'Deploying certificate to edge…';
    case 'failed': return 'Failed — check DNS records';
    default: return 'Pending';
  }
}

// ── Main Page (Cloudflare for SaaS) ──

type SslStatus = 'pending' | 'pending_validation' | 'pending_issuance' | 'pending_deployment' | 'active' | 'failed' | null;

interface DnsRecordCheck {
  host: string;
  ok: boolean;
  records: string[];
  type: string;
}

const DomainSettings = () => {
  const { store, refetchStore } = useStore();
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [hostnameStatus, setHostnameStatus] = useState<string | null>(null);
  const [sslStatus, setSslStatus] = useState<SslStatus>(null);
  const [verificationErrors, setVerificationErrors] = useState<string[]>([]);
  const [dnsApex, setDnsApex] = useState<DnsRecordCheck | null>(null);
  const [dnsWww, setDnsWww] = useState<DnsRecordCheck | null>(null);
  const [dnsCheckedAt, setDnsCheckedAt] = useState<Date | null>(null);

  const cnameTarget = 'fallback.pictocart.in';
  const customDomain: string | null = (store as any)?.custom_domain ?? null;
  const storeUrl = store ? `${window.location.origin}/store/${store.slug}` : '';

  useEffect(() => {
    if (customDomain) setDomain(customDomain);
    setSslStatus(((store as any)?.ssl_status as SslStatus) ?? null);
  }, [customDomain, store]);

  // Lightweight DNS check — runs every 10s while not yet live.
  const handleDnsCheck = async () => {
    if (!customDomain) return;
    try {
      const { data, error } = await supabase.functions.invoke('check-dns-records', {
        body: { domain: customDomain, expected_target: cnameTarget },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.error) throw new Error(d.error);
      setDnsApex(d.apex);
      setDnsWww(d.www);
      setDnsCheckedAt(new Date());
      // If both DNS records resolve correctly but SSL still pending, kick a Cloudflare check.
      if (d.apex?.ok && d.www?.ok && sslStatus !== 'active') {
        void handleCheck();
      }
    } catch {
      // Silent — DNS lookup failures shouldn't toast on every poll
    }
  };

  // Live DNS + SSL polling every 10s while pending.
  useEffect(() => {
    if (!customDomain || sslStatus === 'active' || sslStatus === 'failed') return;
    void handleDnsCheck();
    const id = setInterval(() => { void handleDnsCheck(); }, 10000);
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

      {/* DNS Instructions with live status */}
      {customDomain && sslStatus !== 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Add DNS Records at Your Registrar
            </CardTitle>
            <CardDescription>
              Go to your DNS provider (GoDaddy, Namecheap, Hostinger, Cloudflare, etc.) and add these CNAME records.
              We'll automatically detect them within seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <DomainProgressBar
              apexOk={!!dnsApex?.ok}
              wwwOk={!!dnsWww?.ok}
              sslStatus={sslStatus}
            />

            {/* Nameserver guidance */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm space-y-2">
              <p className="font-semibold text-blue-900 flex items-center gap-2">
                <Globe className="h-4 w-4" /> Do I need to change nameservers?
              </p>
              <p className="text-blue-800">
                <strong>No</strong> — keep your current registrar's nameservers. You only need to add the two CNAME records below.
              </p>
              <p className="text-blue-800">
                <strong>Exception:</strong> if your domain is on <em>"parking" nameservers</em> (e.g. <code className="font-mono text-xs">horizon.dns-parking.com</code>, <code className="font-mono text-xs">orbit.dns-parking.com</code>), they don't allow custom DNS records. Switch to your registrar's standard DNS nameservers first:
              </p>
              <ul className="text-blue-800 text-xs space-y-1 ml-4 list-disc">
                <li><strong>Hostinger:</strong> <code className="font-mono">ns1.dns-parking.com</code> → use Hostinger's <em>"Use Hostinger nameservers"</em> button, or set <code className="font-mono">ns1.hostinger.com</code> + <code className="font-mono">ns2.hostinger.com</code></li>
                <li><strong>GoDaddy:</strong> default is fine — just add the CNAMEs in DNS Management</li>
                <li><strong>Namecheap:</strong> use "Namecheap BasicDNS" (default)</li>
                <li><strong>Cloudflare:</strong> works as-is — set CNAMEs to <em>DNS only</em> (grey cloud), not proxied</li>
              </ul>
              <p className="text-blue-800 text-xs pt-1">
                After switching nameservers, wait 10–30 minutes for propagation, then add the records below.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  <h3 className="text-sm font-semibold">Root domain (apex)</h3>
                </div>
                <DnsStatusPill check={dnsApex} loading={!dnsCheckedAt} />
              </div>
              <DnsRecordRow type="CNAME (or ALIAS/ANAME)" name="@" value={cnameTarget} />
              {dnsApex && !dnsApex.ok && dnsApex.records.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                  <p className="text-xs text-destructive font-medium">
                    ⚠ Conflicting record detected — apex resolves to <code className="font-mono">{dnsApex.records.join(', ')}</code>
                  </p>
                  <p className="text-xs text-destructive/90">
                    You likely have a leftover <strong>A record</strong> on <code>@</code> (often <code className="font-mono">2.57.91.91</code> from Hostinger parking). <strong>Delete that A record</strong> in your registrar's DNS panel — keep only the ALIAS/ANAME/CNAME pointing to <code className="font-mono">{cnameTarget}</code>. ALIAS &amp; ANAME flatten to the target's IPs, which Cloudflare accepts.
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Most registrars don't allow CNAME on the apex — use <strong>ALIAS</strong> (Hostinger), <strong>ANAME</strong> (DNSimple), or <strong>flattened CNAME</strong> (Cloudflare) instead. If unavailable, set up only <code>www</code> below and add an apex→www redirect at your registrar.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  <h3 className="text-sm font-semibold">www subdomain</h3>
                </div>
                <DnsStatusPill check={dnsWww} loading={!dnsCheckedAt} />
              </div>
              <DnsRecordRow type="CNAME" name="www" value={cnameTarget} />
              {dnsWww && !dnsWww.ok && dnsWww.records.length > 0 && (
                <p className="text-xs text-destructive">
                  Currently resolves to: <code className="font-mono">{dnsWww.records.join(', ')}</code> — should be <code className="font-mono">{cnameTarget}</code>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <h3 className="text-sm font-semibold">SSL certificate</h3>
              </div>
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {(sslStatus as string) === 'active' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : sslStatus === 'failed' ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <span><strong>SSL status:</strong> {humanSsl(sslStatus)}</span>
                </div>
                {hostnameStatus && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Shield className="h-3 w-3" />
                    <span>Hostname: {hostnameStatus}</span>
                  </div>
                )}
                {dnsCheckedAt && (
                  <p className="text-xs text-muted-foreground">
                    Auto-checking every 10s · Last checked {dnsCheckedAt.toLocaleTimeString()}
                  </p>
                )}
                {verificationErrors.length > 0 && (
                  <div className="rounded bg-destructive/10 p-3 text-destructive text-xs space-y-1">
                    {verificationErrors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCheck} disabled={checking} variant="outline" size="sm">
                  {checking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  Force SSL Re-check
                </Button>
                <Button onClick={() => void handleDnsCheck()} variant="ghost" size="sm">
                  Re-check DNS
                </Button>
              </div>
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
