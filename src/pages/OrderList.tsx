import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders, ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ShoppingCart, Eye, Download, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const OrderList = () => {
  const navigate = useNavigate();
  const { orders, loading } = useOrders();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('');
  const [updating, setUpdating] = useState(false);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.order_number.toLowerCase().includes(q) &&
          !(o.customer_name || '').toLowerCase().includes(q) &&
          !(o.customer_phone || '').toLowerCase().includes(q)
        )
          return false;
      }
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, search, statusFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selected);
      filtered.forEach((o) => next.delete(o.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((o) => next.add(o.id));
      setSelected(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const clearSelection = () => setSelected(new Set());

  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setUpdating(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from('orders').update({ status: bulkStatus }).in('id', ids);
    setUpdating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Updated ${ids.length} order${ids.length !== 1 ? 's' : ''}`);
    qc.invalidateQueries({ queryKey: ['orders'] });
    clearSelection();
    setBulkStatus('');
  };

  const exportCsv = () => {
    const rows = selected.size > 0 ? filtered.filter((o) => selected.has(o.id)) : filtered;
    if (rows.length === 0) {
      toast.error('No orders to export');
      return;
    }
    const headers = [
      'Order #', 'Date', 'Customer', 'Phone', 'Email',
      'Status', 'Payment', 'Method', 'Subtotal', 'Shipping', 'Tax', 'Total', 'Tracking',
    ];
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(',')].concat(
      rows.map((o) => [
        o.order_number,
        format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
        o.customer_name || '',
        o.customer_phone || '',
        o.customer_email || '',
        o.status || '',
        o.payment_status || '',
        o.payment_method || '',
        o.subtotal ?? 0,
        o.shipping ?? 0,
        o.tax ?? 0,
        o.total ?? 0,
        o.tracking_number || '',
      ].map(escape).join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} orders`);
  };

  const getStatusBadge = (status: string | null) => {
    const s = ORDER_STATUSES.find((st) => st.value === status);
    return s ? (
      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', s.color)}>
        {s.label}
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    );
  };

  const getPaymentBadge = (status: string | null) => {
    const s = PAYMENT_STATUSES.find((st) => st.value === status);
    return s ? (
      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', s.color)}>
        {s.label}
      </span>
    ) : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} order{orders.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div data-tour="orders-filters" className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order #, customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as OrderStatus)}>
            <SelectTrigger className="w-44 h-8">
              <SelectValue placeholder="Change status to..." />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={applyBulkStatus} disabled={!bulkStatus || updating}>
            {updating && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Empty state */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <ShoppingCart className="h-7 w-7 text-accent-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No orders yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Once your store is live and customers start buying, orders will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No orders match your filters.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border bg-card p-4 space-y-2 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected.has(order.id)}
                    onCheckedChange={() => toggleOne(order.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5"
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">#{order.order_number}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">{order.customer_name || 'Walk-in'}</span>
                      <span className="font-medium">₹{order.total ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>{format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                      {getPaymentBadge(order.payment_status)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Payment</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order, idx) => (
                  <TableRow key={order.id} data-tour={idx === 0 ? 'orders-row' : undefined} className={cn(selected.has(order.id) && 'bg-accent/30')}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(order.id)}
                        onCheckedChange={() => toggleOne(order.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                      #{order.order_number}
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                      <div>
                        <span className="font-medium">{order.customer_name || 'Walk-in'}</span>
                        {order.customer_phone && (
                          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(order.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{order.total ?? 0}</TableCell>
                    <TableCell className="text-center">{getPaymentBadge(order.payment_status)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/orders/${order.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderList;
