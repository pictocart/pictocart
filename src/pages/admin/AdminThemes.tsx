import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ExternalLink, Trash2, Pencil, Layers, IndianRupee, ImageIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['fashion', 'food', 'electronics', 'beauty', 'health', 'sports', 'home-decor', 'general'];

interface ThemeMaster {
  id: string;
  theme_id: string;
  name: string;
  description: string | null;
  category: string | null;
  preview_image: string | null;
  lovable_project_url: string | null;
  remix_url: string | null;
  client_patch_prompt: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

const emptyTheme: Partial<ThemeMaster> = {
  theme_id: '',
  name: '',
  description: '',
  category: 'general',
  preview_image: '',
  lovable_project_url: '',
  remix_url: '',
  client_patch_prompt: '',
  is_active: true,
  is_default: false,
};

const ThemeMasterForm = ({ initial, onClose }: { initial: Partial<ThemeMaster>; onClose: () => void }) => {
  const [form, setForm] = useState<Partial<ThemeMaster>>(initial);
  const qc = useQueryClient();
  const isEdit = !!initial.id;

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        theme_id: form.theme_id?.trim(),
        name: form.name?.trim(),
        description: form.description || '',
        category: form.category || 'general',
        preview_image: form.preview_image || null,
        lovable_project_url: form.lovable_project_url || null,
        remix_url: form.remix_url || null,
        client_patch_prompt: form.client_patch_prompt || '',
        is_active: form.is_active ?? true,
        is_default: form.is_default ?? false,
      };
      if (!payload.theme_id || !payload.name) throw new Error('theme_id and name are required');
      if (isEdit) {
        const { error } = await supabase.from('theme_master_projects').update(payload).eq('id', initial.id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('theme_master_projects').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Theme updated' : 'Theme created');
      qc.invalidateQueries({ queryKey: ['admin-theme-masters'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Theme ID (slug)</Label>
          <Input value={form.theme_id || ''} onChange={(e) => setForm({ ...form, theme_id: e.target.value })} placeholder="bazaar" disabled={isEdit} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bazaar" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-16" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={form.category || 'general'} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Preview Image URL</Label>
          <Input value={form.preview_image || ''} onChange={(e) => setForm({ ...form, preview_image: e.target.value })} placeholder="https://…" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Live Preview URL (deployed master project)</Label>
        <Input value={form.lovable_project_url || ''} onChange={(e) => setForm({ ...form, lovable_project_url: e.target.value })} placeholder="https://theme-master-bazaar.lovable.app" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Remix / Source URL (admin-only)</Label>
        <Input value={form.remix_url || ''} onChange={(e) => setForm({ ...form, remix_url: e.target.value })} placeholder="https://lovable.dev/projects/…" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Client Patch Prompt (sent to provisioning worker)</Label>
        <Textarea value={form.client_patch_prompt || ''} onChange={(e) => setForm({ ...form, client_patch_prompt: e.target.value })} className="h-20 font-mono text-xs" />
      </div>
      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          Active (visible to merchants)
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={form.is_default ?? false} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
          Default for new stores
        </label>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
        {save.isPending ? 'Saving…' : isEdit ? 'Update Theme' : 'Create Theme'}
      </Button>
    </div>
  );
};

const MasterProjectsTab = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ThemeMaster | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['admin-theme-masters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('theme_master_projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as ThemeMaster[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('theme_master_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Theme deleted'); qc.invalidateQueries({ queryKey: ['admin-theme-masters'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{themes.length} master theme{themes.length === 1 ? '' : 's'}</p>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Master Theme</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Master Theme</DialogTitle></DialogHeader>
            <ThemeMasterForm initial={emptyTheme} onClose={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : themes.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No master themes yet. Add one to populate the merchant marketplace.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => (
            <Card key={t.id} className="overflow-hidden flex flex-col">
              <div className="relative aspect-[4/3] bg-muted">
                {t.preview_image ? (
                  <img src={t.preview_image} alt={t.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground"><ImageIcon className="h-10 w-10" /></div>
                )}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  {t.is_default && <Badge className="bg-blue-500 text-white border-0 text-[10px]">Default</Badge>}
                  {!t.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                </div>
              </div>
              <CardContent className="p-3 flex-1 flex flex-col gap-2">
                <div>
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                  <p className="text-[11px] text-muted-foreground capitalize">{t.category} · {t.theme_id}</p>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                <div className="mt-auto flex gap-1.5 pt-2">
                  {t.lovable_project_url && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(t.lovable_project_url!, '_blank')}>
                      <ExternalLink className="mr-1 h-3 w-3" /> Preview
                    </Button>
                  )}
                  <Dialog open={editing?.id === t.id} onOpenChange={(o) => !o && setEditing(null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Edit {t.name}</DialogTitle></DialogHeader>
                      {editing && <ThemeMasterForm initial={editing} onClose={() => setEditing(null)} />}
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete "${t.name}"?`)) remove.mutate(t.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const CostMatrixTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-theme-cost-matrix'],
    queryFn: async () => {
      const [{ data: themes }, { data: stores }, { data: provReqs }] = await Promise.all([
        supabase.from('theme_master_projects').select('id, theme_id, name, category'),
        supabase.from('stores').select('id, theme'),
        supabase.from('provision_requests').select('theme_master_id, status'),
      ]);
      const installs = new Map<string, number>();
      (stores || []).forEach((s: any) => {
        const tid = s.theme?.theme_id || s.theme?.name;
        if (tid) installs.set(tid, (installs.get(tid) || 0) + 1);
      });
      const provisions = new Map<string, number>();
      (provReqs || []).forEach((p: any) => {
        if (p.theme_master_id) provisions.set(p.theme_master_id, (provisions.get(p.theme_master_id) || 0) + 1);
      });
      return (themes || []).map((t: any) => ({
        ...t,
        installs: installs.get(t.theme_id) || 0,
        provisions: provisions.get(t.id) || 0,
        // Placeholder until token-level cost is wired via Lovable AI Gateway
        ai_cost_inr: 0,
        revenue_inr: 0,
      }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Cost & Revenue Matrix</CardTitle>
        <p className="text-xs text-muted-foreground">Per-theme installs, provisioning runs, AI cost vs. revenue. Token-level AI cost wires up in Phase 6.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Theme</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Installs</TableHead>
                <TableHead className="text-right">Provisions</TableHead>
                <TableHead className="text-right">AI Cost (₹)</TableHead>
                <TableHead className="text-right">Revenue (₹)</TableHead>
                <TableHead className="text-right">P&amp;L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((row: any) => {
                const pnl = row.revenue_inr - row.ai_cost_inr;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{row.category || '—'}</TableCell>
                    <TableCell className="text-right">{row.installs}</TableCell>
                    <TableCell className="text-right">{row.provisions}</TableCell>
                    <TableCell className="text-right">{row.ai_cost_inr.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.revenue_inr.toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{pnl.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              {(!data || data.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No themes yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

const ImagePoolTab = () => {
  const { data: images = [], isLoading } = useQuery({
    queryKey: ['admin-image-pool'],
    queryFn: async () => {
      const { data, error } = await supabase.from('theme_image_pool').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const grouped = images.reduce<Record<string, any[]>>((acc, img) => {
    const k = `${img.category}/${img.section_type}`;
    (acc[k] ||= []).push(img);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Reusable Image Pool</CardTitle>
        <p className="text-xs text-muted-foreground">{images.length} images cached for theme generation reuse (saves AI cost).</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p> : Object.entries(grouped).map(([key, imgs]) => (
          <div key={key} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">{key} <span className="text-foreground">({imgs.length})</span></h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
              {imgs.map((img) => (
                <a key={img.id} href={img.image_url} target="_blank" rel="noreferrer" className="block aspect-square rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition">
                  <img src={img.image_url} alt={img.section_type} className="h-full w-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        ))}
        {!isLoading && images.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">Image pool is empty.</p>}
      </CardContent>
    </Card>
  );
};

const AdminThemes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Theme Marketplace
        </h1>
        <p className="text-sm text-muted-foreground">Manage master theme projects, track economics, and reuse generated assets.</p>
      </div>

      <Tabs defaultValue="masters">
        <TabsList>
          <TabsTrigger value="masters"><Layers className="mr-1 h-4 w-4" /> Master Projects</TabsTrigger>
          <TabsTrigger value="cost"><IndianRupee className="mr-1 h-4 w-4" /> Cost Matrix</TabsTrigger>
          <TabsTrigger value="images"><ImageIcon className="mr-1 h-4 w-4" /> Image Pool</TabsTrigger>
        </TabsList>
        <TabsContent value="masters" className="mt-4"><MasterProjectsTab /></TabsContent>
        <TabsContent value="cost" className="mt-4"><CostMatrixTab /></TabsContent>
        <TabsContent value="images" className="mt-4"><ImagePoolTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminThemes;
