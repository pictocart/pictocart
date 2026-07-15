import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Search, Download, Banknote, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ['refunds-list', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('refunds')
        .select('id, order_id, amount, status, speed, reason, razorpay_refund_id, created_at, orders:order_id (order_number, customer_name, customer_email, payment_method)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
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
                      <TableCell className="text-sm">{r.razorpay_refund_id ? 'Razorpay' : 'Manual'}</TableCell>
                      <TableCell>
                        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', meta.color)}>{meta.label}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-mono text-xs">{r.razorpay_refund_id ?? '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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

export default Refunds;
