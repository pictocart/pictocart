/**
 * AdminDomains — Admin can:
 *   1. See all stores with custom domains + their status
 *   2. Manually set/update/remove a custom domain for any store
 *   3. Trigger domain add/remove on Vercel via connect-custom-domain function
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Globe, Loader2, CheckCircle2, XCircle, RefreshCw,
  Search, Plus, Trash2, ExternalLink, ShieldCheck, Info,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  domain_status: string | null;
  is_published: boolean;
  domain_added_to_vercel_at: string | null;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function DomainStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Live</Badge>;
    case 'pending_dns':
      return <Badge variant="outline" className="border-yellow-300 text-yellow-700">DNS Pending</Badge>;
    case 'verifying':
      return <Badge variant="outline" className="border-blue-300 text-blue-700">Verifying</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    default:
      return <Badge variant="secondary">No Domain</Badge>;
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminDomains = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogStore, setDialogStore] = useState<StoreRow | null>(null);
  const [dialogDomain, setDialogDomain] = useState('');
  const [dialogAction, setDialogAction] = useState<'connect' | 'remove'>('connect');
  const [checking, setChecking] = useState<string | null>(null); // store_id being checked

  // ── Load all stores (with domain columns) ────────────────────────────────
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['admin-domains-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, custom_domain, domain_status, is_published, domain_added_to_vercel_at')
        .order('name');
      if (error) throw error;
      return (data ?? []) as StoreRow[];
    },
    refetchInterval: 30_000,
  });

  const filtered = stores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase()) ||
    (s.custom_domain ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const withDomain = stores.filter((s) => s.custom_domain);
  const activeDomains = stores.filter((s) => s.domain_status === 'active');
  const pendingDomains = stores.filter((s) => s.domain_status === 'pending_dns' || s.domain_status === 'verifying');

  // ── Connect/Disconnect mutation (calls edge function as admin) ────────────
  const domainMutation = useMutation({
    mutationFn: async ({ store_id, domain, action }: { store_id: string; domain?: string; action: 'connect' | 'disconnect' }) => {
      const { data, error } = await supabase.functions.invoke('connect-custom-domain', {
        body: { store_id, domain, action },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-domains-stores'] });
      if (vars.action === 'connect') toast.success(`Domain connected for store`);
      else toast.success('Domain removed');
      setDialogStore(null);
      setDialogDomain('');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed'),
  });

  // ── Check DNS status for a specific store ────────────────────────────────
  const handleCheckStatus = async (store: StoreRow) => {
    setChecking(store.id);
    try {
      const { data, error } = await supabase.functions.invoke('check-domain-status', {
        body: { store_id: store.id },
      });
      if (error) throw new Error(error.message);
      const result = data as any;
      if (result.verified) {
        toast.success(`✅ ${store.custom_domain} is live!`);
      } else {
        toast.info(`DNS not ready: ${result.diagnosis}`);
      }
      qc.invalidateQueries({ queryKey: ['admin-domains-stores'] });
    } catch (err: any) {
      toast.error(err.message ?? 'Check failed');
    }
    setChecking(null);
  };

  // ── Open connect dialog ────────────────────────────────────────────────────
  const openConnect = (store: StoreRow) => {
    setDialogStore(store);
    setDialogDomain(store.custom_domain ?? '');
    setDialogAction('connect');
  };

  const openRemove = (store: StoreRow) => {
    setDialogStore(store);
    setDialogAction('remove');
  };

  const handleDialogConfirm = () => {
    if (!dialogStore) return;
    if (dialogAction === 'connect') {
      if (!dialogDomain.trim()) return;
      domainMutation.mutate({ store_id: dialogStore.id, domain: dialogDomain.trim(), action: 'connect' });
    } else {
      domainMutation.mutate({ store_id: dialogStore.id, action: 'disconnect' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6" /> Custom Domains
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage merchant custom domains — connect, verify, or remove on behalf of any store.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{withDomain.length}</p>
            <p className="text-sm text-muted-foreground">Total Connected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{activeDomains.length}</p>
            <p className="text-sm text-muted-foreground">Live</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-yellow-600">{pendingDomains.length}</p>
            <p className="text-sm text-muted-foreground">DNS Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by store name, slug or domain..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Store</th>
                    <th className="text-left px-4 py-3 font-medium">Custom Domain</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((store) => (
                    <tr key={store.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{store.name}</span>
                          {store.is_published ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px] py-0 px-1.5 h-4 hover:bg-green-50" variant="outline">Published</Badge>
                          ) : (
                            <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] py-0 px-1.5 h-4 hover:bg-yellow-50" variant="outline">Unpublished</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{store.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        {store.custom_domain ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono font-semibold">{store.custom_domain}</code>
                              <a
                                href={`https://${store.custom_domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>

                            {/* DNS Instructions details */}
                            {store.domain_status !== 'active' && (
                              <div className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded space-y-1 max-w-xs border border-yellow-200/50">
                                <p className="font-semibold text-foreground flex items-center gap-1">
                                  <Info className="h-3 w-3 text-yellow-600" /> DNS Instructions:
                                </p>
                                {(() => {
                                  const clean = store.custom_domain.replace(/^(https?:\/\/)?(www\.)?/i, "").replace(/\/.*$/, "").trim().toLowerCase();
                                  const parts = clean.split(".");
                                  const isSub = parts.length > 2 && parts[0] !== 'www';

                                  if (isSub) {
                                    return (
                                      <div className="font-mono text-[9px] space-y-0.5">
                                        <p><span className="font-sans text-muted-foreground">Type:</span> CNAME</p>
                                        <p><span className="font-sans text-muted-foreground">Name:</span> {parts[0]}</p>
                                        <p><span className="font-sans text-muted-foreground">Points to:</span> cname.vercel-dns.com</p>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="font-mono text-[9px] space-y-0.5">
                                        <p><span className="font-sans text-muted-foreground">Type:</span> A</p>
                                        <p><span className="font-sans text-muted-foreground">Name:</span> @</p>
                                        <p><span className="font-sans text-muted-foreground">Points to:</span> 76.76.21.21</p>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <DomainStatusBadge status={store.domain_status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          {/* Publish & Activate shortcut */}
                          {!store.is_published && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-orange-700 border-orange-200 hover:bg-orange-50 font-semibold"
                              onClick={async () => {
                                const { error } = await supabase
                                  .from('stores')
                                  .update({ is_published: true, domain_status: 'active' })
                                  .eq('id', store.id);
                                if (error) {
                                  toast.error(error.message);
                                } else {
                                  qc.invalidateQueries({ queryKey: ['admin-domains-stores'] });
                                  toast.success('Store published & domain activated!');
                                }
                              }}
                            >
                              <Globe className="h-3 w-3 mr-1" />
                              Publish & Activate
                            </Button>
                          )}

                          {/* Connect / Edit */}
                          <Button
                            size="sm"
                            variant={store.custom_domain ? 'outline' : 'default'}
                            onClick={() => openConnect(store)}
                            className="h-7 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {store.custom_domain ? 'Change' : 'Add Domain'}
                          </Button>

                          {/* Check DNS */}
                          {store.custom_domain && store.domain_status !== 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleCheckStatus(store)}
                              disabled={checking === store.id}
                            >
                              {checking === store.id
                                ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                : <RefreshCw className="h-3 w-3 mr-1" />}
                              Check DNS
                            </Button>
                          )}

                          {/* Force verify (mark active manually) */}
                          {store.custom_domain && store.domain_status !== 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                              onClick={async () => {
                                await supabase.from('stores').update({ domain_status: 'active' }).eq('id', store.id);
                                qc.invalidateQueries({ queryKey: ['admin-domains-stores'] });
                                toast.success('Marked as active');
                              }}
                            >
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Force Live
                            </Button>
                          )}

                          {/* Remove */}
                          {store.custom_domain && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => openRemove(store)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No stores found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connect / Remove Dialog */}
      <Dialog open={!!dialogStore} onOpenChange={(o) => { if (!o) { setDialogStore(null); setDialogDomain(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'connect'
                ? `${dialogStore?.custom_domain ? 'Update' : 'Add'} Domain — ${dialogStore?.name}`
                : `Remove Domain — ${dialogStore?.name}`}
            </DialogTitle>
          </DialogHeader>

          {dialogAction === 'connect' ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input
                  placeholder="yourbrand.com"
                  value={dialogDomain}
                  onChange={(e) => setDialogDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDialogConfirm()}
                />
                <p className="text-xs text-muted-foreground">
                  This will add the domain to Vercel and save it in the store record. Merchant still needs to point their DNS.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                This will remove <strong>{dialogStore?.custom_domain}</strong> from Vercel and clear it from the store.
                The store will still be accessible at <code className="text-xs bg-muted px-1 rounded">pictocart.in/store/{dialogStore?.slug}</code>.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogStore(null); setDialogDomain(''); }}>
              Cancel
            </Button>
            <Button
              variant={dialogAction === 'remove' ? 'destructive' : 'default'}
              onClick={handleDialogConfirm}
              disabled={domainMutation.isPending || (dialogAction === 'connect' && !dialogDomain.trim())}
            >
              {domainMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : null}
              {dialogAction === 'connect' ? 'Connect Domain' : 'Remove Domain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDomains;
