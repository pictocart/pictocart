import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, IndianRupee } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  useSuppliers, useUpsertSupplier, useDeleteSupplier, usePurchases, useSettleSupplier,
} from '@/hooks/useAccounts';
import { inr, MoneyInput, PaymentModePicker } from '@/components/accounts/AccountsPrimitives';
import { toast } from 'sonner';

const Suppliers = () => {
  const { data: suppliers = [] } = useSuppliers();
  const { data: purchases = [] } = usePurchases();
  const upsert = useUpsertSupplier();
  const del = useDeleteSupplier();
  const settle = useSettleSupplier();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: '', phone: '', email: '', gstin: '', opening_balance: 0 });

  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [pay, setPay] = useState<{ amount: number; mode: string; note: string }>({ amount: 0, mode: 'cash', note: '' });

  // Balance per supplier = opening_balance + Σ(bill.total) − Σ(bill.paid_amount)
  const balances = useMemo(() => {
    const map: Record<string, { billed: number; paid: number }> = {};
    purchases.forEach((b: any) => {
      const sid = b.supplier_id;
      if (!sid) return;
      if (!map[sid]) map[sid] = { billed: 0, paid: 0 };
      map[sid].billed += Number(b.total) || 0;
      map[sid].paid += Number(b.paid_amount) || 0;
    });
    return map;
  }, [purchases]);

  const totalPayable = useMemo(() => suppliers.reduce((s: number, sup: any) => {
    const b = balances[sup.id] || { billed: 0, paid: 0 };
    return s + Math.max(Number(sup.opening_balance || 0) + b.billed - b.paid, 0);
  }, 0), [suppliers, balances]);

  const startNew = () => { setForm({ name: '', phone: '', email: '', gstin: '', opening_balance: 0 }); setOpen(true); };
  const startEdit = (s: any) => { setForm(s); setOpen(true); };
  const startPay = (s: any, due: number) => {
    setPayTarget(s); setPay({ amount: due, mode: 'cash', note: '' }); setPayOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) return toast.error('Name is required');

    // Phone — must be exactly 10 digits if provided
    if (form.phone?.trim()) {
      if (!/^\d{10}$/.test(form.phone.trim())) {
        return toast.error('Phone must be a valid 10-digit number');
      }
    }

    // Email — basic format check if provided
    if (form.email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return toast.error('Enter a valid email address');
      }
    }

    // GSTIN — 15 characters, format: 2 digits + 10 alphanumeric + 1 digit + Z + alphanumeric
    if (form.gstin?.trim()) {
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin.trim().toUpperCase())) {
        return toast.error('Enter a valid 15-character GSTIN (e.g. 27AAPFU0939F1ZV)');
      }
    }

    await upsert.mutateAsync({ ...form, gstin: form.gstin?.trim().toUpperCase() || '' });
    toast.success('Supplier saved');
    setOpen(false);
  };

  const doSettle = async () => {
    if (!pay.amount || pay.amount <= 0) return toast.error('Enter amount');
    try {
      await settle.mutateAsync({ supplier_id: payTarget.id, amount: pay.amount, payment_mode: pay.mode, note: pay.note });
      toast.success(`Paid ${inr(pay.amount)} to ${payTarget.name}`);
      setPayOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Total payable: <b>{inr(totalPayable)}</b></p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Add Supplier</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All suppliers</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-left p-3">GSTIN</th>
                  <th className="text-right p-3">Due</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s: any) => {
                  const b = balances[s.id] || { billed: 0, paid: 0 };
                  const due = Math.max(Number(s.opening_balance || 0) + b.billed - b.paid, 0);
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3">{s.phone || '—'}</td>
                      <td className="p-3">{s.gstin || '—'}</td>
                      <td className="p-3 text-right">
                        {due > 0
                          ? <Badge variant="destructive">{inr(due)}</Badge>
                          : <span className="text-emerald-700 font-medium">Settled</span>}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="outline" disabled={due <= 0} onClick={() => startPay(s, due)}>
                          <IndianRupee className="h-3.5 w-3.5 mr-1" /> Pay
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
                {!suppliers.length && (
                  <tr><td className="p-6 text-center text-muted-foreground" colSpan={5}>No suppliers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit / new supplier */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? 'Edit Supplier' : 'New Supplier'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="Phone (10 digits)"
              maxLength={10}
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              placeholder="GSTIN (e.g. 27AAPFU0939F1ZV)"
              maxLength={15}
              value={form.gstin || ''}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
            />
            <div>
              <label className="text-xs text-muted-foreground">Opening balance (we owe)</label>
              <MoneyInput value={form.opening_balance || 0} onChange={(v) => setForm({ ...form, opening_balance: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle dues */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle dues — {payTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <MoneyInput value={pay.amount} onChange={(v) => setPay({ ...pay, amount: v })} />
              <p className="text-[11px] text-muted-foreground mt-1">Applied to oldest unpaid bills first.</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Paid via</label>
              <PaymentModePicker value={pay.mode} onChange={(v) => setPay({ ...pay, mode: v })} />
            </div>
            <Input placeholder="Note (optional)" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={doSettle} disabled={settle.isPending}>Confirm payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;
