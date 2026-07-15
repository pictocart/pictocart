import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Truck, Package, CheckCircle2, MapPin, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const SHIPMENT_STATUS_META: Record<string, { label: string; color: string }> = {
  shipped:          { label: 'Shipped',          color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  delivered:        { label: 'Delivered',        color: 'bg-green-100 text-green-800 border-green-200' },
  returned:         { label: 'Returned',         color: 'bg-gray-100 text-gray-800 border-gray-200' },
  cancelled:        { label: 'Cancelled',        color: 'bg-red-100 text-red-800 border-red-200' },
};

const Shipments = () => {
  const { store } = useStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['shipments', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, customer_name, customer_phone, tracking_number, courier, awb, shipping_label_url, delivered_at, delivery_attempts, pod_url, created_at, total')
        .eq('store_id', store.id)
        .not('tracking_number', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!store?.id,
  });

  const filtered = useMemo(() => {
    return orders.filter((o: any) => {
      if (status !== 'all' && o.status !== status) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        o.order_number?.toLowerCase().includes(s) ||
        o.tracking_number?.toLowerCase().includes(s) ||
        o.awb?.toLowerCase().includes(s) ||
        o.customer_name?.toLowerCase().includes(s) ||
        o.courier?.toLowerCase().includes(s)
      );
    });
  }, [orders, search, status]);

  const summary = useMemo(() => ({
    total: orders.length,
    in_transit: orders.filter((o: any) => o.status === 'shipped' || o.status === 'out_for_delivery').length,
    delivered: orders.filter((o: any) => o.status === 'delivered').length,
    attempts: orders.reduce((a: number, o: any) => a + (o.delivery_attempts || 0), 0),
  }), [orders]);

  const exportCsv = () => {
    const rows = [
      ['Order', 'Customer', 'Courier', 'Tracking / AWB', 'Status', 'Attempts', 'Delivered On'],
      ...filtered.map((o: any) => [
        o.order_number,
        o.customer_name,
        o.courier ?? '',
        o.awb ?? o.tracking_number ?? '',
        o.status,
        o.delivery_attempts ?? 0,
        o.delivered_at ? format(new Date(o.delivered_at), 'yyyy-MM-dd') : '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shipments</h1>
          <p className="text-sm text-muted-foreground">{summary.total} shipment(s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={Package}       label="Total"        value={summary.total}      tone="default" />
        <MiniStat icon={Truck}         label="In transit"   value={summary.in_transit} tone="warning" />
        <MiniStat icon={CheckCircle2}  label="Delivered"    value={summary.delivered}  tone="success" />
        <MiniStat icon={MapPin}        label="Delivery attempts" value={summary.attempts} tone="default" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search order, AWB, courier, customer..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <Truck className="h-7 w-7 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No shipments yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Orders with tracking numbers will appear here.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Tracking / AWB</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Label / POD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o: any) => {
                  const meta = SHIPMENT_STATUS_META[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
                  return (
                    <TableRow key={o.id} className="hover:bg-muted/40">
                      <TableCell>
                        <Link to={`/orders/${o.id}`} className="text-primary hover:underline text-sm">#{o.order_number}</Link>
                      </TableCell>
                      <TableCell className="text-sm">{o.customer_name}</TableCell>
                      <TableCell className="text-sm">{o.courier ?? 'Shiprocket'}</TableCell>
                      <TableCell className="font-mono text-xs">{o.awb ?? o.tracking_number}</TableCell>
                      <TableCell><span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', meta.color)}>{meta.label}</span></TableCell>
                      <TableCell className="text-center">{o.delivery_attempts ?? 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.delivered_at ? format(new Date(o.delivered_at), 'dd MMM yyyy') : '—'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex gap-2">
                          {o.shipping_label_url && (
                            <a href={o.shipping_label_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                              Label <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {o.pod_url && (
                            <a href={o.pod_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                              POD <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {!o.shipping_label_url && !o.pod_url && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
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

const MiniStat = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: 'default' | 'success' | 'warning' }) => {
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

export default Shipments;
