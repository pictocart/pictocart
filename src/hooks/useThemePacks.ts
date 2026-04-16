import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from './useStore';
import { toast } from 'sonner';

export interface ThemePack {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string | null;
  pages: any;
  theme_config: any;
  price: number;
  compare_at_price: number | null;
  ai_generation_cost: number;
  sales_count: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ThemePurchase {
  id: string;
  store_id: string;
  theme_pack_id: string;
  purchased_at: string;
}

export const useThemePacks = (publishedOnly = true) => {
  return useQuery({
    queryKey: ['theme-packs', publishedOnly],
    queryFn: async () => {
      let query = supabase.from('theme_packs' as any).select('*').order('created_at', { ascending: false });
      if (publishedOnly) query = query.eq('is_published', true);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ThemePack[];
    },
  });
};

export const useThemePurchases = () => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['theme-purchases', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('theme_purchases' as any).select('*').eq('store_id', store!.id);
      if (error) throw error;
      return (data || []) as unknown as ThemePurchase[];
    },
  });
};

export const usePurchaseTheme = () => {
  const qc = useQueryClient();
  const { store } = useStore();

  return useMutation({
    mutationFn: async (themePackId: string) => {
      if (!store) throw new Error('No store');
      // Insert purchase
      const { error: purchaseErr } = await supabase.from('theme_purchases' as any).insert({
        store_id: store.id,
        theme_pack_id: themePackId,
      });
      if (purchaseErr) throw purchaseErr;

      // Increment sales count via service (we'll handle it client-side for now since we can't update theme_packs from client)
      return themePackId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['theme-purchases'] });
      qc.invalidateQueries({ queryKey: ['theme-packs'] });
      toast.success('Theme purchased!');
    },
    onError: (e: any) => toast.error(e.message || 'Purchase failed'),
  });
};

export const useGenerateThemePack = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ category, styleHints }: { category: string; styleHints?: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-theme-pack', {
        body: { category, styleHints },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['theme-packs'] });
      const savings = data?.optimization || '';
      toast.success(`Theme pack generated! ${savings}`);
    },
    onError: (e: any) => toast.error(e.message || 'Generation failed'),
  });
};

export const useRemixTheme = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (themePackId: string) => {
      const { data, error } = await supabase.functions.invoke('remix-theme', {
        body: { themePackId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['theme-packs'] });
      toast.success(`Remixed from "${data?.remixed_from}" — Cost: ₹${data?.cost || '0.00'}`);
    },
    onError: (e: any) => toast.error(e.message || 'Remix failed'),
  });
};

export const useUpdateThemePack = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ThemePack> & { id: string }) => {
      const { error } = await supabase.from('theme_packs' as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['theme-packs'] });
      toast.success('Theme updated');
    },
    onError: (e: any) => toast.error(e.message || 'Update failed'),
  });
};

export const useDeleteThemePack = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('theme_packs' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['theme-packs'] });
      toast.success('Theme deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Delete failed'),
  });
};

// Admin: get all purchases for cost matrix
export const useAllThemePurchases = () => {
  return useQuery({
    queryKey: ['all-theme-purchases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('theme_purchases' as any).select('*');
      if (error) throw error;
      return (data || []) as unknown as ThemePurchase[];
    },
  });
};
