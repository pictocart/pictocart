import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { useInventoryMovements } from '@/hooks/useAccounts';
import { format } from 'date-fns';
import { toast } from 'sonner';

const InventoryLedger = () => {
  const { store } = useStore();
  const qc = useQueryClient();
  const { data: movements = [] } = useInventoryMovements();

  const { data: products = [] } = useQuery({
    queryKey: ['inv-products', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const { data } = await supabase.from('products')
        .select('id, title, sku, inventory_count, reorder_level')
        .eq('store_id', store!.id).order('title').limit(500);
      return data ?? [];
    },
  });

  const updateReorder = useMutation({
    mutationFn: async ({ id, level }: { id: string; level: number }) => {
      const { error } = await supabase.from('products').update({ reorder_level: level }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inv-products'] }); toast.success('Reorder level updated'); },
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Inventory Ledger</h1>
        <p className="text-sm text-muted-foreground">Set reorder levels and watch stock movements.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Stock at hand</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">SKU</th>
                  <th className="text-right p-3">In stock</th>
                  <th className="text-right p-3">Reorder at</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => {
                  const low = (p.reorder_level ?? 0) > 0 && (p.inventory_count ?? 0) <= p.reorder_level;
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">{p.title}</td>
                      <td className="p-3">{p.sku || '—'}</td>
                      <td className="p-3 text-right font-medium">{p.inventory_count ?? 0}</td>
                      <td className="p-3 text-right">
                        <Input type="number" min={0} className="w-20 ml-auto" defaultValue={p.reorder_level ?? 0}
                          onBlur={(e) => {
                            const v = Number(e.target.value || 0);
                            if (v !== (p.reorder_level ?? 0)) updateReorder.mutate({ id: p.id, level: v });
                          }} />
                      </td>
                      <td className="p-3">{low ? <Badge variant="destructive">Low stock</Badge> : <Badge variant="secondary">OK</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent movements</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-left p-3">Ref</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m: any) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">{format(new Date(m.created_at), 'dd MMM HH:mm')}</td>
                    <td className="p-3">{m.products?.title || '—'}</td>
                    <td className="p-3 capitalize">{m.movement_type}</td>
                    <td className={`p-3 text-right ${m.qty < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {m.qty > 0 ? '+' : ''}{m.qty}
                    </td>
                    <td className="p-3 text-muted-foreground">{m.notes || '—'}</td>
                  </tr>
                ))}
                {!movements.length && (
                  <tr><td className="p-6 text-center text-muted-foreground" colSpan={5}>No movements yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryLedger;
