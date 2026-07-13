import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, IndianRupee } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { useSuppliers, useUpsertSupplier, usePurchases, useCreatePurchase, useUpdatePurchase } from '@/hooks/useAccounts';
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
  const updatePurchase = useUpdatePurchase();

  // ── New purchase dialog ──────────────────────────────────────────
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

  const resetForm = () => {
    setSupplierId('');
    setBillNo('');
    setBillDate(todayISO());   // ✅ Fix #1 — always today, never stale
    setPaymentMode('cash');
    setPaidAmount(0);
    setLines([{ name: '', quantity: 1, rate: 0, gst: 0 }]);
    setNewSupplierName('');
  };

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

  // ✅ Fix #2 — paid amount capped at total
  const safePaidAmount = Math.min(paidAmount, total);
  const remaining = Math.max(0, total - safePaidAmount);

  const addLine = () => setLines([...lines, { name: '', quantity: 1, rate: 0, gst: 0 }]);
  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const handlePaidAmountChange = (v: number) => {
    if (total > 0 && v > total) {
      toast.error(`Paid amount cannot exceed total (${inr(total)})`);
      setPaidAmount(total);
    } else {
      setPaidAmount(v);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (v) resetForm(); // ✅ Fix #1 — reset to today every time dialog opens
    setOpen(v);
  };

  const submit = async () => {
    if (!lines.length || total <= 0) return toast.error('Add at least one line');
    if (safePaidAmount > total) return toast.error(`Paid amount cannot exceed total (${inr(total)})`);

    if (!supplierId && newSupplierName.trim()) {
      await upsertSupplier.mutateAsync({ name: newSupplierName.trim() });
    }

    await createPurchase.mutateAsync({
      supplier_id: supplierId || null,
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
      paid_amount: safePaidAmount,
      payment_mode: paymentMode,
      payment_status: safePaidAmount >= total ? 'paid' : safePaidAmount > 0 ? 'partial' : 'unpaid',
    });
    toast.success('Purchase recorded');
    setOpen(false);
    resetForm();
  };

  // ── Pay Remaining dialog ─────────────────────────────────────────
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payMode, setPayMode] = useState('cash');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paying, setPaying] = useState(false);

  const openPayRemaining = (bill: any) => {
    const due = parseFloat((Number(bill.total) - Number(bill.paid_amount)).toFixed(2));
    setPayTarget(bill);
    setPayAmount(due);
    setPayMode(bill.payment_mode || 'cash');
  };

  const submitPayRemaining = async () => {
    if (!payTarget) return;
    const due = parseFloat((Number(payTarget.total) - Number(payTarget.paid_amount)).toFixed(2));
    const capped = parseFloat(Math.min(payAmount, due).toFixed(2));
    if (capped <= 0) return toast.error('Enter a valid amount');
    setPaying(true);
    try {
      // Create a new payment row — same bill details, only paid_amount = this payment
      await createPurchase.mutateAsync({
        supplier_id: payTarget.supplier_id || null,
        bill_number: payTarget.bill_number || null,
        bill_date: payTarget.bill_date,
        items: payTarget.items ?? [],
        subtotal: payTarget.subtotal ?? 0,
        tax: payTarget.tax ?? 0,
        total: Number(payTarget.total),
        paid_amount: capped,
        payment_mode: payMode,
        payment_status: capped >= due ? 'paid' : 'partial',
      });
      toast.success(`Payment of ${inr(capped)} recorded`);
      setPayTarget(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to record payment');
    }
    setPaying(false);
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

          {/* ── New Purchase dialog ── */}
          <Dialog open={open} onOpenChange={handleOpenChange}>
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
                      {/* ✅ Fix #1 — max = today, defaults to today */}
                      <label className="text-xs text-muted-foreground">Bill date</label>
                      <Input
                        type="date"
                        value={billDate}
                        max={todayISO()}
                        onChange={(e) => setBillDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Line items */}
                <div className="border rounded">
                  <div className="grid grid-cols-12 gap-2 px-2 py-2 text-xs text-muted-foreground bg-muted/40">
                    <div className="col-span-5">Item</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Rate</div>
                    <div className="col-span-2">GST %</div>
                    <div className="col-span-1" />
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
                      <div className="col-span-2">
                        <Input type="number" min={1} value={l.quantity}
                          onChange={(e) => updateLine(i, { quantity: Number(e.target.value || 0) })} />
                      </div>
                      <div className="col-span-2">
                        <MoneyInput value={l.rate} onChange={(v) => updateLine(i, { rate: v })} />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" value={l.gst}
                          onChange={(e) => updateLine(i, { gst: Number(e.target.value || 0) })} />
                      </div>
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

                {/* Payment + totals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground">Payment mode</label>
                    <PaymentModePicker value={paymentMode} onChange={setPaymentMode} />
                  </div>
                  <div>
                    {/* ✅ Fix #2 — paid amount capped + helper row */}
                    <label className="text-xs text-muted-foreground">
                      Paid amount
                      {total > 0 && (
                        <button
                          type="button"
                          className="ml-2 text-primary underline text-[11px]"
                          onClick={() => setPaidAmount(total)}
                        >
                          Pay full
                        </button>
                      )}
                    </label>
                    <MoneyInput
                      value={paidAmount}
                      onChange={handlePaidAmountChange}
                      placeholder="0.00"
                    />
                    {total > 0 && paidAmount > 0 && paidAmount < total && (
                      <p className="text-[11px] text-amber-600 mt-1">
                        Remaining: {inr(remaining)} — will be saved as partial
                      </p>
                    )}
                    {total > 0 && paidAmount > total && (
                      <p className="text-[11px] text-destructive mt-1">
                        Cannot exceed total {inr(total)}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm space-y-0.5">
                    <div>Subtotal: <b>{inr(subtotal)}</b></div>
                    <div>GST: <b>{inr(tax)}</b></div>
                    <div className="text-base">Total: <b>{inr(total)}</b></div>
                    {safePaidAmount > 0 && safePaidAmount < total && (
                      <div className="text-amber-600 text-xs">Due: <b>{inr(remaining)}</b></div>
                    )}
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

      {/* ── Purchases table ── */}
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
                  <th className="text-right p-3">Bill Total</th>
                  <th className="text-right p-3">This Payment</th>
                  <th className="text-right p-3">Due</th>
                  <th className="text-left p-3">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Build a map: groupKey → { total, totalPaid }
                  // groupKey = bill_number + '|' + supplier_id (both may be null)
                  const groupKey = (p: any) =>
                    `${p.bill_number ?? '__null__'}|${p.supplier_id ?? '__null__'}`;

                  const groupTotals: Record<string, { total: number; totalPaid: number; lastId: string }> = {};
                  purchases.forEach((p: any) => {
                    const k = groupKey(p);
                    if (!groupTotals[k]) {
                      groupTotals[k] = { total: Number(p.total), totalPaid: 0, lastId: p.id };
                    }
                    groupTotals[k].totalPaid = parseFloat(
                      (groupTotals[k].totalPaid + Number(p.paid_amount)).toFixed(2)
                    );
                    groupTotals[k].lastId = p.id; // last row wins (list is desc by date)
                  });

                  return purchases.map((p: any) => {
                    const k = groupKey(p);
                    const { total: groupTotal, totalPaid, lastId } = groupTotals[k];
                    const groupDue = parseFloat(Math.max(0, groupTotal - totalPaid).toFixed(2));
                    const isLastInGroup = p.id === lastId;

                    // "Pay Remaining" button only on last row of group when still due
                    const showPayBtn = isLastInGroup && groupDue > 0;

                    // For Pay Remaining dialog, pass group-level due
                    const payRemainingTarget = { ...p, paid_amount: parseFloat((groupTotal - groupDue).toFixed(2)) };

                    return (
                      <tr key={p.id} className="border-t">
                        <td className="p-3">{format(new Date(p.bill_date), 'dd MMM yyyy')}</td>
                        <td className="p-3">{p.bill_number || '—'}</td>
                        <td className="p-3">{p.suppliers?.name || '—'}</td>
                        <td className="p-3 text-right">{inr(p.total)}</td>
                        <td className="p-3 text-right">{inr(p.paid_amount)}</td>
                        <td className="p-3 text-right">
                          {isLastInGroup && groupDue > 0
                            ? <span className="text-amber-600 font-medium">{inr(groupDue)}</span>
                            : <span className="text-emerald-600 opacity-50">—</span>}
                        </td>
                        <td className="p-3">
                          <Badge variant={
                            p.payment_status === 'paid' ? 'default'
                            : p.payment_status === 'partial' ? 'secondary'
                            : 'destructive'
                          }>
                            {p.payment_status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {showPayBtn && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs whitespace-nowrap"
                              onClick={() => openPayRemaining(payRemainingTarget)}
                            >
                              <IndianRupee className="h-3 w-3 mr-1" /> Pay Remaining
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
                {!purchases.length && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={8}>
                      No purchases yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Pay Remaining dialog ── */}
      <Dialog open={!!payTarget} onOpenChange={(v) => { if (!v) setPayTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Remaining — {payTarget?.bill_number || 'Bill'}</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4 py-1">
              {/* Bill summary */}
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bill total</span>
                  <span className="font-medium">{inr(payTarget.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already paid</span>
                  <span className="font-medium">{inr(payTarget.paid_amount)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-semibold">Remaining due</span>
                  <span className="font-bold text-amber-600">
                    {inr(Number(payTarget.total) - Number(payTarget.paid_amount))}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Amount paying now</label>
                <MoneyInput
                  value={payAmount}
                  onChange={(v) => {
                    const due = parseFloat((Number(payTarget.total) - Number(payTarget.paid_amount)).toFixed(2));
                    setPayAmount(parseFloat(Math.min(v, due).toFixed(2)));
                    if (v > due) toast.error(`Max payable is ${inr(due)}`);
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Max: {inr(parseFloat((Number(payTarget.total) - Number(payTarget.paid_amount)).toFixed(2)))}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Payment mode</label>
                <PaymentModePicker value={payMode} onChange={setPayMode} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button onClick={submitPayRemaining} disabled={paying || payAmount <= 0}>
              {paying ? 'Saving…' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Purchases;
