import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  Copy,
  ExternalLink,
  Mail,
  Shield,
  Sparkles,
  Clock,
} from 'lucide-react';

// ── Types ──

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

interface ProvisionRequestRow {
  id: string;
  status: string;
  requested_domain: string | null;
  new_project_url: string | null;
  queued_at: string;
  completed_at: string | null;
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
};

// ── Email Domain Section ──

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
      if ((data as any)?.verified) toast.success('Email domain verified!');
      else toast.error('DNS records not yet propagated. Please wait and try again.');
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
              <p className="text-xs">
                Your domain details are saved below. The moment our team upgrades the email service, click <strong>Set Up Email Domain</strong> again and verification will work instantly — no other action needed from you.
              </p>
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
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-sm font-medium text-green-800">
                  Emails sent from <strong>{emailConfig.sender_prefix}@{emailConfig.domain}</strong>
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleRemoveEmailDomain} disabled={loading}>
                Remove Email Domain
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Domain <strong>{emailConfig.domain}</strong> is registered. Add the DNS records below to verify it.
            </p>
          )}
        </CardContent>
      </Card>

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
              <div key={i} className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-4 text-sm">
                <div><p className="text-xs text-muted-foreground mb-1">Type</p><p className="font-mono font-medium">{record.type}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Name</p><p className="font-mono font-medium text-xs break-all">{record.name || '@'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Value</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono font-medium text-xs break-all">{record.value}</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(record.value)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleVerifyEmail} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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

// ── Main Page ──

const DomainSettings = () => {
  const { store, refetchStore } = useStore();
  const { user } = useAuth();
  const [domain, setDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<ProvisionRequestRow | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);

  const customDomain: string | null = (store as any)?.custom_domain ?? null;
  const storeUrl = store ? `${window.location.origin}/store/${store.slug}` : '';

  useEffect(() => {
    if (!store?.id) return;
    (async () => {
      const { data } = await supabase
        .from('provision_requests')
        .select('id, status, requested_domain, new_project_url, queued_at, completed_at')
        .eq('store_id', store.id)
        .order('queued_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setRequest((data as ProvisionRequestRow) ?? null);
      if (data?.requested_domain && !domain) setDomain(data.requested_domain);
      setLoadingRequest(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  const handleRequestSetup = async () => {
    if (!store) return;
    const clean = domain.replace(/^(https?:\/\/)?(www\.)?/i, '').replace(/\/.*$/, '').trim().toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean)) {
      toast.error('Enter a valid domain like mystore.com');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('provision_requests')
        .insert({
          store_id: store.id,
          requested_domain: clean,
          status: 'queued',
          client_patch_payload: {
            store_name: store.name,
            store_slug: store.slug,
            requested_domain: clean,
            user_email: user?.email,
            user_id: user?.id,
          },
        })
        .select('id, status, requested_domain, new_project_url, queued_at, completed_at')
        .single();
      if (error) throw error;
      setRequest(data as ProvisionRequestRow);

      // Notify customer + admin (best-effort)
      try {
        if (user?.email) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'provision-request-received',
              recipientEmail: user.email,
              idempotencyKey: `provision-received-${data.id}`,
              templateData: { storeName: store.name, requestedDomain: clean },
            },
          });
        }
      } catch (_) {}

      toast.success("Request received! Our team will be in touch within 24 hours.");
      await refetchStore();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit request');
    }
    setSubmitting(false);
  };

  const statusBadge = () => {
    if (!request) {
      return customDomain
        ? <Badge className="bg-green-100 text-green-800 border-green-200">Live</Badge>
        : <Badge variant="secondary">Not Configured</Badge>;
    }
    switch (request.status) {
      case 'live':       return <Badge className="bg-green-100 text-green-800 border-green-200">Live</Badge>;
      case 'failed':     return <Badge variant="destructive">Failed — contact support</Badge>;
      case 'queued':     return <Badge variant="outline" className="border-blue-300 text-blue-700">Queued</Badge>;
      default:           return <Badge variant="outline" className="border-yellow-300 text-yellow-700">In Progress</Badge>;
    }
  };

  const requestActive = !!request && request.status !== 'live' && request.status !== 'failed';

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Domain & Email Settings</h1>
        <p className="text-sm text-muted-foreground">Connect your own domain — our team handles SSL, DNS and project setup for you.</p>
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
                <CardDescription>Your store's default address (always works)</CardDescription>
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
          {customDomain && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <code className="flex-1 text-sm font-mono text-green-800 truncate">https://{customDomain}</code>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`https://${customDomain}`)}><Copy className="h-4 w-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {customDomain ? 'Your Custom Domain' : 'Connect Your Own Domain'}
          </CardTitle>
          <CardDescription>
            We'll build you a dedicated, lightning-fast storefront on your domain. No DNS setup needed from your side — our team takes care of everything.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingRequest ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : customDomain ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-medium">
                  Live at <strong>https://{customDomain}</strong>
                </p>
              </div>
              <p className="mt-2 text-xs text-green-700">
                Need to change something? Email <a href="mailto:support@pictocart.in" className="underline">support@pictocart.in</a>.
              </p>
            </div>
          ) : requestActive ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-900">
                <Clock className="h-5 w-5" />
                <p className="text-sm font-medium">
                  We're setting up <strong>{request?.requested_domain}</strong>
                </p>
              </div>
              <p className="text-xs text-blue-800">
                Our team is creating your dedicated storefront. You'll receive an email within 24 hours when it's ready.
                Status: <span className="font-mono">{request?.status}</span>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Your Domain</Label>
                <Input
                  placeholder="yourbrand.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter without http:// or www — e.g. <code>yourbrand.com</code>
                </p>
              </div>
              <Button onClick={handleRequestSetup} disabled={submitting || !domain.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Request Setup
              </Button>
              <div className="rounded-lg bg-muted/50 border p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">What happens next:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>You submit your domain here</li>
                  <li>Our team builds your dedicated storefront with the theme you chose</li>
                  <li>We email you simple DNS instructions (or set them up if you bought through us)</li>
                  <li>Your store goes live with HTTPS — usually within 24 hours</li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {store && <EmailDomainSection store={store} />}
    </div>
  );
};

export default DomainSettings;
