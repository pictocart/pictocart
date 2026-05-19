import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Printer, Download, Search, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Invoices = () => {
  const { store } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, invoice_number, customer_name, customer_phone, total, payment_status, payment_method, created_at, fulfillment_mode, table_label')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!store?.id,
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter((o: any) =>
      [o.invoice_number, o.order_number, o.customer_name, o.customer_phone]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s))
    );
  }, [orders, q]);

  const generateInvoice = async (orderId: string, storeId: string) => {
    const { data, error } = await (supabase as any).rpc('next_invoice_number', {
      _store_id: storeId,
      _prefix: 'INV',
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from('orders').update({ invoice_number: data } as any).eq('id', orderId);
    toast.success(`Invoice ${data} generated`);
    refetch();
  };

  const openInvoice = (orderId: string) => {
    window.open(`/invoices/${orderId}/print`, '_blank');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Invoices
          </h1>
          <p className="text-sm text-muted-foreground">All your tax invoices in one place. Print or save as PDF.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by invoice #, order #, customer name or phone..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading invoices...</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No invoices found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Invoice #</th>
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">Customer</th>
                    <th className="pb-2 font-medium hidden md:table-cell">Date</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Payment</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o: any) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-3 font-mono text-xs">
                        {o.invoice_number ? (
                          <span className="font-medium">{o.invoice_number}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          className="text-primary hover:underline"
                          onClick={() => navigate(`/orders/${o.id}`)}
                        >
                          #{o.order_number}
                        </button>
                        {o.fulfillment_mode === 'dine_in' && o.table_label && (
                          <Badge variant="outline" className="ml-2 text-[10px]">Table {o.table_label}</Badge>
                        )}
                      </td>
                      <td className="py-3 hidden sm:table-cell">{o.customer_name || '—'}</td>
                      <td className="py-3 hidden md:table-cell text-muted-foreground">
                        {format(new Date(o.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="py-3 font-semibold">₹{Number(o.total || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            o.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }
                        >
                          {o.payment_status || 'pending'}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!o.invoice_number ? (
                            <Button size="sm" variant="outline" onClick={() => generateInvoice(o.id, store!.id)}>
                              <FileText className="h-3.5 w-3.5 mr-1" /> Generate
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openInvoice(o.id)}>
                                <Printer className="h-3.5 w-3.5 mr-1" /> Print
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openInvoice(o.id)} title="Save as PDF">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
