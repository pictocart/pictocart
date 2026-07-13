import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Search, ExternalLink, Eye, EyeOff, Receipt, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useAdminFssaiHistory } from '@/hooks/useFssaiHistory';
import { format } from 'date-fns';

// Per-store FSSAI history expandable panel
const FssaiHistoryPanel = ({ storeId }: { storeId: string }) => {
  const { data: history = [], isLoading } = useAdminFssaiHistory(storeId);

  if (isLoading) return <p className="text-xs text-muted-foreground px-1">Loading FSSAI history…</p>;
  if (!history.length) return <p className="text-xs text-muted-foreground px-1">No FSSAI records for this store.</p>;

  return (
    <div className="space-y-1 mt-2">
      {history.map((entry) => (
        <div
          key={entry.id}
          className={`flex items-center justify-between rounded-md px-3 py-1.5 text-xs ${
            entry.deleted_by_user ? 'bg-red-50 text-muted-foreground' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {entry.deleted_by_user
              ? <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
            <span className="font-mono font-semibold">{entry.fssai_number}</span>
            {!entry.deleted_by_user && (
              <Badge className="text-[10px] h-4 bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
            )}
          </div>
          <div className="text-right shrink-0 ml-4 space-y-0.5 opacity-70">
            <p>Added: {format(new Date(entry.added_at), 'dd MMM yyyy')}</p>
            {entry.deleted_by_user && entry.deleted_at && (
              <p className="text-red-500">Removed: {format(new Date(entry.deleted_at), 'dd MMM yyyy')}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminStores = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedFssai, setExpandedFssai] = useState<string | null>(null);

  const { data: stores, isLoading } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from('stores')
        .update({ is_published: published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success('Store updated');
    },
  });

  const filtered = (stores || []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Store Management</h1>
        <p className="text-sm text-muted-foreground">Manage all seller stores on the platform</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search stores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((store) => (
            <Card key={store.id}>
              <CardContent className="flex items-center gap-4 py-4">
                {store.logo_url ? (
                  <img src={store.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                    {store.name[0]}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{store.name}</h3>
                    <Badge variant={store.is_published ? 'default' : 'secondary'} className="text-xs">
                      {store.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">/{store.slug} · {store.category || 'No category'}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {store.is_published ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    <Switch
                      checked={store.is_published ?? false}
                      onCheckedChange={(checked) => togglePublish.mutate({ id: store.id, published: checked })}
                    />
                  </div>
                  {store.is_published && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Open live store"
                      onClick={() => {
                        const url = (store as any).custom_domain
                          ? `https://${(store as any).custom_domain}`
                          : `https://${store.slug}.pictocart.in`;
                        window.open(url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {/* FSSAI history toggle — only for food-like stores */}
                  {['food', 'grocery', 'bakery', 'restaurant', 'cafe', 'beverage', 'organic', 'dairy', 'snacks'].some(
                    (k) => (store.category || '').toLowerCase().includes(k)
                  ) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                      onClick={() => setExpandedFssai(expandedFssai === store.id ? null : store.id)}
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      FSSAI
                      {expandedFssai === store.id
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </CardContent>

              {/* FSSAI history panel */}
              {expandedFssai === store.id && (
                <CardContent className="pt-0 pb-4 border-t border-amber-100 bg-amber-50/30">
                  <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" /> FSSAI License History
                  </p>
                  <FssaiHistoryPanel storeId={store.id} />
                </CardContent>
              )}
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-12 text-sm text-muted-foreground">No stores found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminStores;
