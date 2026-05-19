import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useExpenses, useExpenseCategories, useUpsertExpense, useDeleteExpense } from '@/hooks/useAccounts';
import {
  inr, MoneyInput, PaymentModePicker, ExportCsvButton, todayISO, daysAgoISO, DateRangePicker,
} from '@/components/accounts/AccountsPrimitives';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Expenses = () => {
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const { data: expenses = [] } = useExpenses({ from, to });
  const { data: cats = [] } = useExpenseCategories();
  const upsert = useUpsertExpense();
  const del = useDeleteExpense();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    category: '', amount: 0, expense_date: todayISO(), payment_mode: 'cash', notes: '',
  });

  const total = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const save = async () => {
    if (!form.category) return toast.error('Pick a category');
    if (!form.amount || form.amount <= 0) return toast.error('Enter amount');
    await upsert.mutateAsync(form);
    toast.success('Expense saved');
    setOpen(false);
    setForm({ category: '', amount: 0, expense_date: todayISO(), payment_mode: 'cash', notes: '' });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Total in range: <b>{inr(total)}</b></p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <DateRangePicker from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <ExportCsvButton filename="expenses.csv" rows={expenses.map((e: any) => ({
            date: e.expense_date, category: e.category, amount: e.amount, mode: e.payment_mode, notes: e.notes,
          }))} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Expense</Button></SheetTrigger>
            <SheetContent className="space-y-3 overflow-y-auto">
              <SheetHeader><SheetTitle>Add Expense</SheetTitle></SheetHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                    <SelectContent>
                      {cats.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Date</label>
                    <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Mode</label>
                    <PaymentModePicker value={form.payment_mode} onChange={(v) => setForm({ ...form, payment_mode: v })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <SheetFooter><Button onClick={save} disabled={upsert.isPending} className="w-full">Save</Button></SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent expenses</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Mode</th>
                  <th className="text-left p-3">Notes</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e: any) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3">{format(new Date(e.expense_date), 'dd MMM')}</td>
                    <td className="p-3">{e.category}</td>
                    <td className="p-3 capitalize">{e.payment_mode}</td>
                    <td className="p-3 text-muted-foreground">{e.notes}</td>
                    <td className="p-3 text-right">{inr(e.amount)}</td>
                    <td className="p-3">
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!expenses.length && (
                  <tr><td className="p-6 text-center text-muted-foreground" colSpan={6}>No expenses recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;
