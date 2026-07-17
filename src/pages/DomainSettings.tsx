import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Globe, Loader2, CheckCircle2, Copy, ExternalLink,
  Mail, Shield, Sparkles, RefreshCw, AlertTriangle,
  ArrowRight, Unplug, Info,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface DnsInstruction {
  type: string;
  name: string;
  value: string;
  note: string;
}

interface DnsInstructions {
  primary: DnsInstruction;
  www: DnsInstruction | null;
  ttl: string;
  propagation_note: string;
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

type DomainStatus = 'none' | 'pending_dns' | 'verifying' | 'active' | 'failed';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function parseDomain(domain: string) {
  const clean = domain.replace(/^(https?:\/\/)?(www\.)?/i, "").replace(/\/.*$/, "").trim().toLowerCase();
  const parts = clean.split(".");
  
  const multiPartSuffixes = [
    "co.uk", "me.uk", "org.uk", "ltd.uk", "plc.uk", "net.uk", "sch.uk",
    "co.in", "net.in", "org.in", "gen.in", "ind.in", "firm.in",
    "co.jp", "or.jp", "ne.jp", "ac.jp", "ad.jp",
    "co.kr", "ne.kr",
    "co.za", "net.za", "org.za",
    "com.br", "net.br", "org.br",
    "com.cn", "net.cn", "org.cn", "gov.cn"
  ];

  if (parts.length <= 2) {
    return { isApex: true, subdomain: null, apexDomain: clean };
  }

  const lastTwo = parts.slice(-2).join(".");
  if (parts.length === 3) {
    if (multiPartSuffixes.includes(lastTwo)) {
      return { isApex: true, subdomain: null, apexDomain: clean };
    } else {
      return { isApex: false, subdomain: parts[0], apexDomain: parts.slice(1).join(".") };
    }
  }

  // 4 or more parts
  const secondAndThird = parts.slice(-3, -1).join(".");
  if (multiPartSuffixes.includes(secondAndThird)) {
    return { isApex: false, subdomain: parts.slice(0, -3).join("."), apexDomain: parts.slice(-3).join(".") };
  } else {
    return { isApex: false, subdomain: parts.slice(0, -2).join("."), apexDomain: parts.slice(-2).join(".") };
  }
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied!');
};

// ── DNS Record Row ────────────────────────────────────────────────────────────

function DnsRecordRow({ record }: { record: DnsInstruction }) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-3 text-sm font-mono">
      <div>
        <p className="text-[10px] text-muted-foreground mb-1 font-sans">Type</p>
        <Badge variant="outline" className="text-xs">{record.type}</Badge>
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground mb-1 font-sans">Name / Host</p>
        <div className="flex items-center gap-1">
          <span className="text-xs break-all">{record.name}</span>
          <button onClick={() => copyToClipboard(record.name)} className="shrink-0 text-muted-foreground hover:text-foreground">
            <Copy className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground mb-1 font-sans">Value / Points to</p>
        <div className="flex items-center gap-1">
          <span className="text-xs break-all">{record.value}</span>
          <button onClick={() => copyToClipboard(record.value)} className="shrink-0 text-muted-foreground hover:text-foreground">
            <Copy className="h-3 w-3" />
          </button>
        </div>
      </div>
      {record.note && (
        <p className="col-span-3 text-[10px] text-muted-foreground font-sans">{record.note}</p>
      )}
    </div>
  );
}

// ── Custom Domain Section ─────────────────────────────────────────────────────

function CustomDomainSection({ store, refetchStore }: { store: any; refetchStore: () => void }) {
  const { user } = useAuth();
  const { canUse } = useSubscription();
  const canUseCustomDomain = canUse('customDomain');

  const [inputDomain, setInputDomain] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [dnsInstructions, setDnsInstructions] = useState<DnsInstructions | null>(null);
  const [checkResult, setCheckResult] = useState<{ verified: boolean; diagnosis: string } | null>(null);

  const customDomain: string | null = (store as any)?.custom_domain ?? null;
  const domainStatus: DomainStatus = (store as any)?.domain_status ?? 'none';

  // If already has a domain, pre-fill input
  useEffect(() => {
    if (customDomain) setInputDomain(customDomain);
  }, [customDomain]);

  const handleConnect = async () => {
    if (!store || !inputDomain.trim()) return;
    setConnecting(true);
    setDnsInstructions(null);
    setCheckResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('connect-custom-domain', {
        body: { store_id: store.id, domain: inputDomain.trim(), action: 'connect' },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      setDnsInstructions((data as any).dns_instructions ?? null);
      toast.success('Domain registered! Follow the DNS instructions below.');
      await refetchStore();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to connect domain');
    }
    setConnecting(false);
  };

  const handleCheckStatus = useCallback(async () => {
    if (!store?.id) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('check-domain-status', {
        body: { store_id: store.id },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      const result = data as any;
      setCheckResult({ verified: result.verified, diagnosis: result.diagnosis });
      if (result.verified) {
        toast.success('Domain is live! 🎉');
        await refetchStore();
      } else {
        toast.info('DNS not ready yet. ' + result.diagnosis);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Status check failed');
    }
    setChecking(false);
  }, [store?.id, refetchStore]);

  const handleDisconnect = async () => {
    if (!store?.id) return;
    if (!window.confirm(`Remove ${customDomain} from your store? Your store will still be accessible via pictocart.in/store/${store.slug}.`)) return;
    setDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('connect-custom-domain', {
        body: { store_id: store.id, action: 'disconnect' },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Custom domain removed.');
      setDnsInstructions(null);
      setCheckResult(null);
      setInputDomain('');
      await refetchStore();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to disconnect');
    }
    setDisconnecting(false);
  };

  // ── Render: not on paid plan ───────────────────────────────────────────────
  if (!canUseCustomDomain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Connect Your Own Domain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-900">Custom domain is a paid plan feature</p>
            <p className="text-xs text-amber-800">Upgrade your plan to connect yourbrand.com to your store.</p>
            <Button size="sm" onClick={() => (window.location.href = '/billing')}>View Plans</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render: domain is active ───────────────────────────────────────────────
  if (domainStatus === 'active' && customDomain) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-600" /> Custom Domain
            </CardTitle>
            <Badge className="bg-green-100 text-green-800 border-green-200">Live ✓</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <code className="flex-1 text-sm font-mono text-green-800">https://{customDomain}</code>
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`https://${customDomain}`)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Both <code>https://{customDomain}</code> and <code>https://www.{customDomain}</code> point to your store.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unplug className="h-4 w-4 mr-2" />}
            Remove Custom Domain
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Render: domain connected, waiting for DNS ──────────────────────────────
  if ((domainStatus === 'pending_dns' || domainStatus === 'verifying') && customDomain) {
    const domainInfo = parseDomain(customDomain);
    const localInstructions: DnsInstructions = dnsInstructions ?? {
      primary: domainInfo.isApex
        ? { type: 'A', name: '@', value: '76.76.21.21', note: 'Root/Apex domain — use A record' }
        : { type: 'CNAME', name: domainInfo.subdomain || 'www', value: 'cname.vercel-dns.com', note: 'Subdomain — use CNAME' },
      www: domainInfo.isApex
        ? { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com', note: 'Optional: add www so both work' }
        : null,
      ttl: '3600 (or lowest available)',
      propagation_note: 'DNS changes take 5 min – 48 hrs. Click Check Status after adding the record.',
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-yellow-600" /> Custom Domain
            </CardTitle>
            <Badge variant="outline" className="border-yellow-300 text-yellow-700">Awaiting DNS</Badge>
          </div>
          <CardDescription>
            Add the DNS record below at your domain registrar, then click Check Status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Domain being configured */}
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <code className="text-sm font-mono flex-1">{customDomain}</code>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold">1</span>
            <span className="text-green-700 font-medium">Domain registered with PictoCart</span>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">2</span>
            <span className="font-medium">Add DNS record at your registrar</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">(GoDaddy, Namecheap, etc.)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">3</span>
            <span>Click Check Status — we verify and activate</span>
          </div>

          {/* DNS Records */}
          <div className="space-y-2 pt-1">
            <p className="text-sm font-semibold">DNS Record to Add:</p>
            <DnsRecordRow record={localInstructions.primary} />
            {localInstructions.www && (
              <>
                <p className="text-xs text-muted-foreground pt-1">Also add (recommended):</p>
                <DnsRecordRow record={localInstructions.www} />
              </>
            )}
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {localInstructions.propagation_note}
            </p>
          </div>

          {/* Check result */}
          {checkResult && (
            <div className={`rounded-lg border p-3 text-sm ${checkResult.verified ? 'border-green-200 bg-green-50 text-green-800' : 'border-yellow-200 bg-yellow-50 text-yellow-900'}`}>
              {checkResult.verified
                ? <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {checkResult.diagnosis}</span>
                : <span className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{checkResult.diagnosis}</span>
              }
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCheckStatus} disabled={checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Check Status
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unplug className="h-4 w-4 mr-2" />}
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render: no domain yet (default) ───────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Connect Your Own Domain
        </CardTitle>
        <CardDescription>
          Point <strong>yourbrand.com</strong> to your store — free SSL included, no admin needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="domain-input">Your Domain</Label>
          <Input
            id="domain-input"
            placeholder="yourbrand.com"
            value={inputDomain}
            onChange={(e) => setInputDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          />
          <p className="text-xs text-muted-foreground">
            Enter without http:// or www — e.g. <code>yourbrand.com</code> or <code>shop.yourbrand.com</code>
          </p>
        </div>

        <Button onClick={handleConnect} disabled={connecting || !inputDomain.trim()}>
          {connecting
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <Globe className="h-4 w-4 mr-2" />}
          Connect Domain
        </Button>

        {/* How it works */}
        <div className="rounded-lg bg-muted/50 border p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">How it works — 3 steps, takes ~5 minutes:</p>
          <div className="space-y-2">
            {[
              { n: '1', text: 'Enter your domain above and click Connect' },
              { n: '2', text: 'Add a single DNS record at your registrar (GoDaddy, Namecheap, etc.) — we show you exactly what to add' },
              { n: '3', text: 'Come back and click Check Status — we verify instantly and your domain goes live with HTTPS' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{n}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Email Domain Section ──────────────────────────────────────────────────────
// (kept intact from original — only moved below custom domain section)

function EmailDomainSection({ store }: { store: any }) {
  const [emailDomain, setEmailDomain] = useState('');
  const [senderPrefix, setSenderPrefix] = useState('notifications');
  const [emailConfig, setEmailConfig] = useState<EmailDomainConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [planLimitError, setPlanLimitError] = useState<string | null>(null);

  useEffect(() => {
    if (!store?.id) return;
    (async () => {
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
    })();
  }, [store?.id]);

  const handleSetupEmailDomain = async () => {
    if (!emailDomain.trim() || !store) return;
    setLoading(true);
    setPlanLimitError(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-email-domain', {
        body: {
          action: 'add',
          store_id: store.id,
          domain: emailDomain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').trim(),
          sender_prefix: senderPrefix,
        },
      });
      const payload = (data as any) || {};
      if (payload?.code === 'plan_limit' || error) {
        const msg = payload?.error || (error as any)?.message || 'Setup failed';
        if (payload?.code === 'plan_limit') {
          setPlanLimitError(msg);
          toast.error('White-label email is awaiting platform upgrade');
          setLoading(false);
          return;
        }
        throw new Error(msg);
      }
      const { data: updated } = await supabase
        .from('store_email_domains').select('*').eq('store_id', store.id).single();
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
      if ((data as any)?.verified) toast.success('Email domain verified!');
      else toast.error(`Status: ${(data as any)?.provider_status || 'pending'}. DNS not yet propagated.`);
      const { data: updated } = await supabase
        .from('store_email_domains').select('*').eq('store_id', store.id).single();
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
      <Card><CardContent className="py-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent></Card>
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
                  Send order notifications from your own domain (e.g. notifications@yourstore.com)
                </CardDescription>
              </div>
            </div>
            {emailStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {planLimitError && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
              <p className="font-medium mb-1">⏳ Awaiting platform email upgrade</p>
              <p className="text-xs">Your domain details are saved. Click Set Up Email Domain again once the platform is upgraded.</p>
            </div>
          )}
          {!emailConfig ? (
            <>
              <div className="space-y-2">
                <Label>Domain Name</Label>
                <Input placeholder="yourstore.com" value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sender Prefix</Label>
                <div className="flex items-center gap-2">
                  <Input value={senderPrefix} onChange={(e) => setSenderPrefix(e.target.value)} className="max-w-[200px]" />
                  <span className="text-sm text-muted-foreground">@{emailDomain || 'yourstore.com'}</span>
                </div>
              </div>
              <Button onClick={handleSetupEmailDomain} disabled={loading || !emailDomain.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Set Up Email Domain
              </Button>
            </>
          ) : emailConfig.status === 'verified' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-sm font-medium text-green-800">
                  Emails sent from <strong>{emailConfig.sender_prefix}@{emailConfig.domain}</strong>
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleRemoveEmailDomain} disabled={loading}>Remove Email Domain</Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Domain <strong>{emailConfig.domain}</strong> registered. Add the DNS records below to verify it.
            </p>
          )}
        </CardContent>
      </Card>

      {emailConfig && emailConfig.status === 'pending' && emailConfig.dns_records && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-yellow-500" /> Email DNS Records Required
            </CardTitle>
            <CardDescription>
              Add these at your domain registrar to verify email sending from {emailConfig.domain}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(emailConfig.dns_records as any[]).map((record: any, i: number) => (
              <div key={i} className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-4 text-sm">
                <div><p className="text-xs text-muted-foreground mb-1">Type</p><p className="font-mono font-medium">{record.type}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Name</p><p className="font-mono text-xs break-all">{record.name || '@'}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Value</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-xs break-all">{record.value}</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(record.value)}><Copy className="h-3 w-3" /></Button>
                  </div>
                  <Badge variant="outline" className="mt-2 text-[10px] capitalize">{record.status || 'pending'}</Badge>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2 flex-wrap">
              <Button variant="outline" onClick={handleVerifyEmail} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Verify Email Domain
              </Button>
              <Button variant="outline" size="sm" onClick={handleRemoveEmailDomain} disabled={loading}>Remove</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const DomainSettings = () => {
  const { store, refetchStore } = useStore();

  const customDomain: string | null = (store as any)?.custom_domain ?? null;
  const domainStatus: DomainStatus = (store as any)?.domain_status ?? 'none';
  const storeUrl = store ? `${window.location.origin}/store/${store.slug}` : '';

  const statusBadge = () => {
    if (domainStatus === 'active' && customDomain)
      return <Badge className="bg-green-100 text-green-800 border-green-200">Custom Domain Live</Badge>;
    if (domainStatus === 'pending_dns')
      return <Badge variant="outline" className="border-yellow-300 text-yellow-700">DNS Pending</Badge>;
    return <Badge variant="secondary">Default URL</Badge>;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Domain & Email Settings</h1>
        <p className="text-sm text-muted-foreground">Connect your own domain in minutes — no admin needed.</p>
      </div>

      {/* Store URL card — always shown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Store URL</CardTitle>
                <CardDescription>Your store's default address (always works)</CardDescription>
              </div>
            </div>
            {statusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
            <code className="flex-1 text-sm font-mono truncate">{storeUrl}</code>
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(storeUrl)}><Copy className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={storeUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          </div>
          {customDomain && domainStatus === 'active' && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <code className="flex-1 text-sm font-mono text-green-800 truncate">https://{customDomain}</code>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`https://${customDomain}`)}><Copy className="h-4 w-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain section */}
      {store && <CustomDomainSection store={store} refetchStore={refetchStore} />}

      {/* Email Domain section */}
      {store && <EmailDomainSection store={store} />}
    </div>
  );
};

export default DomainSettings;
