import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAgentIncidents, useDomainStores, useHealthSummary, type StoreWithHealth } from '@/hooks/useDomainHealth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Trash2, Zap, ExternalLink, Clock } from 'lucide-react';
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

  const kpis = useMemo(() => {
    const total = stores.length;
    const active = stores.filter((s) => s.ssl_status === 'active' && (s.consecutive_failures ?? 0) === 0).length;
    const pending = stores.filter((s) => s.ssl_status && s.ssl_status !== 'active').length;
    const down = stores.filter((s) => (s.consecutive_failures ?? 0) >= 3).length;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const healed = incidents.filter((i) => ['recovered', 'reprovisioned', 'admin_reprovisioned'].includes(i.action) && new Date(i.created_at) >= today).length;
    return { total, active, pending, down, healed };
  }, [stores, incidents]);

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      if (search && !(`${s.name} ${s.custom_domain}`.toLowerCase().includes(search.toLowerCase()))) return false;
      if (filter === 'active') return s.ssl_status === 'active' && (s.consecutive_failures ?? 0) === 0;
      if (filter === 'pending') return s.ssl_status !== 'active';
      if (filter === 'down') return (s.consecutive_failures ?? 0) >= 3;
      return true;
    });
  }, [stores, filter, search]);

  const action = async (storeId: string, kind: 'reprovision' | 'force_ssl' | 'delete' | 'recheck') => {
    if (kind === 'delete' && !confirm('Disconnect this domain from Cloudflare? The store will lose its custom domain.')) return;
    setBusyId(`${storeId}-${kind}`);
    const { data, error } = await supabase.functions.invoke('admin-cloudflare-action', { body: { action: kind, store_id: storeId } });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? 'Action failed');
      return;
    }
    toast.success(`${kind.replace('_', ' ')} succeeded`);
    refetch();
  };

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
            <Zap className="h-5 w-5 text-primary" /> Cloudflare Auto-Pilot
          </h1>
          <p className="text-sm text-muted-foreground">Autonomous domain provisioning, monitoring & healing</p>
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
                    <TableHead>Domain</TableHead>
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
                    const isDown = (s.consecutive_failures ?? 0) >= 3;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{s.custom_domain}</div>
                          <div className="text-xs text-muted-foreground">{s.name}</div>
                        </TableCell>
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
  if (!status) return <Badge variant="secondary">—</Badge>;
  return <Badge variant="outline" className="text-amber-600 border-amber-300">{status.split('_').join(' ')}</Badge>;
};

const IconBtn = ({ children, onClick, title, busy, variant = 'outline' }: any) => (
  <Button size="icon" variant={variant} className="h-7 w-7" onClick={onClick} disabled={busy} title={title}>
    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
  </Button>
);

function severityColor(s: string) {
  return s === 'error' ? 'hsl(var(--destructive))' : s === 'warning' ? '#f59e0b' : 'hsl(var(--primary))';
}

export default AdminCloudflare;
