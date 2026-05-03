import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Copy, ExternalLink, Plus, Rocket, ListTree } from 'lucide-react';
import { toast } from 'sonner';

interface ThemeMaster {
  id: string;
  theme_id: string;
  name: string;
  remix_url: string | null;
  client_patch_prompt: string;
  is_active: boolean;
  category: string | null;
  is_default: boolean;
}

interface ProvisionRequest {
  id: string;
  store_id: string;
  theme_master_id: string | null;
  status: string;
  client_patch_payload: Record<string, unknown>;
  rendered_patch_prompt: string | null;
  new_project_url: string | null;
  new_project_subdomain: string | null;
  notes: string | null;
  queued_at: string;
  attempts?: number;
  error?: string | null;
  completed_at?: string | null;
}

interface JobLog {
  id: string;
  request_id: string;
  step: string;
  status: string;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const STATUSES = ['queued', 'remixing', 'patching', 'domain_pending', 'live', 'failed'];

const AdminProvisioning = () => {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [logsId, setLogsId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const themesQuery = useQuery({
    queryKey: ['theme-masters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('theme_master_projects').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as ThemeMaster[];
    },
  });

  const requestsQuery = useQuery({
    queryKey: ['provision-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provision_requests').select('*').order('queued_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProvisionRequest[];
    },
    refetchInterval: 10_000,
  });

  const storesQuery = useQuery({
    queryKey: ['admin-stores-light'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('id, name, slug, custom_domain, logo_url, category');
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from('provision_requests').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provision-requests'] }),
  });

  const open = openId ? requestsQuery.data?.find((r) => r.id === openId) ?? null : null;
  const openTheme = open ? themesQuery.data?.find((t) => t.id === open.theme_master_id) ?? null : null;
  const openStore = open ? storesQuery.data?.find((s) => s.id === open.store_id) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6" /> Storefront Provisioning
          </h1>
          <p className="text-sm text-muted-foreground">
            Queue of customer storefronts. Background runner advances jobs every minute.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New request
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-2">Store</th>
              <th className="px-4 py-2">Theme</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Attempts</th>
              <th className="px-4 py-2">Queued</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requestsQuery.data?.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                No provisioning requests yet.
              </td></tr>
            )}
            {requestsQuery.data?.map((r) => {
              const store = storesQuery.data?.find((s) => s.id === r.store_id);
              const theme = themesQuery.data?.find((t) => t.id === r.theme_master_id);
              return (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setOpenId(r.id)}>
                    <div className="font-medium">{store?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{store?.custom_domain ?? store?.slug}</div>
                  </td>
                  <td className="px-4 py-3">{theme?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === 'live' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'}>
                      {r.status}
                    </Badge>
                    {r.error && <div className="text-xs text-destructive mt-1 max-w-[200px] truncate">{r.error}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.attempts ?? 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.queued_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setLogsId(r.id)} className="gap-1">
                      <ListTree className="h-3 w-3" /> Logs
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(r.id)}>Open</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Theme Master Projects</h2>
          <ThemeMasterCreate onCreated={() => qc.invalidateQueries({ queryKey: ['theme-masters'] })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {themesQuery.data?.map((t) => (
            <ThemeMasterRow key={t.id} master={t} onChange={() => qc.invalidateQueries({ queryKey: ['theme-masters'] })} />
          ))}
          {themesQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No theme masters yet.</p>
          )}
        </div>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{openStore?.name ?? 'Provision Request'}</SheetTitle></SheetHeader>
          {open && (
            <div className="space-y-5 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Slug:</span> {openStore?.slug}</div>
                <div><span className="text-muted-foreground">Domain:</span> {openStore?.custom_domain ?? '—'}</div>
                <div><span className="text-muted-foreground">Theme:</span> {openTheme?.name ?? '—'}</div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Select value={open.status} onValueChange={(v) => updateStatus.mutate({ id: open.id, patch: { status: v } })}>
                    <SelectTrigger className="h-7 w-[160px] inline-flex"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Client Patch Prompt (rendered)</Label>
                <Textarea value={open.rendered_patch_prompt ?? '(will be rendered by runner)'} rows={12} readOnly className="font-mono text-xs" />
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => {
                    navigator.clipboard.writeText(open.rendered_patch_prompt ?? '');
                    toast.success('Prompt copied');
                  }} className="gap-2">
                    <Copy className="h-4 w-4" /> Copy Prompt
                  </Button>
                  {openTheme?.remix_url && (
                    <a href={openTheme.remix_url} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" /> Open Remix
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>New Project URL</Label>
                <Input
                  defaultValue={open.new_project_url ?? ''}
                  onBlur={(e) => updateStatus.mutate({ id: open.id, patch: { new_project_url: e.target.value } })}
                  placeholder="https://lovable.dev/projects/..."
                />
                <Label>Project Subdomain</Label>
                <Input
                  defaultValue={open.new_project_subdomain ?? ''}
                  onBlur={(e) => updateStatus.mutate({ id: open.id, patch: { new_project_subdomain: e.target.value } })}
                />
                <Label>Notes</Label>
                <Textarea
                  defaultValue={open.notes ?? ''}
                  onBlur={(e) => updateStatus.mutate({ id: open.id, patch: { notes: e.target.value } })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setLogsId(open.id)}>
                  <ListTree className="h-4 w-4" /> View Logs
                </Button>
                <Button className="flex-1 gap-2" onClick={() => updateStatus.mutate({
                  id: open.id, patch: { status: 'live', completed_at: new Date().toISOString() },
                })}>
                  <Rocket className="h-4 w-4" /> Mark Live
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Job log drawer */}
      <JobLogDrawer requestId={logsId} onClose={() => setLogsId(null)} />

      {/* Create */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader><SheetTitle>New provisioning request</SheetTitle></SheetHeader>
          <CreateRequestForm
            stores={storesQuery.data ?? []}
            themes={themesQuery.data ?? []}
            onDone={() => {
              setCreateOpen(false);
              qc.invalidateQueries({ queryKey: ['provision-requests'] });
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

const JobLogDrawer = ({ requestId, onClose }: { requestId: string | null; onClose: () => void }) => {
  const logsQuery = useQuery({
    queryKey: ['provision-logs', requestId],
    enabled: !!requestId,
    refetchInterval: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provision_job_logs').select('*')
        .eq('request_id', requestId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobLog[];
    },
  });

  return (
    <Sheet open={!!requestId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>Job Logs</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-2">
          {logsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No logs yet. The runner ticks every minute.</p>
          )}
          {logsQuery.data?.map((l) => (
            <div key={l.id} className="border rounded-md p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    l.status === 'failed' || l.status === 'error' ? 'destructive'
                      : l.status === 'ok' ? 'default' : 'secondary'
                  }>{l.status}</Badge>
                  <span className="font-medium">{l.step}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
              </div>
              {l.message && <p className="mt-1 text-muted-foreground">{l.message}</p>}
              {l.metadata && Object.keys(l.metadata).length > 0 && (
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(l.metadata, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ThemeMasterRow = ({ master, onChange }: { master: ThemeMaster; onChange: () => void }) => {
  const [category, setCategory] = useState(master.category ?? '');

  const setDefault = async (val: boolean) => {
    if (val && master.category) {
      // Clear other defaults in same category
      await supabase.from('theme_master_projects')
        .update({ is_default: false })
        .eq('category', master.category).neq('id', master.id);
    }
    const { error } = await supabase.from('theme_master_projects')
      .update({ is_default: val }).eq('id', master.id);
    if (error) toast.error(error.message); else { toast.success('Updated'); onChange(); }
  };

  const saveCategory = async () => {
    const { error } = await supabase.from('theme_master_projects')
      .update({ category: category || null }).eq('id', master.id);
    if (error) toast.error(error.message); else { toast.success('Category saved'); onChange(); }
  };

  return (
    <div className="rounded-md border p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium flex items-center gap-2">
            {master.name}
            {master.is_default && <Badge variant="default" className="text-[10px]">DEFAULT</Badge>}
            {!master.is_active && <Badge variant="destructive" className="text-[10px]">INACTIVE</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">{master.theme_id}</div>
        </div>
        {master.remix_url && (
          <a href={master.remix_url} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-3 w-3" /> Remix
            </Button>
          </a>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="category (e.g. fashion)" className="h-8 text-xs" />
        <Button size="sm" variant="outline" onClick={saveCategory}>Save</Button>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Default for category</Label>
        <Switch checked={master.is_default} onCheckedChange={setDefault} disabled={!master.category} />
      </div>
    </div>
  );
};

const CreateRequestForm = ({
  stores, themes, onDone,
}: {
  stores: Array<{ id: string; name: string; category?: string | null }>;
  themes: ThemeMaster[];
  onDone: () => void;
}) => {
  const [storeId, setStoreId] = useState('');
  const [themeId, setThemeId] = useState('');
  const [primary, setPrimary] = useState('#9A2A2A');
  const [accent, setAccent] = useState('#C9A227');
  const [tagline, setTagline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Suggest default theme based on store category
  const selectedStore = stores.find((s) => s.id === storeId);
  const suggested = selectedStore?.category
    ? themes.find((t) => t.is_active && t.is_default && t.category === selectedStore.category)
    : null;

  const submit = async () => {
    if (!storeId) { toast.error('Pick a store'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('provision-storefront', {
      body: {
        store_id: storeId,
        theme_master_id: themeId || undefined,
        client_patch_payload: { primary, accent, tagline },
      },
    });
    setSubmitting(false);
    if (error || (data as { error?: unknown })?.error) {
      const err = (data as { error?: unknown; missing?: string[] }) ?? {};
      toast.error(`Validation failed${err.missing ? `: missing ${err.missing.join(', ')}` : ''}`);
      return;
    }
    toast.success('Request queued');
    onDone();
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Store</Label>
        <Select value={storeId} onValueChange={setStoreId}>
          <SelectTrigger><SelectValue placeholder="Pick a store" /></SelectTrigger>
          <SelectContent>
            {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Theme Master {suggested && <span className="text-xs text-muted-foreground">(default: {suggested.name})</span>}</Label>
        <Select value={themeId} onValueChange={setThemeId}>
          <SelectTrigger><SelectValue placeholder="Auto-pick from category default" /></SelectTrigger>
          <SelectContent>
            {themes.filter((t) => t.is_active).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} {t.is_default && '★'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Primary color</Label><Input value={primary} onChange={(e) => setPrimary(e.target.value)} /></div>
        <div><Label>Accent color</Label><Input value={accent} onChange={(e) => setAccent(e.target.value)} /></div>
      </div>
      <div><Label>Tagline</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} /></div>
      <Button className="w-full" onClick={submit} disabled={submitting}>
        {submitting ? 'Validating…' : 'Queue request'}
      </Button>
    </div>
  );
};

const ThemeMasterCreate = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [theme_id, setThemeId] = useState('bazaar');
  const [name, setName] = useState('Bazaar');
  const [category, setCategory] = useState('');
  const [remix_url, setRemix] = useState('');
  const [prompt, setPrompt] = useState(
    `Patch this remixed storefront for client "{store_name}".
- Set src/config.ts: STORE_SLUG="{slug}", STORE_ID="{store_id}"
- Replace logo at src/assets/logo.svg with: {logo_url}
- Update src/themes/{theme_id}/tokens.ts: primary="{primary}", accent="{accent}"
- Update index.html <title> and meta description to "{store_name} — {tagline}"
- Update public/manifest.json name and short_name to "{store_name}"
- Do NOT modify any component logic, layout, or data fetching.
- Confirm and publish. Connect domain "{custom_domain}".`,
  );

  const submit = async () => {
    const { error } = await supabase.from('theme_master_projects').insert({
      theme_id, name, remix_url, client_patch_prompt: prompt, is_active: true,
      category: category || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Theme master added');
    setOpen(false);
    onCreated();
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1">
        <Plus className="h-3 w-3" /> Add Theme Master
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader><SheetTitle>Add Theme Master</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4">
            <div><Label>Theme ID</Label><Input value={theme_id} onChange={(e) => setThemeId(e.target.value)} /></div>
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="fashion, electronics, food…" /></div>
            <div><Label>Remix URL</Label><Input value={remix_url} onChange={(e) => setRemix(e.target.value)} placeholder="https://lovable.dev/projects/.../remix" /></div>
            <div><Label>Client Patch Prompt</Label><Textarea rows={10} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="font-mono text-xs" /></div>
            <Button className="w-full" onClick={submit}>Save</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminProvisioning;
