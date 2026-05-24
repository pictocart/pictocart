import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, UserRound } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useProviders, useIsHealthcareStore } from '@/hooks/useServiceIndustry';

const empty = {
  id: undefined as string | undefined,
  name: '',
  role_label: '',
  specialization: [] as string[],
  experience_years: 0,
  bio: '',
  registration_number: '',
  commission_pct: 0,
  accepts_home_visit: false,
  accepts_teleconsult: false,
  max_families_cap: 0,
  is_active: true,
};

export default function Providers() {
  const isHealth = useIsHealthcareStore();
  const { providers, loading, save, remove } = useProviders();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [specInput, setSpecInput] = useState('');

  const edit = (p: any) => {
    setForm({ ...empty, ...p, specialization: p.specialization ?? [] });
    setSpecInput((p.specialization ?? []).join(', '));
    setOpen(true);
  };

  const submit = async () => {
    await save({
      ...form,
      specialization: specInput.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setOpen(false);
    setForm(empty);
    setSpecInput('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isHealth ? 'Doctors & Staff' : 'Stylists & Staff'}
        description={isHealth ? 'Add the doctors who consult at your clinic' : 'Add the stylists who work at your salon'}
        actions={<Button onClick={() => { setForm(empty); setSpecInput(''); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add</Button>}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : providers.length === 0 ? (
        <Card className="p-10 text-center">
          <UserRound className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No {isHealth ? 'doctors' : 'stylists'} yet.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p: any) => (
            <Card key={p.id} className="p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.role_label || (isHealth ? 'Doctor' : 'Stylist')}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => edit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              {(p.specialization ?? []).length > 0 && (
                <div className="text-xs text-muted-foreground">{p.specialization.join(' · ')}</div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {p.accepts_home_visit && <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700">Home visit</span>}
                {p.accepts_teleconsult && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-700">Teleconsult</span>}
                {p.max_families_cap > 0 && <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700">Family: up to {p.max_families_cap}</span>}
                {!p.is_active && <span className="px-2 py-0.5 rounded bg-muted">Inactive</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} {isHealth ? 'doctor' : 'stylist'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Role</Label><Input placeholder={isHealth ? 'e.g. General Physician' : 'e.g. Senior Stylist'} value={form.role_label} onChange={(e) => setForm({ ...form, role_label: e.target.value })} /></div>
            <div><Label>Specialization (comma-separated)</Label><Input value={specInput} onChange={(e) => setSpecInput(e.target.value)} placeholder={isHealth ? 'Pediatrics, Diabetes' : 'Hair color, Bridal'} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Experience (yrs)</Label><Input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: +e.target.value })} /></div>
              <div><Label>Commission %</Label><Input type="number" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: +e.target.value })} /></div>
            </div>
            {isHealth && (
              <div><Label>Registration No.</Label><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} /></div>
            )}
            <div><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
            <div className="flex items-center justify-between"><Label>Accepts home visit</Label><Switch checked={form.accepts_home_visit} onCheckedChange={(v) => setForm({ ...form, accepts_home_visit: v })} /></div>
            {isHealth && (
              <div className="flex items-center justify-between"><Label>Accepts teleconsult</Label><Switch checked={form.accepts_teleconsult} onCheckedChange={(v) => setForm({ ...form, accepts_teleconsult: v })} /></div>
            )}
            <div>
              <Label>Family {isHealth ? 'patients' : 'clients'} cap</Label>
              <Input type="number" placeholder="e.g. 50 families" value={form.max_families_cap} onChange={(e) => setForm({ ...form, max_families_cap: +e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">How many families this {isHealth ? 'doctor' : 'stylist'} can take on. Customers see slots-left badge.</p>
            </div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          </div>
          <DialogFooter><Button onClick={submit} disabled={!form.name}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
