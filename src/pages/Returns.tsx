import { useMemo, useState } from 'react';
import { useStoreReturns, RETURN_STATUSES, type ReturnStatus, type ReturnRequest } from '@/hooks/useReturns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Undo2, Loader2, Search, Package, Truck, CheckCircle2, XCircle, Clock, Banknote, ShieldCheck, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const Returns = () => {
  const qc = useQueryClient();
  const { returns, loading, updateStatus } = useStoreReturns();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ReturnStatus>('approved');
  const [applyingBulk, setApplyingBulk] = useState(false);

  // Show only pure returns here (Exchanges have their own module)
  const scoped = returns.filter((r) => r.request_type !== 'exchange');
  const active = scoped.find((r) => r.id === activeId);

  const filtered = useMemo(() => {
    return scoped.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return r.reason?.toLowerCase().includes(s) || r.order_id.toLowerCase().includes(s) || r.customer_notes?.toLowerCase().includes(s);
    });
  }, [scoped, filter, search]);

  const stats = useMemo(() => ({
    total: scoped.length,
    pending: scoped.filter((r) => ['requested', 'approved', 'pickup_scheduled', 'picked_up', 'qc_pending'].includes(r.status)).length,
    refunded: scoped.filter((r) => ['refunded', 'refund_completed'].includes(r.status)).length,
    rejected: scoped.filter((r) => ['rejected', 'qc_failed', 'cancelled'].includes(r.status)).length,
    refundValue: scoped.reduce((a, r) => a + Number(r.refund_amount || 0), 0),
  }), [scoped]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyBulk = async () => {
    if (selected.size === 0) return;
    setApplyingBulk(true);
    try {
      for (const id of selected) {
        const r = scoped.find((x) => x.id === id);
        if (!r) continue;
        await updateStatus.mutateAsync({ id, status: bulkStatus, order_id: r.order_id });
      }
      toast.success(`Updated ${selected.size} return(s)`);
      setSelected(new Set());
    } finally {
      setApplyingBulk(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Returns</h1>
        <p className="text-sm text-muted-foreground">Enterprise return management</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Summary icon={Undo2}        label="Total returns" value={stats.total}    tone="default" />
        <Summary icon={Clock}        label="Pending"       value={stats.pending}  tone="warning" />
        <Summary icon={CheckCircle2} label="Refunded"      value={stats.refunded} tone="success" />
        <Summary icon={Banknote}     label="Refund value"  value={`₹${stats.refundValue.toLocaleString('en-IN')}`} tone="default" />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search reason, order, customer notes..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RETURN_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ReturnStatus)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RETURN_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>Set to: {s.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={applyBulk} disabled={applyingBulk}>
              {applyingBulk && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <Undo2 className="h-7 w-7 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No return requests</h3>
          <p className="text-sm text-muted-foreground mt-1">When customers request returns, they will appear here for your approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const meta = RETURN_STATUSES.find((s) => s.value === r.status);
            return (
              <Card key={r.id} className="transition-shadow hover:shadow-md">
                <CardContent className="py-4 flex flex-wrap items-start gap-4">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} className="mt-1" />
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/orders/${r.order_id}`} className="text-sm font-semibold hover:underline">Order</Link>
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', meta?.color)}>{meta?.label}</span>
                      {r.refund_status && (
                        <span className="rounded-full border px-2 py-0.5 text-xs font-medium bg-teal-50 text-teal-800 border-teal-200 capitalize">
                          Refund: {r.refund_status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1"><span className="text-muted-foreground">Reason:</span> {r.reason}</p>
                    {r.customer_notes && (<p className="text-xs text-muted-foreground mt-1 italic">"{r.customer_notes}"</p>)}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{Number(r.refund_amount).toLocaleString('en-IN')}</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => setActiveId(r.id)}>Manage</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!activeId} onOpenChange={(o) => !o && setActiveId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>Return Details</SheetTitle></SheetHeader>
          {active && <ReturnDetailsPanel r={active} onSaved={() => { qc.invalidateQueries({ queryKey: ['returns'] }); }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

/* ---------------- Details Panel ---------------- */

const ReturnDetailsPanel = ({ r, onSaved }: { r: ReturnRequest; onSaved: () => void }) => {
  const [status, setStatus] = useState<ReturnStatus>(r.status);
  const [sellerNotes, setSellerNotes] = useState(r.seller_notes || '');
  const [internalNotes, setInternalNotes] = useState(r.internal_notes || '');
  const [pickupCourier, setPickupCourier] = useState(r.pickup_courier || '');
  const [pickupAwb, setPickupAwb] = useState(r.pickup_awb || '');
  const [pickupDate, setPickupDate] = useState(r.pickup_scheduled_at ? r.pickup_scheduled_at.slice(0, 16) : '');
  const [qcStatus, setQcStatus] = useState<string>(r.qc_status || '');
  const [qcNotes, setQcNotes] = useState(r.qc_notes || '');
  const [refundStatus, setRefundStatus] = useState<string>(r.refund_status || '');
  const [saving, setSaving] = useState(false);
  const timeline: any[] = Array.isArray(r.timeline) ? r.timeline : [];

  const save = async () => {
    setSaving(true);
    const updates: any = {
      status,
      seller_notes: sellerNotes || null,
      internal_notes: internalNotes || null,
      pickup_courier: pickupCourier || null,
      pickup_awb: pickupAwb || null,
      pickup_scheduled_at: pickupDate ? new Date(pickupDate).toISOString() : null,
      qc_status: qcStatus || null,
      qc_notes: qcNotes || null,
      refund_status: refundStatus || null,
    };
    if (status === 'picked_up' && !r.picked_up_at) updates.picked_up_at = new Date().toISOString();
    if (refundStatus === 'processing' && !r.refund_initiated_at) updates.refund_initiated_at = new Date().toISOString();
    if (refundStatus === 'completed' && !r.refund_completed_at) updates.refund_completed_at = new Date().toISOString();
    const newEntry = { at: new Date().toISOString(), status, note: `Status set to ${status}` };
    updates.timeline = [...timeline, newEntry];

    const { error } = await supabase.from('returns' as any).update(updates).eq('id', r.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    // If refund completed or QC passed leading to received, sync order
    if (status === 'received' || refundStatus === 'completed' || status === 'refunded' || status === 'refund_completed') {
      await supabase.from('orders').update({ status: 'returned' }).eq('id', r.order_id);
    }
    toast.success('Return updated');
    onSaved();
  };

  return (
    <div className="space-y-4 mt-4">
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="items">Item Details</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        {/* ---------- Summary tab ---------- */}
        <TabsContent value="summary" className="space-y-5 mt-4">
          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Package className="h-4 w-4" /> Return Summary</h3>
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><strong>Order:</strong> <Link to={`/orders/${r.order_id}`} className="text-primary hover:underline">View</Link></p>
              <p><strong>Reason:</strong> {r.reason}</p>
              <p><strong>Refund amount:</strong> ₹{Number(r.refund_amount).toLocaleString('en-IN')}</p>
              <p><strong>Status:</strong> {RETURN_STATUSES.find((s) => s.value === r.status)?.label}</p>
              {r.customer_notes && <p className="text-muted-foreground italic">"{r.customer_notes}"</p>}
            </div>

            {/* Timeline inside summary card */}
            <div className="mt-4 rounded-md border p-3">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-wide"><Clock className="h-3.5 w-3.5" /> Timeline / History</h4>
              {timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                <ol className="space-y-2">
                  {[...timeline].reverse().map((t: any, i: number) => (
                    <li key={i} className="text-xs border-l-2 border-primary/40 pl-3">
                      <p className="font-medium">{t.note ?? t.status}</p>
                      <p className="text-muted-foreground">{t.at ? format(new Date(t.at), 'dd MMM yyyy, hh:mm a') : ''}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          {Array.isArray(r.customer_photos) && r.customer_photos.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Customer uploads</h3>
              <div className="grid grid-cols-4 gap-2">
                {r.customer_photos.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded overflow-hidden border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </TabsContent>

        {/* ---------- Item Details tab ---------- */}
        <TabsContent value="items" className="space-y-3 mt-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Items in this return</h3>
          {Array.isArray(r.items) && r.items.length > 0 ? (
            <div className="space-y-2">
              {r.items.map((it: any, i: number) => {
                const name = it.name || it.product_name || it.title || 'Item';
                const qty = it.quantity ?? it.qty ?? 1;
                const price = it.price ?? it.unit_price ?? it.amount;
                const variant = it.variant || it.variant_label || [it.size, it.color].filter(Boolean).join(' / ');
                const img = it.image || it.image_url || it.thumbnail;
                return (
                  <div key={i} className="flex gap-3 rounded-md border p-3">
                    {img ? (
                      <img src={img} alt={name} className="h-16 w-16 rounded object-cover border" />
                    ) : (
                      <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      {variant && <p className="text-xs text-muted-foreground">{variant}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Qty: {qty}{price != null && <> · ₹{Number(price).toLocaleString('en-IN')}</>}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
              No item details captured for this return.
            </div>
          )}

          {r.exchange_details && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-semibold mb-1">Exchange preferences</p>
              <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(r.exchange_details, null, 2)}</pre>
            </div>
          )}
        </TabsContent>

        {/* ---------- Manage tab ---------- */}
        <TabsContent value="manage" className="space-y-5 mt-4">
          <section>
            <label className="text-sm font-semibold mb-1 block">Return status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as ReturnStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RETURN_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Truck className="h-4 w-4" /> Pickup</h3>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Courier (e.g. Shiprocket)" value={pickupCourier} onChange={(e) => setPickupCourier(e.target.value)} />
              <Input placeholder="AWB / Waybill" value={pickupAwb} onChange={(e) => setPickupAwb(e.target.value)} />
              <Input type="datetime-local" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="col-span-2" />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Quality Check</h3>
            <Select value={qcStatus} onValueChange={setQcStatus}>
              <SelectTrigger><SelectValue placeholder="QC result" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Textarea className="mt-2" placeholder="QC notes" rows={2} value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} />
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Banknote className="h-4 w-4" /> Refund</h3>
            <Select value={refundStatus} onValueChange={setRefundStatus}>
              <SelectTrigger><SelectValue placeholder="Refund state" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Notes</h3>
            <Textarea placeholder="Note visible in customer conversation" value={sellerNotes} onChange={(e) => setSellerNotes(e.target.value)} rows={2} />
            <Textarea className="mt-2" placeholder="Internal note (not shared with customer)" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} />
          </section>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-background border-t flex justify-end gap-2">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save changes
        </Button>
      </div>
    </div>
  );
};

const Summary = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: 'default' | 'success' | 'warning' }) => {
  const toneCls =
    tone === 'success' ? 'text-green-600 bg-green-50' :
    tone === 'warning' ? 'text-amber-600 bg-amber-50' :
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

export default Returns;
