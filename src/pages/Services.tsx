import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Clock, IndianRupee } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useServices, useIsHealthcareStore } from '@/hooks/useServiceIndustry';

const empty = {
  id: undefined as string | undefined,
  name: '',
  category: '',
  description: '',
  duration_min: 30,
  price: 0,
  deposit_pct: 0,
  gst_pct: 0,
  home_visit_addon: 0,
  teleconsult_enabled: false,
  is_active: true,
};

export default function Services() {
  const isHealth = useIsHealthcareStore();
  const { services, loading, save, remove } = useServices();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const edit = (s: any) => { setForm({ ...empty, ...s }); setOpen(true); };
  const submit = async () => { await save(form); setOpen(false); setForm(empty); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        subtitle={isHealth ? 'Consultations, procedures and tests you offer' : 'Treatments and services you offer'}
        actions={<Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add service</Button>}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : services.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No services yet — add your first.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s: any) => (
            <Card key={s.id} className="p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  {s.category && <div className="text-xs text-muted-foreground">{s.category}</div>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => edit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.duration_min}m</span>
                <span className="flex items-center gap-1 font-medium"><IndianRupee className="h-3.5 w-3.5" />{s.price}</span>
              </div>
              {!s.is_active && <span className="text-xs px-2 py-0.5 rounded bg-muted inline-block">Inactive</span>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} service</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isHealth ? 'GP Consultation' : 'Haircut'} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={isHealth ? 'Consultation' : 'Hair'} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: +e.target.value })} /></div>
              <div><Label>Price ₹</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
              <div><Label>Deposit %</Label><Input type="number" value={form.deposit_pct} onChange={(e) => setForm({ ...form, deposit_pct: +e.target.value })} /></div>
              <div><Label>GST %</Label><Input type="number" value={form.gst_pct} onChange={(e) => setForm({ ...form, gst_pct: +e.target.value })} /></div>
            </div>
            <div><Label>Home-visit add-on ₹</Label><Input type="number" value={form.home_visit_addon} onChange={(e) => setForm({ ...form, home_visit_addon: +e.target.value })} /></div>
            {isHealth && (
              <div className="flex items-center justify-between"><Label>Teleconsult enabled</Label><Switch checked={form.teleconsult_enabled} onCheckedChange={(v) => setForm({ ...form, teleconsult_enabled: v })} /></div>
            )}
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          </div>
          <DialogFooter><Button onClick={submit} disabled={!form.name}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
