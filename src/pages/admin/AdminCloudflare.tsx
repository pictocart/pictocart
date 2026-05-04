import { Fragment, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAgentIncidents, useDomainStores, useHealthSummary, type StoreWithHealth } from '@/hooks/useDomainHealth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Trash2, Zap, ExternalLink, Clock, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Filter = 'all' | 'active' | 'pending' | 'down';

const AdminCloudflare = () => {
  const { data: stores = [], isLoading, refetch } = useDomainStores();
  const { data: incidents = [] } = useAgentIncidents(40);
  const { data: uptime = {} } = useHealthSummary();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const total = stores.length;
    const active = stores.filter((s) => s.domain_state === 'healthy').length;
    const pending = stores.filter((s) => s.domain_state === 'ssl_pending' || s.domain_state === 'dns_propagating').length;
    const down = stores.filter((s) => s.domain_state === 'down').length;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const healed = incidents.filter((i) => ['recovered', 'reprovisioned', 'admin_reprovisioned'].includes(i.action) && new Date(i.created_at) >= today).length;
    return { total, active, pending, down, healed };
  }, [stores, incidents]);

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      if (search && !(`${s.name} ${s.custom_domain}`.toLowerCase().includes(search.toLowerCase()))) return false;
      if (filter === 'active') return s.domain_state === 'healthy';
      if (filter === 'pending') return s.domain_state === 'ssl_pending' || s.domain_state === 'dns_propagating';
      if (filter === 'down') return s.domain_state === 'down';
      return true;
    });
  }, [stores, filter, search]);

  const action = async (storeId: string, kind: 'reprovision' | 'force_ssl' | 'delete' | 'recheck' | 'clear_stale_id' | 'refresh_validation_token') => {
    if (kind === 'delete' && !confirm('Disconnect this domain from Cloudflare? The store will lose its custom domain.')) return;
    setBusyId(`${storeId}-${kind}`);
    const { data, error } = await supabase.functions.invoke('admin-cloudflare-action', { body: { action: kind, store_id: storeId } });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? 'Action failed');
      return;
    }
    toast.success(`${kind.replace(/_/g, ' ')} succeeded`);
    refetch();
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success('Copied'); };

  const runAgentNow = async () => {
    setBulkBusy(true);
    const { data, error } = await supabase.functions.invoke('cloudflare-agent', { body: { trigger: 'manual' } });
    setBulkBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Agent processed ${(data as any)?.processed ?? 0} domains`);
    refetch();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Custom Domains
          </h1>
          <p className="text-sm text-muted-foreground">Cross-store domain health, SSL provisioning & auto-healing</p>
        </div>
        <Button onClick={runAgentNow} disabled={bulkBusy}>
          {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run agent now
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi icon={<Activity className="h-4 w-4" />} label="Total" value={kpis.total} />
        <Kpi icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Active" value={kpis.active} />
        <Kpi icon={<Clock className="h-4 w-4 text-amber-500" />} label="Pending SSL" value={kpis.pending} />
        <Kpi icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Down" value={kpis.down} />
        <Kpi icon={<ShieldCheck className="h-4 w-4 text-primary" />} label="Healed today" value={kpis.healed} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 gap-3 flex-wrap">
            <CardTitle className="text-base">Domains</CardTitle>
            <div className="flex items-center gap-2">
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-40" />
              {(['all', 'active', 'pending', 'down'] as Filter[]).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="h-8 capitalize">{f}</Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No domains match.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Domain</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>SSL</TableHead>
                    <TableHead>Uptime 24h</TableHead>
                    <TableHead>Last check</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const up = uptime[s.id]?.up ?? 0;
                    const total = uptime[s.id]?.total ?? 0;
                    const pct = total ? Math.round((up / total) * 100) : null;
                    const isDown = s.domain_state === 'down';
                    const isOpen = expandedId === s.id;
                    return (
                      <Fragment key={s.id}>
                      <TableRow>
                        <TableCell className="pr-0">
                          <button onClick={() => setExpandedId(isOpen ? null : s.id)} className="p-1 rounded hover:bg-muted" aria-label="Toggle details">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{s.custom_domain}</div>
                          <div className="text-xs text-muted-foreground">{s.name}</div>
                        </TableCell>
                        <TableCell><StateBadge state={s.domain_state} strategy={s.domain_strategy} /></TableCell>
                        <TableCell><SSLBadge status={s.ssl_status} down={isDown} /></TableCell>
                        <TableCell>
                          {pct === null ? <span className="text-xs text-muted-foreground">—</span> :
                            <span className={pct >= 99 ? 'text-emerald-600' : pct >= 95 ? 'text-amber-600' : 'text-destructive'}>{pct}%</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.last_health_check_at ? formatDistanceToNow(new Date(s.last_health_check_at), { addSuffix: true }) : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <IconBtn busy={busyId === `${s.id}-recheck`} onClick={() => action(s.id, 'recheck')} title="Recheck"><RefreshCw className="h-3.5 w-3.5" /></IconBtn>
                            <IconBtn busy={busyId === `${s.id}-reprovision`} onClick={() => action(s.id, 'reprovision')} title="Re-provision"><Zap className="h-3.5 w-3.5" /></IconBtn>
                            <IconBtn busy={busyId === `${s.id}-force_ssl`} onClick={() => action(s.id, 'force_ssl')} title="Force SSL"><ShieldCheck className="h-3.5 w-3.5" /></IconBtn>
                            <IconBtn busy={busyId === `${s.id}-delete`} onClick={() => action(s.id, 'delete')} title="Disconnect" variant="destructive"><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                            <a href={`https://${s.custom_domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted" title="Open"><ExternalLink className="h-3.5 w-3.5" /></a>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={`${s.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={6} className="py-3">
                            <div className="grid md:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <Field label="Strategy" value={s.domain_strategy ?? '—'} />
                                <Field label="NS provider" value={s.ns_provider ?? '—'} />
                                <Field label="State age" value={s.state_entered_at ? formatDistanceToNow(new Date(s.state_entered_at), { addSuffix: true }) : '—'} />
                                <Field label="Hostname ID" value={s.cloudflare_hostname_id ?? '— (no SaaS hostname)'} />
                              </div>
                              <div className="space-y-2">
                                <div className="font-medium text-sm">SSL validation record</div>
                                {s.ssl_validation_name && s.ssl_validation_value ? (
                                  <>
                                    <CopyRow label="Type" value="TXT" onCopy={copy} />
                                    <CopyRow label="Name" value={s.ssl_validation_name} onCopy={copy} />
                                    <CopyRow label="Value" value={s.ssl_validation_value} onCopy={copy} />
                                  </>
                                ) : (
                                  <p className="text-muted-foreground">No live token. Click <strong>Recheck</strong> to fetch from Cloudflare, or <strong>Force SSL</strong> to switch to TXT validation.</p>
                                )}
                                <div className="flex gap-2 pt-2">
                                  <Button size="sm" variant="outline" onClick={() => action(s.id, 'refresh_validation_token')} disabled={busyId === `${s.id}-refresh_validation_token`}>
                                    {busyId === `${s.id}-refresh_validation_token` ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                                    Refresh token
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => action(s.id, 'clear_stale_id')} disabled={busyId === `${s.id}-clear_stale_id`}>
                                    Clear stale ID
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Live incident feed</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {incidents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No incidents yet — agent is quiet.</p>
            ) : incidents.map((i) => (
              <div key={i.id} className="text-xs border-l-2 pl-3 py-1" style={{ borderColor: severityColor(i.severity) }}>
                <div className="font-medium">{i.action.split('_').join(' ')}</div>
                <div className="text-muted-foreground">{i.domain ?? '—'}</div>
                <div className="text-muted-foreground">{formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Kpi = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card><CardContent className="p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </CardContent></Card>
);

const SSLBadge = ({ status, down }: { status: string | null; down: boolean }) => {
  if (down) return <Badge variant="destructive">Down</Badge>;
  if (status === 'active') return <Badge className="bg-emerald-500 hover:bg-emerald-500">Active</Badge>;
  if (status === 'managed_by_merchant') return <Badge variant="outline">Merchant CF</Badge>;
  if (!status) return <Badge variant="secondary">—</Badge>;
  return <Badge variant="outline" className="text-amber-600 border-amber-300">{status.split('_').join(' ')}</Badge>;
};

const StateBadge = ({ state, strategy }: { state: string | null; strategy: string | null }) => {
  if (!state) return <Badge variant="secondary">—</Badge>;
  const tone =
    state === 'healthy' ? 'bg-emerald-500 hover:bg-emerald-500 text-white' :
    state === 'down' ? '' :
    state === 'ssl_pending' || state === 'dns_propagating' ? 'border-amber-300 text-amber-700' :
    'border-muted-foreground/30';
  const variant = state === 'down' ? 'destructive' : state === 'healthy' ? 'default' : 'outline';
  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant={variant as any} className={tone}>{state.replace(/_/g, ' ')}</Badge>
      {strategy && <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{strategy}</span>}
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono truncate max-w-[60%]" title={value}>{value}</span>
  </div>
);

const CopyRow = ({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) => (
  <div className="flex items-center gap-2">
    <span className="text-muted-foreground w-12 shrink-0">{label}</span>
    <code className="flex-1 px-2 py-1 rounded bg-background border truncate font-mono text-[11px]" title={value}>{value}</code>
    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onCopy(value)}><Copy className="h-3 w-3" /></Button>
  </div>
);

const IconBtn = ({ children, onClick, title, busy, variant = 'outline' }: any) => (
  <Button size="icon" variant={variant} className="h-7 w-7" onClick={onClick} disabled={busy} title={title}>
    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
  </Button>
);

function severityColor(s: string) {
  return s === 'error' ? 'hsl(var(--destructive))' : s === 'warning' ? '#f59e0b' : 'hsl(var(--primary))';
}

export default AdminCloudflare;
