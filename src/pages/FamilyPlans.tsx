import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Progress } from '@/components/ui/progress';
import { useFamilyPlans, useIsHealthcareStore } from '@/hooks/useServiceIndustry';

const empty = {
  id: undefined as string | undefined,
  name: '',
  description: '',
  monthly_fee: 0,
  yearly_fee: 0,
  max_families: 50,
  max_members_per_family: 6,
  discount_pct: 10,
  free_visits_per_year: 0,
  home_visit_included: false,
  is_active: true,
};

export default function FamilyPlans() {
  const isHealth = useIsHealthcareStore();
  const { plans, groups, loading, savePlan, deletePlan } = useFamilyPlans();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const edit = (p: any) => { setForm({ ...empty, ...p }); setOpen(true); };
  const submit = async () => { await savePlan(form); setOpen(false); setForm(empty); };

  const enrolled = (planId: string) => groups.filter((g: any) => g.plan_id === planId && g.status === 'active').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isHealth ? 'Family Doctor Plans' : 'Family Stylist Plans'}
        subtitle={isHealth
          ? 'Recurring family healthcare plans with a cap on how many families you serve'
          : 'Recurring family salon plans with a cap on how many families you serve'}
        actions={<Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New plan</Button>}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : plans.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No family plans yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p: any) => {
            const used = enrolled(p.id);
            const pct = p.max_families ? Math.min(100, (used / p.max_families) * 100) : 0;
            const slotsLeft = Math.max(0, p.max_families - used);
            return (
              <Card key={p.id} className="p-5 space-y-3">
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    {p.description && <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => edit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deletePlan(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">₹{p.yearly_fee || p.monthly_fee}</span>
                  <span className="text-xs text-muted-foreground">/{p.yearly_fee ? 'year' : 'month'}</span>
                </div>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>· Up to {p.max_members_per_family} members per family</li>
                  {p.discount_pct > 0 && <li>· {p.discount_pct}% off every visit</li>}
                  {p.free_visits_per_year > 0 && <li>· {p.free_visits_per_year} free visits / year</li>}
                  {p.home_visit_included && <li>· Home visits included</li>}
                </ul>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Families enrolled</span>
                    <span className="font-medium">{used} / {p.max_families}</span>
                  </div>
                  <Progress value={pct} />
                  {slotsLeft === 0 && p.max_families > 0 && (
                    <p className="text-xs text-amber-700 mt-1">Cap reached — new signups go to waitlist.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {groups.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Enrolled families ({groups.length})</h2>
          <div className="space-y-2">
            {groups.map((g: any) => (
              <Card key={g.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{g.family_name}</div>
                  <div className="text-xs text-muted-foreground">{(g.family_members ?? []).length} members · {g.status}</div>
                </div>
                <div className="text-xs text-muted-foreground">Valid till {g.valid_until ?? '—'}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'New'} family plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Plan name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isHealth ? 'Family Doctor — Annual' : 'Family Salon — Annual'} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Monthly fee ₹</Label><Input type="number" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: +e.target.value })} /></div>
              <div><Label>Yearly fee ₹</Label><Input type="number" value={form.yearly_fee} onChange={(e) => setForm({ ...form, yearly_fee: +e.target.value })} /></div>
              <div>
                <Label>How many families</Label>
                <Input type="number" value={form.max_families} onChange={(e) => setForm({ ...form, max_families: +e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Cap on signups.</p>
              </div>
              <div><Label>Members / family</Label><Input type="number" value={form.max_members_per_family} onChange={(e) => setForm({ ...form, max_members_per_family: +e.target.value })} /></div>
              <div><Label>Discount %</Label><Input type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: +e.target.value })} /></div>
              <div><Label>Free visits / yr</Label><Input type="number" value={form.free_visits_per_year} onChange={(e) => setForm({ ...form, free_visits_per_year: +e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Home visits included</Label><Switch checked={form.home_visit_included} onCheckedChange={(v) => setForm({ ...form, home_visit_included: v })} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          </div>
          <DialogFooter><Button onClick={submit} disabled={!form.name}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
