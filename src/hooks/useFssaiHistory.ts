import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from './useStore';
import { toast } from 'sonner';

export interface FssaiEntry {
  id: string;
  store_id: string;
  fssai_number: string;
  added_at: string;
  deleted_at: string | null;
  deleted_by_user: boolean;
}

// ─── Seller-side: only own store's entries ───────────────────────────────────

export const useFssaiHistory = () => {
  const { store } = useStore();
  const qc = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['fssai-history', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fssai_history' as any)
        .select('*')
        .eq('store_id', store!.id)
        .order('added_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FssaiEntry[];
    },
  });

  // Active = not deleted by user
  const activeFssai = history.find((e) => !e.deleted_by_user && !e.deleted_at) ?? null;

  // Add a new FSSAI number — creates a new history row and updates store settings
  const addFssai = useMutation({
    mutationFn: async (fssai_number: string) => {
      if (!store?.id) throw new Error('No store');
      if (fssai_number.length !== 14) throw new Error('FSSAI must be exactly 14 digits');

      // Insert into history
      const { error: insertErr } = await supabase
        .from('fssai_history' as any)
        .insert({ store_id: store.id, fssai_number });
      if (insertErr) throw insertErr;

      // Update store settings active fssai
      const updatedSettings = { ...((store.settings as any) || {}), fssai: fssai_number };
      const { error: storeErr } = await supabase
        .from('stores')
        .update({ settings: updatedSettings })
        .eq('id', store.id);
      if (storeErr) throw storeErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fssai-history', store?.id] });
      qc.invalidateQueries({ queryKey: ['store'] });
      toast.success('FSSAI number saved');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save FSSAI'),
  });

  // Delete (soft) — marks entry deleted_by_user, clears store settings
  const deleteFssai = useMutation({
    mutationFn: async (id: string) => {
      if (!store?.id) throw new Error('No store');

      const { error: delErr } = await supabase
        .from('fssai_history' as any)
        .update({ deleted_by_user: true, deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (delErr) throw delErr;

      // Clear active fssai from store settings
      const updatedSettings = { ...((store.settings as any) || {}), fssai: null };
      const { error: storeErr } = await supabase
        .from('stores')
        .update({ settings: updatedSettings })
        .eq('id', store.id);
      if (storeErr) throw storeErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fssai-history', store?.id] });
      qc.invalidateQueries({ queryKey: ['store'] });
      toast.success('FSSAI number removed');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to remove FSSAI'),
  });

  return { history, activeFssai, isLoading, addFssai, deleteFssai };
};

// ─── Admin-side: fetch all stores' FSSAI history ─────────────────────────────

export const useAdminFssaiHistory = (storeId?: string) => {
  return useQuery({
    queryKey: ['admin-fssai-history', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fssai_history' as any)
        .select('*')
        .eq('store_id', storeId!)
        .order('added_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FssaiEntry[];
    },
  });
};
