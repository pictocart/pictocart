import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useStoreMenu, type MenuMeta } from '@/hooks/useMenu';
import { useFulfillment } from '@/hooks/useFulfillment';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit3, Utensils, Flame, Clock, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

const DIET_COLORS = {
  veg: 'bg-green-100 text-green-800 border-green-300',
  non_veg: 'bg-red-100 text-red-800 border-red-300',
  egg: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const Menu = () => {
  const { store } = useStore();
  const { enabledModes } = useFulfillment(store?.id);
  const { data: sections, isLoading } = useStoreMenu(store?.id);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id: string; title: string; meta: MenuMeta } | null>(null);
  const [saving, setSaving] = useState(false);

  const saveMeta = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('products')
      .update({ menu_meta: editing.meta as any } as any)
      .eq('id', editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Menu item updated');
    qc.invalidateQueries({ queryKey: ['store-menu', store?.id] });
    setEditing(null);
  };

  const setMeta = (patch: Partial<MenuMeta>) =>
    setEditing((e) => (e ? { ...e, meta: { ...e.meta, ...patch } } : e));

  if (!store) return null;

  return (
    <div className="space-y-6 max-w-5xl pb-24 md:pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" /> Menu
          </h1>
          <p className="text-sm text-muted-foreground">
            Build your customer-facing menu. Items are pulled from Products; group them with Categories.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/products/new"><Button size="sm">Add item</Button></Link>
          <Link to="/categories"><Button size="sm" variant="outline">Sections</Button></Link>
        </div>
      </div>

      {enabledModes.length === 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="py-4 text-sm">
            Turn on at least one fulfillment mode in{' '}
            <Link to="/settings/fulfillment" className="underline">Fulfillment settings</Link> so customers can place menu orders.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !sections || sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No items yet. <Link to="/products/new" className="text-primary underline">Add your first dish</Link>.
          </CardContent>
        </Card>
      ) : (
        sections.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                {s.name}
                <span className="text-xs font-normal text-muted-foreground">{s.items.length} items</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {s.items.map((it) => (
                <div key={it.id} className="py-3 flex items-start gap-3">
                  {it.image_url && (
                    <img src={it.image_url} alt={it.title} className="h-14 w-14 rounded-md object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{it.title}</span>
                      {it.menu_meta.diet && (
                        <Badge variant="outline" className={DIET_COLORS[it.menu_meta.diet]}>
                          <Leaf className="h-3 w-3 mr-1" />{it.menu_meta.diet.replace('_', '-')}
                        </Badge>
                      )}
                      {!!it.menu_meta.spice_level && (
                        <span className="inline-flex items-center text-orange-600 text-xs">
                          {Array.from({ length: it.menu_meta.spice_level }).map((_, i) => (
                            <Flame key={i} className="h-3 w-3" />
                          ))}
                        </span>
                      )}
                      {!!it.menu_meta.prep_minutes && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />{it.menu_meta.prep_minutes}m
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{it.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold whitespace-nowrap">₹{it.price.toLocaleString('en-IN')}</p>
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ id: it.id, title: it.title, meta: it.menu_meta })}>
                      <Edit3 className="h-3.5 w-3.5 mr-1" />Menu info
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editing?.title}</SheetTitle></SheetHeader>
          {editing && (
            <div className="space-y-5 mt-6">
              <div>
                <Label className="text-xs">Diet</Label>
                <div className="flex gap-2 mt-1">
                  {(['veg', 'non_veg', 'egg'] as const).map((d) => (
                    <Button key={d} variant={editing.meta.diet === d ? 'default' : 'outline'} size="sm" onClick={() => setMeta({ diet: d })}>
                      {d.replace('_', '-')}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Spice level</Label>
                <div className="flex gap-2 mt-1">
                  {[0, 1, 2, 3].map((s) => (
                    <Button key={s} variant={editing.meta.spice_level === s ? 'default' : 'outline'} size="sm" onClick={() => setMeta({ spice_level: s as any })}>
                      {s === 0 ? 'None' : Array.from({ length: s }).map(() => '🌶').join('')}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Prep time (minutes)</Label>
                <Input type="number" min={0} max={120} value={editing.meta.prep_minutes ?? ''} onChange={(e) => setMeta({ prep_minutes: Number(e.target.value) || undefined })} />
              </div>
              <div>
                <Label className="text-xs">Allergens (comma separated)</Label>
                <Input value={(editing.meta.allergens || []).join(', ')} onChange={(e) => setMeta({ allergens: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="nuts, dairy, gluten" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Available for</Label>
                {(['dine_in', 'takeaway', 'delivery'] as const).map((m) => {
                  const current = editing.meta.available_modes ?? ['dine_in', 'takeaway', 'delivery'];
                  const on = current.includes(m);
                  return (
                    <div key={m} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{m.replace('_', ' ')}</span>
                      <Switch
                        checked={on}
                        onCheckedChange={(v) => {
                          const next = v ? Array.from(new Set([...current, m])) : current.filter((x) => x !== m);
                          setMeta({ available_modes: next });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <Button onClick={saveMeta} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Menu;
