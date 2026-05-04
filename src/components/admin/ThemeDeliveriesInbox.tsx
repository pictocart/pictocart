import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Inbox, Check, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const ThemeDeliveriesInbox = () => {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['master-theme-deliveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_theme_deliveries')
        .select('*')
        .order('delivered_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, theme_pack_id, status }: { id: string; theme_pack_id: string | null; status: 'published' | 'rejected' }) => {
      const { error } = await supabase.from('master_theme_deliveries').update({ status }).eq('id', id);
      if (error) throw error;
      if (theme_pack_id && status === 'published') {
        await supabase.from('theme_packs').update({ is_published: true }).eq('id', theme_pack_id);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['master-theme-deliveries'] });
      qc.invalidateQueries({ queryKey: ['theme-packs'] });
      toast.success(v.status === 'published' ? 'Theme published to marketplace' : 'Delivery rejected');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-4 w-4" /> Agent Deliveries
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Themes shipped from the Master Bazaar agent. Approve to publish to merchants.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">No deliveries yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Theme</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Reuse %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {r.preview_image && (
                      <img src={r.preview_image} alt="" className="h-8 w-12 object-cover rounded" />
                    )}
                    {r.name}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">{r.category || '—'}</TableCell>
                  <TableCell className="text-right">₹{Number(r.generation_cost_inr).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(r.reuse_ratio).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Badge
                      variant={r.status === 'published' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'pending' && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.id, theme_pack_id: r.theme_pack_id, status: 'published' })}>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.id, theme_pack_id: r.theme_pack_id, status: 'rejected' })}>
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ThemeDeliveriesInbox;
