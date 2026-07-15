import { useMemo, useState } from 'react';
import { useStoreReturns, RETURN_STATUSES, type ReturnStatus, type ReturnRequest } from '@/hooks/useReturns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Package, Search, CheckCircle2, Repeat2, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const EXCHANGE_FLOW: ReturnStatus[] = [
  'requested',
  'approved',
  'pickup_scheduled',
  'picked_up',
  'replacement_packed',
  'replacement_shipped',
  'replacement_delivered',
];

const Exchanges = () => {
  const { returns, loading, updateStatus } = useStoreReturns();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [nextStatus, setNextStatus] = useState<ReturnStatus>('approved');

  const exchanges = returns.filter((r) => r.request_type === 'exchange');
  const active = exchanges.find((r) => r.id === activeId);

  const filtered = useMemo(() => {
    return exchanges.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return r.reason?.toLowerCase().includes(s) || r.order_id.toLowerCase().includes(s);
    });
  }, [exchanges, search, statusFilter]);

  const stats = useMemo(() => ({
    total: exchanges.length,
    active: exchanges.filter((r) => !['replacement_delivered', 'rejected', 'cancelled'].includes(r.status)).length,
    completed: exchanges.filter((r) => r.status === 'replacement_delivered').length,
    cancelled: exchanges.filter((r) => r.status === 'rejected' || r.status === 'cancelled').length,
  }), [exchanges]);

  const openManage = (id: string) => {
    const r = exchanges.find((x) => x.id === id);
    if (!r) return;
    setActiveId(id);
    setNotes(r.seller_notes || '');
    // suggest next step in the flow
    const idx = EXCHANGE_FLOW.indexOf(r.status);
    setNextStatus(EXCHANGE_FLOW[Math.min(idx + 1, EXCHANGE_FLOW.length - 1)] ?? r.status);
  };

  const submit = async () => {
    if (!activeId || !active) return;
    await updateStatus.mutateAsync({ id: activeId, status: nextStatus, seller_notes: notes, order_id: active.order_id });
    setActiveId(null);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exchanges</h1>
        <p className="text-sm text-muted-foreground">{stats.total} exchange request(s)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Repeat2} label="Total"     value={stats.total}     tone="default" />
        <Stat icon={Truck}   label="In progress" value={stats.active}  tone="warning" />
        <Stat icon={CheckCircle2} label="Completed" value={stats.completed} tone="success" />
        <Stat icon={Package} label="Cancelled" value={stats.cancelled} tone="danger" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search reason or order..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RETURN_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <Repeat2 className="h-7 w-7 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No exchange requests</h3>
          <p className="text-sm text-muted-foreground mt-1">Customer-initiated exchange requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => <ExchangeCard key={r.id} r={r} onManage={() => openManage(r.id)} />)}
        </div>
      )}

      <Dialog open={!!activeId} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Manage Exchange</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-4">
              <ExchangeTimeline current={active.status} />
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><strong>Reason:</strong> {active.reason}</p>
                {active.exchange_details && (
                  <p><strong>Wants:</strong>{' '}
                    {active.exchange_details.preferred_size && `Size ${active.exchange_details.preferred_size} `}
                    {active.exchange_details.preferred_color && `· Colour ${active.exchange_details.preferred_color}`}
                  </p>
                )}
                {active.customer_notes && <p className="text-muted-foreground italic">"{active.customer_notes}"</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Set status</label>
                <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as ReturnStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RETURN_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Internal note (optional)</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveId(null)}>Cancel</Button>
                <Button onClick={submit} disabled={updateStatus.isPending}>
                  {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ExchangeCard = ({ r, onManage }: { r: ReturnRequest; onManage: () => void }) => {
  const meta = RETURN_STATUSES.find((s) => s.value === r.status);
  return (
    <Card>
      <CardContent className="py-4 flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/orders/${r.order_id}`} className="text-sm font-semibold hover:underline">Order</Link>
            <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', meta?.color)}>{meta?.label}</span>
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 border-indigo-200">Exchange</span>
          </div>
          <p className="text-sm mt-1"><span className="text-muted-foreground">Reason:</span> {r.reason}</p>
          {r.exchange_details && (
            <p className="text-xs mt-1 text-muted-foreground">
              Wants: {r.exchange_details.preferred_size && <>Size <strong>{r.exchange_details.preferred_size}</strong> </>}
              {r.exchange_details.preferred_color && <>· Colour <strong>{r.exchange_details.preferred_color}</strong></>}
            </p>
          )}
          {r.replacement_awb && (
            <p className="text-xs mt-1">
              <span className="text-muted-foreground">Replacement AWB:</span> <span className="font-mono">{r.replacement_awb}</span>
              {r.replacement_courier && <span className="text-muted-foreground"> · {r.replacement_courier}</span>}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a')}</p>
        </div>
        <div className="text-right">
          <Button size="sm" variant="outline" onClick={onManage}>Manage</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ExchangeTimeline = ({ current }: { current: ReturnStatus }) => {
  const idx = EXCHANGE_FLOW.indexOf(current);
  return (
    <div className="flex items-center">
      {EXCHANGE_FLOW.map((s, i) => {
        const info = RETURN_STATUSES.find((x) => x.value === s)!;
        const done = i <= idx;
        return (
          <div key={s} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2', done ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground')}>{i + 1}</div>
              <span className="text-[9px] text-center leading-tight w-14">{info.label}</span>
            </div>
            {i < EXCHANGE_FLOW.length - 1 && <div className={cn('mx-1 h-0.5 flex-1', i < idx ? 'bg-primary' : 'bg-muted')} />}
          </div>
        );
      })}
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: 'default' | 'success' | 'warning' | 'danger' }) => {
  const toneCls =
    tone === 'success' ? 'text-green-600 bg-green-50' :
    tone === 'warning' ? 'text-amber-600 bg-amber-50' :
    tone === 'danger'  ? 'text-red-600 bg-red-50' :
                         'text-primary bg-primary/10';
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-3">
        <div className={cn('h-9 w-9 rounded-full flex items-center justify-center', toneCls)}><Icon className="h-4 w-4" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Exchanges;
