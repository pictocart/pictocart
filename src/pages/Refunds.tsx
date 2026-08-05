import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, RefreshCw, Search, Download, Banknote, CheckCircle2, Clock, XCircle, ShieldCheck, Truck, Calendar, DollarSign, AlertCircle, ArrowRight, History, Package, User, MapPin, Phone, ShoppingCart, PackageCheck, Ban, CalendarClock, PackageOpen, ClipboardCheck, ShieldAlert, Repeat2, Send, CreditCard, Bot, Home, Undo2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'processed' | 'created';

const REFUND_STATUS_META: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  created:    { label: 'Pending',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  processed:  { label: 'Completed',  color: 'bg-green-100 text-green-800 border-green-200' },
  completed:  { label: 'Completed',  color: 'bg-green-100 text-green-800 border-green-200' },
  failed:     { label: 'Failed',     color: 'bg-red-100 text-red-800 border-red-200' },
};

const Refunds = () => {
  const { store } = useStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [selectedReturn, setSelectedReturn] = useState<any>(null);

  const { data: refunds = [], isLoading, refetch } = useQuery({
    queryKey: ['refunds-list', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const [gatewayRes, returnsRes] = await Promise.all([
        supabase
          .from('refunds')
          .select('id, order_id, amount, status, speed, reason, razorpay_refund_id, created_at, orders (order_number, customer_name, customer_email, payment_method)')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('returns')
          .select('id, order_id, refund_amount, refund_status, request_type, status, reason, qc_status, qc_notes, timeline, pickup_awb, pickup_courier, items, updated_at, created_at, orders (order_number, customer_name, customer_email, payment_method, store_id, total, amount_refunded, payment_status, razorpay_payment_id)')
          .gt('refund_amount', 0)
          .order('updated_at', { ascending: false }),
      ]);
      if (gatewayRes.error) throw gatewayRes.error;
      if (returnsRes.error) throw returnsRes.error;
      const gateway = (gatewayRes.data ?? []).map((r: any) => ({ ...r, _source: 'gateway' }));
      const returnsRows = (returnsRes.data ?? [])
        .filter((r: any) => r.orders?.store_id === store.id && r.qc_status === 'passed')
        .map((r: any) => ({
          id: r.id,
          order_id: r.order_id,
          amount: r.refund_amount,
          status: r.refund_status || (r.status === 'refund_completed' ? 'processed' : 'pending'),
          speed: null,
          reason: r.reason,
          razorpay_refund_id: null,
          created_at: r.updated_at || r.created_at,
          orders: r.orders,
          qc_status: r.qc_status,
          qc_notes: r.qc_notes,
          timeline: r.timeline,
          pickup_awb: r.pickup_awb,
          pickup_courier: r.pickup_courier,
          items: r.items,
          _source: r.request_type === 'exchange' ? 'exchange' : 'return',
          rawReturn: r
        }));
      return [...gateway, ...returnsRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!store?.id,
  });


  const filtered = useMemo(() => {
    return refunds.filter((r: any) => {
      if (status !== 'all') {
        const norm = r.status === 'processed' ? 'completed' : r.status;
        if (norm !== status) return false;
      }
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        r.id.toLowerCase().includes(s) ||
        r.razorpay_refund_id?.toLowerCase().includes(s) ||
        r.orders?.order_number?.toLowerCase().includes(s) ||
        r.orders?.customer_name?.toLowerCase().includes(s) ||
        r.orders?.customer_email?.toLowerCase().includes(s)
      );
    });
  }, [refunds, search, status]);

  const totals = useMemo(() => {
    const sum = (pred: (r: any) => boolean) =>
      refunds.filter(pred).reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
    return {
      total: sum(() => true),
      completed: sum((r) => r.status === 'processed' || r.status === 'completed'),
      pending: sum((r) => r.status === 'pending' || r.status === 'created' || r.status === 'processing'),
      failed: sum((r) => r.status === 'failed'),
      count: refunds.length,
    };
  }, [refunds]);

  const exportCsv = () => {
    const rows = [
      ['Refund ID', 'Order', 'Customer', 'Amount', 'Method', 'Gateway', 'Status', 'Date', 'Transaction ID'],
      ...filtered.map((r: any) => [
        r.id,
        r.orders?.order_number ?? '',
        r.orders?.customer_name ?? '',
        r.amount,
        r.orders?.payment_method ?? '',
        r.razorpay_refund_id ? 'Razorpay' : 'Manual',
        r.status,
        format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
        r.razorpay_refund_id ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refunds-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Refunds</h1>
          <p className="text-sm text-muted-foreground">{totals.count} refund(s) processed</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={RefreshCw} label="Total refunded" value={`₹${totals.total.toLocaleString('en-IN')}`} tone="default" />
        <SummaryCard icon={CheckCircle2} label="Completed" value={`₹${totals.completed.toLocaleString('en-IN')}`} tone="success" />
        <SummaryCard icon={Clock} label="Pending / Processing" value={`₹${totals.pending.toLocaleString('en-IN')}`} tone="warning" />
        <SummaryCard icon={XCircle} label="Failed" value={`₹${totals.failed.toLocaleString('en-IN')}`} tone="danger" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search refund ID, order, customer, transaction..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <Banknote className="h-7 w-7 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No refunds found</h3>
          <p className="text-sm text-muted-foreground mt-1">Refunds you issue from orders will appear here.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Refund</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => {
                  const meta = REFUND_STATUS_META[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        {r.order_id ? (
                          <Link to={`/orders/${r.order_id}`} className="text-primary hover:underline text-sm">
                            #{r.orders?.order_number ?? r.order_id.slice(0, 6)}
                          </Link>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{r.orders?.customer_name ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold">₹{Number(r.amount).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="capitalize text-sm">{r.orders?.payment_method ?? '—'}</TableCell>
                      <TableCell className="text-sm capitalize">{r.razorpay_refund_id ? 'Razorpay' : r._source === 'return' ? 'Return' : r._source === 'exchange' ? 'Exchange' : 'Manual'}</TableCell>
                      <TableCell>
                        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', meta.color)}>{meta.label}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-mono text-xs">{r.razorpay_refund_id ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {r._source === 'return' ? (
                          r.status === 'pending' || r.status === 'created' || r.status === 'processing' ? (
                            <Button size="sm" onClick={() => setSelectedReturn(r)}>
                              Process Refund
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setSelectedReturn(r)}>
                              View details
                            </Button>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedReturn && (
        <ProcessRefundDialog 
          returnRequest={selectedReturn}
          open={!!selectedReturn}
          onOpenChange={(open) => !open && setSelectedReturn(null)}
          onRefunded={refetch}
        />
      )}
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'default' | 'success' | 'warning' | 'danger' }) => {
  const toneCls =
    tone === 'success' ? 'text-green-600 bg-green-50' :
    tone === 'warning' ? 'text-amber-600 bg-amber-50' :
    tone === 'danger'  ? 'text-red-600 bg-red-50' :
                         'text-primary bg-primary/10';
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-3">
        <div className={cn('h-9 w-9 rounded-full flex items-center justify-center', toneCls)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

interface ProcessRefundDialogProps {
  returnRequest: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefunded: () => void;
}

const ProcessRefundDialog = ({ returnRequest, open, onOpenChange, onRefunded }: ProcessRefundDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState<'normal' | 'optimum'>('normal');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [orderPopupOpen, setOrderPopupOpen] = useState(false);

  // Reset state when returnRequest changes
  useEffect(() => {
    if (returnRequest) {
      setAmount(String(returnRequest.amount || ''));
      setReason(returnRequest.reason || '');
    }
  }, [returnRequest]);

  if (!returnRequest) return null;

  const order = returnRequest.orders || {};
  const isOnline = !!order.razorpay_payment_id;
  const refundable = Math.max(0, Number(order.total || 0) - Number(order.amount_refunded || 0));
  const items = Array.isArray(returnRequest.items) ? returnRequest.items : [];
  const timeline = Array.isArray(returnRequest.timeline) ? returnRequest.timeline : [];

  const handleOnlineRefund = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > refundable) {
      toast.error(`Enter a refund amount between ₹0.01 and ₹${refundable.toFixed(2)}`);
      return;
    }
    setLoading(true);
    try {
      // 1. Invoke razorpay-refund Edge Function
      const { data, error } = await supabase.functions.invoke('razorpay-refund', {
        body: { order_id: returnRequest.order_id, amount: amt, reason: reason || undefined, speed }
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Gateway refund failed');
      }

      // 2. Insert timeline event
      const newTimeline = [
        ...timeline,
        {
          at: new Date().toISOString(),
          status: 'refund_initiated',
          note: `Refund initiated via Razorpay: ₹${amt.toFixed(2)} (${speed.toUpperCase()} speed)`
        }
      ];

      // 3. Update return request status and refund status
      const { error: rErr } = await supabase
        .from('returns')
        .update({
          refund_status: 'processing',
          status: 'refund_initiated',
          timeline: newTimeline
        })
        .eq('id', returnRequest.id);
      if (rErr) throw rErr;

      // 4. Update order payment status
      await supabase.from('orders').update({ payment_status: 'refund_in_process' as any, status: 'returned' }).eq('id', returnRequest.order_id);

      toast.success(`Razorpay refund initiated: ₹${amt.toFixed(2)}`);
      onRefunded();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Refund failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefund = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    setLoading(true);
    try {
      // 1. Insert timeline event
      const newTimeline = [
        ...timeline,
        {
          at: new Date().toISOString(),
          status: 'refund_completed',
          note: `Refund processed manually: ₹${amt.toFixed(2)}`
        }
      ];

      // 2. Update return request status and refund status
      const { error: rErr } = await supabase
        .from('returns')
        .update({
          refund_status: 'completed',
          status: 'refund_completed',
          timeline: newTimeline
        })
        .eq('id', returnRequest.id);
      if (rErr) throw rErr;

      // 3. Update order status and amount refunded
      const newRefunded = Number(order.amount_refunded || 0) + amt;
      await supabase
        .from('orders')
        .update({
          status: 'returned',
          payment_status: (newRefunded >= Number(order.total || 0) ? 'refunded' : 'partially_refunded') as any,
          amount_refunded: newRefunded
        })
        .eq('id', returnRequest.order_id);

      toast.success(`Manual refund recorded: ₹${amt.toFixed(2)}`);
      onRefunded();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update refund status');
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = returnRequest.status === 'refund_completed' || returnRequest.status === 'refunded' || returnRequest.status === 'processed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3 mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold flex-wrap">
            <Banknote className="h-5 w-5 text-primary" />
            <span>{isCompleted ? 'Refund Details' : 'Process Refund'} for Order #{order.order_number || returnRequest.order_id.slice(0, 8)}</span>
            <Button 
              variant="link" 
              className="text-xs text-primary h-auto p-0 font-semibold hover:underline flex items-center gap-1"
              onClick={() => setOrderPopupOpen(true)}
            >
              (View Full Order Details & History)
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left panel: Journey & QC details */}
          <div className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Return Journey Timeline
              </h3>
              <div className="rounded-lg border p-4 bg-muted/20">
                {timeline.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No journey logs found</p>
                ) : (
                  <ol className="space-y-3 relative border-l border-primary/20 pl-4 ml-1">
                    {timeline.map((t: any, i: number) => (
                      <li key={i} className="text-xs space-y-0.5 relative pl-2">
                        <div className="absolute -left-[22px] mt-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                        <p className="font-semibold text-foreground capitalize">{t.note || t.status}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.at ? format(new Date(t.at), 'dd MMM yyyy, hh:mm a') : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Store quality check
              </h3>
              <div className="rounded-lg border p-4 bg-muted/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">QC Status:</span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 capitalize">
                    {returnRequest.qc_status || 'passed'}
                  </Badge>
                </div>
                {returnRequest.qc_notes && (
                  <div className="pt-2 border-t">
                    <span className="font-medium text-muted-foreground block mb-0.5">QC Notes:</span>
                    <p className="italic text-foreground">"{returnRequest.qc_notes}"</p>
                  </div>
                )}
              </div>
            </section>

            {(returnRequest.customer_notes || (Array.isArray(returnRequest.customer_photos) && returnRequest.customer_photos.length > 0)) && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Customer Proof & Notes
                </h3>
                <div className="rounded-lg border p-4 bg-muted/20 space-y-3 text-xs">
                  {returnRequest.customer_notes && (
                    <div>
                      <span className="font-medium text-muted-foreground block mb-0.5">Notes & Address:</span>
                      <p className="italic text-foreground whitespace-pre-line">"{returnRequest.customer_notes}"</p>
                    </div>
                  )}
                  {Array.isArray(returnRequest.customer_photos) && returnRequest.customer_photos.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="font-medium text-muted-foreground block mb-1.5">Uploaded Proof:</span>
                      <div className="grid grid-cols-4 gap-2">
                        {returnRequest.customer_photos.map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded overflow-hidden border bg-background hover:opacity-85 transition-opacity">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Returned Items
              </h3>
              <div className="rounded-lg border p-3 bg-muted/20 space-y-2 max-h-[160px] overflow-y-auto">
                {items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs p-1.5 border rounded bg-background">
                    <div>
                      <p className="font-semibold">{it.title || it.name || it.product_name || 'Item'}</p>
                      {it.variant && <p className="text-[10px] text-muted-foreground">{it.variant}</p>}
                    </div>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">QTY: {it.quantity ?? it.qty ?? 1}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right panel: Payout Actions */}
          <div className="space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Payout summary
                </h3>
                <div className="rounded-lg border p-4 bg-muted/20 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-bold capitalize">{order.payment_method || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Total:</span>
                    <span className="font-semibold">₹{Number(order.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already Refunded:</span>
                    <span className="font-semibold text-rose-600">₹{Number(order.amount_refunded || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-sm">
                    <span className="font-semibold">Target Refund:</span>
                    <span className="font-bold text-emerald-600">₹{Number(returnRequest.amount).toFixed(2)}</span>
                  </div>
                </div>
              </section>

              {!isCompleted && (
                <section className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="ref-amount" className="text-xs font-medium">Refund Amount (₹)</Label>
                    <Input id="ref-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ref-reason" className="text-xs font-medium">Refund Reason</Label>
                    <Textarea id="ref-reason" placeholder="Reason for refund..." rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </div>

                  {isOnline && (
                    <div className="space-y-2 p-3 rounded-lg border bg-blue-50/50 border-blue-100">
                      <Label htmlFor="ref-speed" className="text-xs font-semibold flex items-center gap-1 text-blue-800">
                        <RefreshCw className="h-3 w-3" /> Online Gateway Payout Speed
                      </Label>
                      <Select value={speed} onValueChange={(v) => setSpeed(v as any)}>
                        <SelectTrigger className="bg-background border-blue-200 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal Refund (3-5 business days)</SelectItem>
                          <SelectItem value="optimum">Instant Refund (Optimum Speed)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </section>
              )}
            </div>

            <div className="pt-4 border-t flex flex-col gap-2">
              {isCompleted ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>This return request is fully completed and refunded.</span>
                </div>
              ) : (
                <>
                  {isOnline && (
                    <Button onClick={handleOnlineRefund} disabled={loading} className="w-full">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Refund via Razorpay (₹{Number(amount || 0).toFixed(2)})
                    </Button>
                  )}
                  <Button onClick={handleManualRefund} disabled={loading} variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/5">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Mark Payout Completed Manually
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {orderPopupOpen && (
          <OrderDetailsPopupDialog 
            orderId={returnRequest.order_id} 
            open={orderPopupOpen} 
            onOpenChange={setOrderPopupOpen} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

interface OrderDetailsPopupDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrderDetailsPopupDialog = ({ orderId, open, onOpenChange }: OrderDetailsPopupDialogProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['order-full-details-popup', orderId],
    enabled: open && !!orderId,
    queryFn: async () => {
      const [{ data: order }, { data: history }, { data: returns }, { data: refunds }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).maybeSingle(),
        supabase.from('order_status_history' as any).select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
        supabase.from('returns' as any).select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
        supabase.from('refunds' as any).select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
      ]);
      return {
        order: order as any,
        history: (history || []) as any[],
        returns: (returns || []) as any[],
        refunds: (refunds || []) as any[],
      };
    }
  });

  if (!open) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </DialogContent>
      </Dialog>
    );
  }

  const order = data?.order;
  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl p-6">
          <p className="text-sm text-rose-600 text-center">Order details not found.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const addr = (order.customer_address || {}) as any;
  const addressText = addr.address || addr.line1 || '';
  const apartmentText = addr.apartment || addr.line2 || '';

  // Timeline events compiler from OrderHistoryDialog
  type Actor = 'System' | 'Customer' | 'Admin' | 'Merchant';
  const actorIcon = (a: Actor) => (a === 'Customer' ? User : a === 'System' ? Bot : User);
  const toneMap: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    rose: 'bg-rose-100 text-rose-800 border-rose-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    teal: 'bg-teal-100 text-teal-800 border-teal-200',
    sky: 'bg-sky-100 text-sky-800 border-sky-200',
  };

  const STATUS_META: Record<string, { label: string; icon: any; tone: string }> = {
    new:               { label: 'Order Created',       icon: ShoppingCart, tone: 'emerald' },
    pending:           { label: 'Pending',              icon: Clock,        tone: 'yellow' },
    confirmed:         { label: 'Order Confirmed',      icon: CheckCircle2, tone: 'blue' },
    processing:        { label: 'Processing',           icon: Loader2,      tone: 'purple' },
    packed:            { label: 'Packed',               icon: PackageCheck, tone: 'cyan' },
    shipped:           { label: 'Shipped',              icon: Truck,        tone: 'indigo' },
    out_for_delivery:  { label: 'Out for Delivery',     icon: MapPin,       tone: 'sky' },
    delivered:         { label: 'Delivered',            icon: Home,         tone: 'green' },
    rejected:          { label: 'Order Rejected',       icon: Ban,          tone: 'orange' },
    cancelled:         { label: 'Order Cancelled',      icon: XCircle,      tone: 'red' },
    returned:          { label: 'Returned',             icon: Undo2,        tone: 'slate' },

    requested:              { label: 'Return Requested',       icon: Undo2,        tone: 'yellow' },
    approved:               { label: 'Return Approved',        icon: CheckCircle2, tone: 'blue' },
    pickup_scheduled:       { label: 'Pickup Scheduled',       icon: CalendarClock,tone: 'cyan' },
    picked_up:              { label: 'Pickup Completed',       icon: PackageOpen,  tone: 'indigo' },
    qc_pending:             { label: 'Quality Check Started',  icon: ClipboardCheck,tone: 'amber' },
    qc_passed:              { label: 'Quality Check Passed',   icon: ShieldCheck,  tone: 'emerald' },
    qc_failed:              { label: 'Quality Check Failed',   icon: ShieldAlert,  tone: 'rose' },
    received:               { label: 'Return Received',        icon: PackageCheck, tone: 'purple' },
    refund_initiated:       { label: 'Refund Initiated',       icon: Banknote,     tone: 'teal' },
    refund_completed:       { label: 'Refund Completed',       icon: Banknote,     tone: 'green' },
    refunded:               { label: 'Refunded',               icon: Banknote,     tone: 'green' },
    replacement_packed:     { label: 'Replacement Packed',     icon: PackageCheck, tone: 'cyan' },
    replacement_shipped:    { label: 'Replacement Shipped',    icon: Send,         tone: 'indigo' },
    replacement_delivered:  { label: 'Replacement Delivered',  icon: Home,         tone: 'green' },
    cancelled_return:       { label: 'Return Cancelled',       icon: XCircle,      tone: 'slate' },
  };

  const metaFor = (status?: string | null) => (status && STATUS_META[status]) || { label: status || 'Update', icon: Clock, tone: 'slate' };

  const events: any[] = [];
  if (order) {
    const historyRows = data?.history || [];
    if (historyRows.length === 0) {
      events.push({
        at: order.created_at,
        title: 'Order Created',
        to: order.status,
        by: 'Customer',
        note: `Order #${order.order_number} placed`,
        icon: ShoppingCart,
        tone: 'emerald',
      });
    } else {
      historyRows.forEach((h: any) => {
        const m = metaFor(h.to_status);
        const isCreation = !h.from_status;
        events.push({
          at: h.created_at,
          title: isCreation ? 'Order Created' : `Status changed to ${m.label}`,
          from: h.from_status,
          to: h.to_status,
          by: h.actor || 'System',
          note: isCreation ? `Order #${order.order_number} placed` : (h.note || null),
          icon: isCreation ? ShoppingCart : m.icon,
          tone: isCreation ? 'emerald' : m.tone,
        });
      });
    }

    if (order.payment_status === 'paid') {
      events.push({
        at: order.updated_at || order.created_at,
        title: 'Payment Received',
        to: 'paid',
        by: order.payment_method === 'razorpay' ? 'System' : 'Merchant',
        note: order.payment_method ? `via ${String(order.payment_method).toUpperCase()}` : null,
        icon: CreditCard,
        tone: 'green',
      });
    }

    if (order.tracking_number || order.awb) {
      events.push({
        at: order.shipped_at || order.updated_at || order.created_at,
        title: 'Shipped',
        from: 'processing', to: 'shipped',
        by: 'Merchant',
        note: `AWB ${order.awb || order.tracking_number}${order.courier ? ` · ${order.courier}` : ''}`,
        icon: Truck,
        tone: 'indigo',
      });
    }

    if (order.delivered_at) {
      events.push({
        at: order.delivered_at,
        title: 'Delivered',
        from: 'out_for_delivery', to: 'delivered',
        by: 'System',
        note: order.pod_url ? 'POD available' : null,
        icon: Home,
        tone: 'green',
      });
    }
  }

  (data?.returns || []).forEach((r) => {
    const label = r.request_type === 'exchange' ? 'Exchange Requested' : 'Return Requested';
    events.push({
      at: r.created_at,
      title: label,
      to: r.status,
      by: 'Customer',
      note: r.reason,
      icon: r.request_type === 'exchange' ? Repeat2 : Undo2,
      tone: 'yellow',
    });
    const tl = Array.isArray(r.timeline) ? r.timeline : [];
    tl.forEach((t: any, i: number) => {
      const m = metaFor(t.status);
      events.push({
        at: t.at || r.updated_at || r.created_at,
        title: t.note || m.label,
        from: i > 0 ? tl[i - 1]?.status : r.status,
        to: t.status,
        by: t.by || 'Merchant',
        note: t.remarks || null,
        icon: m.icon,
        tone: m.tone,
      });
    });
  });

  (data?.refunds || []).forEach((rf) => {
    events.push({
      at: rf.created_at,
      title: `Refund ${rf.status === 'completed' ? 'Completed' : 'Initiated'}`,
      to: rf.status,
      by: 'Merchant',
      note: rf.amount ? `₹${Number(rf.amount).toLocaleString('en-IN')}${rf.reason ? ` · ${rf.reason}` : ''}` : rf.reason,
      icon: Banknote,
      tone: rf.status === 'completed' ? 'green' : 'teal',
    });
  });

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[88vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3 mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Package className="h-5 w-5 text-primary" />
            Full Order Details & History - #{order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Customer details & Items */}
          <div className="lg:col-span-5 space-y-5">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Customer Details
              </h3>
              <div className="rounded-lg border p-4 bg-muted/20 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-semibold text-foreground">{order.customer_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-semibold text-foreground">{order.customer_email || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-semibold text-foreground">{order.customer_phone || '—'}</span>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Shipping Address
              </h3>
              <div className="rounded-lg border p-4 bg-muted/20 text-xs space-y-1">
                <p className="font-semibold text-foreground">{order.customer_name}</p>
                {addressText ? <p>{addressText}</p> : <p className="italic text-muted-foreground">No street address provided</p>}
                {apartmentText && <p>{apartmentText}</p>}
                <p>{addr.city || '—'}, {addr.state || '—'} - {addr.pincode || '—'}</p>
                {order.customer_phone && <p className="pt-1.5 flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> {order.customer_phone}</p>}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Ordered Items
              </h3>
              <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
                {items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2.5 border rounded bg-background">
                    <div>
                      <p className="font-semibold">{it.title || it.name || it.product_name || 'Item'}</p>
                      {it.variant && <p className="text-[10px] text-muted-foreground">{it.variant}</p>}
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">₹{Number(it.price).toFixed(2)} each</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] block mb-1">QTY: {it.quantity ?? it.qty ?? 1}</span>
                      <p className="font-semibold">₹{(Number(it.price) * Number(it.quantity ?? it.qty ?? 1)).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right panel: Timeline card list */}
          <div className="lg:col-span-7 space-y-5">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Order Status History
              </h3>
              <div className="rounded-lg border p-4 bg-muted/20">
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">No history logs found</p>
                ) : (
                  <ol className="relative border-l-2 border-dashed border-muted ml-4 space-y-5 py-2">
                    {events.map((e: any, i: number) => {
                      const Icon = e.icon;
                      const ActorIcon = actorIcon(e.by);
                      return (
                        <li key={i} className="ml-6">
                          <span className={cn('absolute -left-[17px] flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-background border', toneMap[e.tone])}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="rounded-lg border bg-background p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm">{e.title}</p>
                                {(e.from || e.to) && (
                                  <div className="flex items-center gap-1 text-xs">
                                    {e.from && <Badge variant="outline" className="font-normal">{metaFor(e.from).label}</Badge>}
                                    {e.from && e.to && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                                    {e.to && <Badge className={cn('font-normal border', toneMap[e.tone])}>{metaFor(e.to).label}</Badge>}
                                  </div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-medium">{format(new Date(e.at), 'dd MMM yyyy')}</p>
                                <p className="text-[11px] text-muted-foreground">{format(new Date(e.at), 'hh:mm a')}</p>
                              </div>
                            </div>
                            {e.note && <p className="text-xs text-muted-foreground mt-1.5">{e.note}</p>}
                            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                              <ActorIcon className="h-3.5 w-3.5" />
                              <span>Updated by <span className="font-medium text-foreground">{e.by}</span></span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Payment Details
              </h3>
              <div className="rounded-lg border p-4 bg-muted/20 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-bold capitalize">{order.payment_method || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <span className="font-semibold capitalize">{order.payment_status || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono text-muted-foreground">{order.razorpay_payment_id || '—'}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-sm font-bold">
                  <span>Grand Total:</span>
                  <span className="text-primary">₹{Number(order.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Refunds;


