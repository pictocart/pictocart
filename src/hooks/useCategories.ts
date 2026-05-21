import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from './useStore';
import { toast } from 'sonner';

export interface Category {
  id: string;
  store_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  image_url: string | null;
  created_at: string;
}

export const useCategories = () => {
  const { store } = useStore();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['categories', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', store.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!store?.id,
  });

  const createCategory = useMutation({
    mutationFn: async (cat: { name: string; parent_id?: string | null }) => {
      if (!store?.id) throw new Error('No store found');
      const { data, error } = await supabase
        .from('categories')
        .insert({ store_id: store.id, name: cat.name, parent_id: cat.parent_id || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', store?.id] });
      toast.success('Category created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name, image_url }: { id: string; name?: string; image_url?: string | null }) => {
      const patch: any = {};
      if (name !== undefined) patch.name = name;
      if (image_url !== undefined) patch.image_url = image_url;
      const { error } = await supabase.from('categories').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', store?.id] });
      toast.success('Category updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', store?.id] });
      toast.success('Category deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const categories = categoriesQuery.data ?? [];
  const parentCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  return {
    categories,
    parentCategories,
    getSubcategories,
    loading: categoriesQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
