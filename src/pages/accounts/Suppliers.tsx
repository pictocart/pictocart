import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { useSuppliers, useUpsertSupplier, useDeleteSupplier } from '@/hooks/useAccounts';
import { inr, MoneyInput } from '@/components/accounts/AccountsPrimitives';
import { toast } from 'sonner';

const Suppliers = () => {
  const { data: suppliers = [] } = useSuppliers();
  const upsert = useUpsertSupplier();
  const del = useDeleteSupplier();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: '', phone: '', email: '', gstin: '', opening_balance: 0 });

  const startNew = () => { setForm({ name: '', phone: '', email: '', gstin: '', opening_balance: 0 }); setOpen(true); };
  const startEdit = (s: any) => { setForm(s); setOpen(true); };

  const save = async () => {
    if (!form.name) return toast.error('Name required');
    await upsert.mutateAsync(form);
    toast.success('Supplier saved');
    setOpen(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Your vendor master.</p>
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
                  <th className="text-right p-3">Opening Bal.</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s: any) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3">{s.phone || '—'}</td>
                    <td className="p-3">{s.gstin || '—'}</td>
                    <td className="p-3 text-right">{inr(s.opening_balance)}</td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
                {!suppliers.length && (
                  <tr><td className="p-6 text-center text-muted-foreground" colSpan={5}>No suppliers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? 'Edit Supplier' : 'New Supplier'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="GSTIN" value={form.gstin || ''} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
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
    </div>
  );
};

export default Suppliers;
