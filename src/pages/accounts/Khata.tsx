import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useKhataEntries, useCreateKhataEntry } from '@/hooks/useAccounts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import {
  inr, MoneyInput, PaymentModePicker, todayISO,
} from '@/components/accounts/AccountsPrimitives';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Khata = () => {
  const { store } = useStore();
  const { data: entries = [] } = useKhataEntries();
  const create = useCreateKhataEntry();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    customer_id: '', customer_name: '', customer_phone: '',
    entry_type: 'credit', amount: 0, entry_date: todayISO(), payment_mode: 'cash', notes: '',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['accounts', 'customers-with-balance', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const { data } = await supabase.from('customers')
        .select('id, name, phone, balance').eq('store_id', store!.id).order('name');
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const recv = customers.reduce((s: number, c: any) => s + Math.max(Number(c.balance || 0), 0), 0);
    return { recv };
  }, [customers]);

  const save = async () => {
    if (!form.customer_id && !form.customer_name) return toast.error('Pick or name a customer');
    if (!form.amount || form.amount <= 0) return toast.error('Enter amount');
    await create.mutateAsync({
      ...form,
      customer_id: form.customer_id || null,
    });
    toast.success('Khata entry saved');
    setOpen(false);
    setForm({ customer_id: '', customer_name: '', customer_phone: '', entry_type: 'credit', amount: 0, entry_date: todayISO(), payment_mode: 'cash', notes: '' });
  };

  const sendReminder = (c: any) => {
    if (!c.phone) { toast.error('No phone on file'); return; }
    const msg = encodeURIComponent(`Namaste ${c.name}, your pending balance with ${store?.name} is ${inr(c.balance)}. Please clear at your convenience. Thank you.`);
    window.open(`https://wa.me/${c.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Customer Khata</h1>
          <p className="text-sm text-muted-foreground">Total receivables: <b>{inr(totals.recv)}</b></p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Khata Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Existing customer (optional)</label>
                <Select value={form.customer_id} onValueChange={(v) => {
                  const c = customers.find((cc: any) => cc.id === v);
                  setForm({ ...form, customer_id: v, customer_name: c?.name || '', customer_phone: c?.phone || '' });
                }}>
                  <SelectTrigger><SelectValue placeholder="Walk-in or pick" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                <Input placeholder="Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <Select value={form.entry_type} onValueChange={(v) => setForm({ ...form, entry_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit given (sale)</SelectItem>
                      <SelectItem value="payment">Payment received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Date</label>
                  <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Mode</label>
                  <PaymentModePicker value={form.payment_mode} onChange={(v) => setForm({ ...form, payment_mode: v })} />
                </div>
              </div>
              <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Customers owing</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-right p-3">Balance</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {customers.filter((c: any) => Number(c.balance) > 0).map((c: any) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3">{c.phone || '—'}</td>
                    <td className="p-3 text-right font-semibold">{inr(c.balance)}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => sendReminder(c)}>
                        <MessageCircle className="h-4 w-4 mr-1" /> Remind
                      </Button>
                    </td>
                  </tr>
                ))}
                {!customers.some((c: any) => Number(c.balance) > 0) && (
                  <tr><td className="p-6 text-center text-muted-foreground" colSpan={4}>No outstanding khata.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent entries</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e: any) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3">{format(new Date(e.entry_date), 'dd MMM')}</td>
                    <td className="p-3">{e.customer_name || e.customers?.name || '—'}</td>
                    <td className="p-3">
                      <Badge variant={e.entry_type === 'credit' ? 'destructive' : 'default'}>
                        {e.entry_type === 'credit' ? 'Credit' : 'Payment'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{inr(e.amount)}</td>
                    <td className="p-3 text-muted-foreground">{e.notes}</td>
                  </tr>
                ))}
                {!entries.length && (
                  <tr><td className="p-6 text-center text-muted-foreground" colSpan={5}>No entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Khata;
