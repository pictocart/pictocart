import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders, ORDER_STATUSES, PAYMENT_STATUSES } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, ShoppingCart, Eye, Download, AlertCircle, List, Grid3X3, CalendarDays, X } from 'lucide-react';
import {
  format, parseISO, startOfDay, endOfDay,
  isToday, startOfMonth, endOfMonth,
  isSameDay, isSameMonth,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type DateMode = 'all' | 'today' | 'specific_date' | 'specific_month' | 'custom_range';

const OrderList = () => {
  const navigate = useNavigate();
  const { orders, loading } = useOrders();

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort]             = useState<'newest' | 'oldest'>('newest');
  const [view, setView]             = useState<'list' | 'grid'>('list');

  // Date filtering state
  const [dateMode, setDateMode]     = useState<DateMode>('all');
  const [specificDate, setSpecificDate] = useState('');   // YYYY-MM-DD
  const [specificMonth, setSpecificMonth] = useState(''); // YYYY-MM
  const [rangeFrom, setRangeFrom]   = useState('');
  const [rangeTo, setRangeTo]       = useState('');
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // ── Derived label for the date filter button ──────────────────────
  const dateBadgeLabel = useMemo(() => {
    if (dateMode === 'today') return 'Today';
    if (dateMode === 'specific_date' && specificDate)
      return format(parseISO(specificDate), 'dd MMM yyyy');
    if (dateMode === 'specific_month' && specificMonth)
      return format(parseISO(`${specificMonth}-01`), 'MMM yyyy');
    if (dateMode === 'custom_range') {
      if (rangeFrom && rangeTo)
        return `${format(parseISO(rangeFrom), 'dd MMM')} – ${format(parseISO(rangeTo), 'dd MMM yyyy')}`;
      if (rangeFrom) return `From ${format(parseISO(rangeFrom), 'dd MMM yyyy')}`;
      if (rangeTo)   return `To ${format(parseISO(rangeTo), 'dd MMM yyyy')}`;
    }
    return null;
  }, [dateMode, specificDate, specificMonth, rangeFrom, rangeTo]);

  const clearDateFilter = () => {
    setDateMode('all');
    setSpecificDate('');
    setSpecificMonth('');
    setRangeFrom('');
    setRangeTo('');
  };

  // ── Main filter + sort ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = orders.filter((o) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.order_number.toLowerCase().includes(q) &&
          !(o.customer_name || '').toLowerCase().includes(q) &&
          !(o.customer_phone || '').toLowerCase().includes(q)
        ) return false;
      }

      // Status
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Date
      const created = new Date(o.created_at);
      if (dateMode === 'today') {
        if (!isToday(created)) return false;
      } else if (dateMode === 'specific_date' && specificDate) {
        if (!isSameDay(created, parseISO(specificDate))) return false;
      } else if (dateMode === 'specific_month' && specificMonth) {
        const monthDate = parseISO(`${specificMonth}-01`);
        if (!isSameMonth(created, monthDate)) return false;
      } else if (dateMode === 'custom_range') {
        if (rangeFrom && created < startOfDay(parseISO(rangeFrom))) return false;
        if (rangeTo   && created > endOfDay(parseISO(rangeTo)))     return false;
      }

      return true;
    });

    // Sort
    list = [...list].sort((a, b) =>
      sort === 'newest'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return list;
  }, [orders, search, statusFilter, sort, dateMode, specificDate, specificMonth, rangeFrom, rangeTo]);

  // ── CSV Export ────────────────────────────────────────────────────
  const exportCsv = () => {
    if (filtered.length === 0) { toast.error('No orders to export'); return; }
    const headers = ['Order #', 'Date', 'Customer', 'Phone', 'Email', 'Status', 'Payment', 'Method', 'Subtotal', 'Shipping', 'Tax', 'Total', 'Tracking', 'Rejection Reason'];
    const escape = (v: any) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [headers.join(',')].concat(
      filtered.map((o) => [
        o.order_number,
        format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
        o.customer_name || '', o.customer_phone || '', o.customer_email || '',
        o.status || '', o.payment_status || '', o.payment_method || '',
        o.subtotal ?? 0, o.shipping ?? 0, o.tax ?? 0, o.total ?? 0,
        o.tracking_number || '',
        (o.status as string) === 'rejected' ? (o.notes || '') : '',
      ].map(escape).join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `orders-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} orders`);
  };

  // ── Badges ────────────────────────────────────────────────────────
  const getStatusBadge = (status: string | null) => {
    const s = ORDER_STATUSES.find((st) => st.value === status);
    return s
      ? <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', s.color)}>{s.label}</span>
      : <span className="text-xs text-muted-foreground">—</span>;
  };

  const getPaymentBadge = (status: string | null) => {
    const s = PAYMENT_STATUSES.find((st) => st.value === status);
    return s
      ? <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', s.color)}>{s.label}</span>
      : null;
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

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* ── Filters ── */}
      <div data-tour="orders-filters" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search order #, customer, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>

        {/* Date filter popover */}
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-10 gap-2 shrink-0', dateBadgeLabel && 'border-primary text-primary')}
            >
              <CalendarDays className="h-4 w-4" />
              {dateBadgeLabel ?? 'Date Filter'}
              {dateBadgeLabel && (
                <span
                  className="ml-1 rounded-full hover:bg-primary/10 p-0.5"
                  onClick={(e) => { e.stopPropagation(); clearDateFilter(); }}
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4 space-y-4" align="start">
            <p className="text-sm font-semibold">Filter by Date</p>

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'all',            label: 'All Time' },
                { value: 'today',          label: 'Today' },
                { value: 'specific_date',  label: 'Specific Date' },
                { value: 'specific_month', label: 'Specific Month' },
                { value: 'custom_range',   label: 'Custom Range' },
              ] as { value: DateMode; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateMode(opt.value)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    dateMode === opt.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Specific Date */}
            {dateMode === 'specific_date' && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Pick a date</label>
                <Input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            {/* Specific Month */}
            {dateMode === 'specific_month' && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Pick a month</label>
                <Input
                  type="month"
                  value={specificMonth}
                  onChange={(e) => setSpecificMonth(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            {/* Custom Range */}
            {dateMode === 'custom_range' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="text-sm" />
                </div>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={clearDateFilter}>Clear</Button>
              <Button size="sm" onClick={() => setDatePopoverOpen(false)}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* View toggle */}
        <div className="flex gap-1 rounded-lg border p-0.5 shrink-0">
          <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('list')} title="List view">
            <List className="h-4 w-4" />
          </Button>
          <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('grid')} title="Grid view">
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Active date filter badge ── */}
      {dateBadgeLabel && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <CalendarDays className="h-4 w-4" />
          <span>Showing orders for: <span className="font-semibold">{dateBadgeLabel}</span></span>
          <button onClick={clearDateFilter} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
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
        <div className="py-10 text-center space-y-2">
          <p className="text-muted-foreground">No orders match your filters.</p>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); clearDateFilter(); }}>
            Clear all filters
          </Button>
        </div>
      ) : view === 'grid' ? (

        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border bg-card p-4 space-y-2 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">#{order.order_number}</span>
                {getStatusBadge(order.status)}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">{order.customer_name || 'Walk-in'}</span>
                <span className="font-semibold">₹{order.total ?? 0}</span>
              </div>
              {order.customer_phone && <p className="text-xs text-muted-foreground">{order.customer_phone}</p>}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>{format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                {getPaymentBadge(order.payment_status)}
              </div>
              {order.updated_at && order.updated_at !== order.created_at && (
                <p className="text-xs text-muted-foreground">Updated: {format(new Date(order.updated_at), 'dd MMM yyyy, hh:mm a')}</p>
              )}
              {(order.status as string) === 'rejected' && order.notes && (
                <div className="flex items-start gap-1.5 rounded-md bg-orange-50 border border-orange-200 px-2 py-1.5 text-xs text-orange-800">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span><span className="font-semibold">Reason:</span> {order.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>

      ) : (

        /* ── LIST VIEW ── */
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border bg-card p-4 space-y-2 cursor-pointer"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">#{order.order_number}</span>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{order.customer_name || 'Walk-in'}</span>
                  <span className="font-medium">₹{order.total ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                  {getPaymentBadge(order.payment_status)}
                </div>
                {order.updated_at && order.updated_at !== order.created_at && (
                  <p className="text-xs text-muted-foreground">Updated: {format(new Date(order.updated_at), 'dd MMM yyyy, hh:mm a')}</p>
                )}
                {(order.status as string) === 'rejected' && order.notes && (
                  <div className="flex items-start gap-1.5 rounded-md bg-orange-50 border border-orange-200 px-2 py-1.5 text-xs text-orange-800">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span><span className="font-semibold">Rejection reason:</span> {order.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Payment</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Rejection Reason</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order, idx) => (
                  <TableRow key={order.id} data-tour={idx === 0 ? 'orders-row' : undefined}>
                    <TableCell className="font-medium cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                      #{order.order_number}
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                      <div>
                        <span className="font-medium">{order.customer_name || 'Walk-in'}</span>
                        {order.customer_phone && <p className="text-xs text-muted-foreground">{order.customer_phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(order.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {order.updated_at && order.updated_at !== order.created_at
                        ? format(new Date(order.updated_at), 'dd MMM yyyy, hh:mm a')
                        : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{order.total ?? 0}</TableCell>
                    <TableCell className="text-center">{getPaymentBadge(order.payment_status)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="max-w-[200px]">
                      {(order.status as string) === 'rejected' && order.notes ? (
                        <div className="flex items-start gap-1 text-xs text-orange-700">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-orange-500" />
                          <span className="line-clamp-2">{order.notes}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
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
