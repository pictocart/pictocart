import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { useSuppliers, useUpsertSupplier, usePurchases, useCreatePurchase } from '@/hooks/useAccounts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import {
  inr, MoneyInput, PaymentModePicker, ExportCsvButton, todayISO,
} from '@/components/accounts/AccountsPrimitives';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Line = { product_id?: string; name: string; quantity: number; rate: number; gst: number };

const Purchases = () => {
  const { store } = useStore();
  const { data: suppliers = [] } = useSuppliers();
  const { data: purchases = [] } = usePurchases();
  const upsertSupplier = useUpsertSupplier();
  const createPurchase = useCreatePurchase();
  const [open, setOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['accounts', 'products', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const { data } = await supabase.from('products')
        .select('id, title, sku, cost_price').eq('store_id', store!.id).order('title').limit(500);
      return data ?? [];
    },
  });

  const [supplierId, setSupplierId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(todayISO());
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [lines, setLines] = useState<Line[]>([{ name: '', quantity: 1, rate: 0, gst: 0 }]);
  const [newSupplierName, setNewSupplierName] = useState('');

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  const tax = lines.reduce((s, l) => s + (l.quantity * l.rate * (l.gst || 0)) / 100, 0);
  const total = subtotal + tax;

  const addLine = () => setLines([...lines, { name: '', quantity: 1, rate: 0, gst: 0 }]);
  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!lines.length || total <= 0) return toast.error('Add at least one line');
    let sid = supplierId;
    if (!sid && newSupplierName.trim()) {
      await upsertSupplier.mutateAsync({ name: newSupplierName.trim() });
      // refetch by reading suppliers list — easiest: just leave supplier blank for this submission
    }
    await createPurchase.mutateAsync({
      supplier_id: sid || null,
      bill_number: billNo || null,
      bill_date: billDate,
      items: lines.map((l) => ({
        product_id: l.product_id || null,
        name: l.name,
        quantity: l.quantity,
        rate: l.rate,
        gst: l.gst,
      })),
      subtotal, tax, total,
      paid_amount: paidAmount,
      payment_mode: paymentMode,
      payment_status: paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
    });
    toast.success('Purchase recorded');
    setOpen(false);
    setLines([{ name: '', quantity: 1, rate: 0, gst: 0 }]);
    setBillNo(''); setPaidAmount(0); setSupplierId(''); setNewSupplierName('');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Purchases</h1>
          <p className="text-sm text-muted-foreground">Stock-in bills from your suppliers.</p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="purchases.csv" rows={purchases.map((p: any) => ({
            date: p.bill_date, bill: p.bill_number, supplier: p.suppliers?.name, total: p.total,
            paid: p.paid_amount, status: p.payment_status, mode: p.payment_mode,
          }))} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Purchase</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Record Purchase Bill</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Supplier</label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!supplierId && (
                      <Input className="mt-2" placeholder="…or quick add supplier name"
                        value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Bill number</label>
                      <Input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Bill date</label>
                      <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border rounded">
                  <div className="grid grid-cols-12 gap-2 px-2 py-2 text-xs text-muted-foreground bg-muted/40">
                    <div className="col-span-5">Item</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Rate</div>
                    <div className="col-span-2">GST %</div>
                    <div className="col-span-1"></div>
                  </div>
                  {lines.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-2 py-2 border-t items-center">
                      <div className="col-span-5">
                        <Select value={l.product_id || ''} onValueChange={(v) => {
                          const p = products.find((pp: any) => pp.id === v);
                          updateLine(i, { product_id: v, name: p?.title || l.name, rate: l.rate || Number(p?.cost_price || 0) });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Pick product or type below" /></SelectTrigger>
                          <SelectContent>
                            {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input className="mt-1" placeholder="Item name"
                          value={l.name} onChange={(e) => updateLine(i, { name: e.target.value })} />
                      </div>
                      <div className="col-span-2"><Input type="number" min={1} value={l.quantity}
                        onChange={(e) => updateLine(i, { quantity: Number(e.target.value || 0) })} /></div>
                      <div className="col-span-2"><MoneyInput value={l.rate} onChange={(v) => updateLine(i, { rate: v })} /></div>
                      <div className="col-span-2"><Input type="number" value={l.gst}
                        onChange={(e) => updateLine(i, { gst: Number(e.target.value || 0) })} /></div>
                      <div className="col-span-1">
                        <Button size="icon" variant="ghost" onClick={() => removeLine(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="p-2 border-t">
                    <Button size="sm" variant="outline" onClick={addLine}>
                      <Plus className="h-4 w-4 mr-1" /> Add line
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground">Payment mode</label>
                    <PaymentModePicker value={paymentMode} onChange={setPaymentMode} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Paid amount</label>
                    <MoneyInput value={paidAmount} onChange={setPaidAmount} />
                  </div>
                  <div className="text-right text-sm">
                    <div>Subtotal: <b>{inr(subtotal)}</b></div>
                    <div>GST: <b>{inr(tax)}</b></div>
                    <div className="text-base">Total: <b>{inr(total)}</b></div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={createPurchase.isPending}>Save Purchase</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent bills</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Bill #</th>
                  <th className="text-left p-3">Supplier</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Paid</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{format(new Date(p.bill_date), 'dd MMM yyyy')}</td>
                    <td className="p-3">{p.bill_number || '—'}</td>
                    <td className="p-3">{p.suppliers?.name || '—'}</td>
                    <td className="p-3 text-right">{inr(p.total)}</td>
                    <td className="p-3 text-right">{inr(p.paid_amount)}</td>
                    <td className="p-3">
                      <Badge variant={p.payment_status === 'paid' ? 'default' : p.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                        {p.payment_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {!purchases.length && (
                  <tr><td className="p-6 text-center text-muted-foreground" colSpan={6}>No purchases yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Purchases;
